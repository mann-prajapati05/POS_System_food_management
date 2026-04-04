import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

const ALLOWED_ROLES = new Set(['admin', 'staff', 'kitchen']);
const ADMIN_SECRET_CODE = process.env.ADMIN_SECRET_CODE || 'ADMIN-POS-2026';
let usersHasPosIdColumnCache = null;

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generatePosUniqueId() {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `POS-${random}`;
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
}

function createToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      posId: user.pos_id || null,
    },
    getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
}

async function usersHasPosIdColumn() {
  if (usersHasPosIdColumnCache !== null) {
    return usersHasPosIdColumnCache;
  }

  const result = await query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'users'
       AND column_name = 'pos_id'
     LIMIT 1`
  );

  usersHasPosIdColumnCache = Boolean(result.rows[0]);
  return usersHasPosIdColumnCache;
}

async function ensurePosTable() {
  await query(
    `CREATE TABLE IF NOT EXISTS pos (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      code VARCHAR(50) UNIQUE,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  );

  await query('ALTER TABLE pos ADD COLUMN IF NOT EXISTS code VARCHAR(50);');
  await query('ALTER TABLE pos ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;');
}

async function createAdminPosOrThrow(posNameRaw) {
  const posName = String(posNameRaw || '').trim();
  if (!posName) {
    return { error: 'newPosName is required for admin signup' };
  }

  await ensurePosTable();

  const existingByName = await query(
    'SELECT id FROM pos WHERE LOWER(name) = LOWER($1) LIMIT 1',
    [posName]
  );

  if (existingByName.rows[0]) {
    return { error: 'POS name already exists' };
  }

  let uniqueId = null;
  for (let i = 0; i < 8; i += 1) {
    const candidate = generatePosUniqueId();
    const exists = await query('SELECT 1 FROM pos WHERE code = $1 LIMIT 1', [candidate]);
    if (!exists.rows[0]) {
      uniqueId = candidate;
      break;
    }
  }

  if (!uniqueId) {
    return { error: 'Failed to generate unique POS identifier' };
  }

  const created = await query(
    `INSERT INTO pos (name, code, is_active)
     VALUES ($1, $2, true)
     RETURNING id, name, code`,
    [posName, uniqueId]
  );

  return { pos: created.rows[0] };
}

async function resolvePosByCredentials(posNameRaw, posUniqueIdRaw) {
  const posName = String(posNameRaw || '').trim();
  const posUniqueId = String(posUniqueIdRaw || '').trim();

  if (!posName || !posUniqueId) {
    return null;
  }

  await ensurePosTable();

  const result = await query(
    `SELECT id, name, code
     FROM pos
     WHERE LOWER(name) = LOWER($1)
       AND code = $2
       AND is_active = true
     LIMIT 1`,
    [posName, posUniqueId]
  );

  return result.rows[0] || null;
}

async function getDefaultPosId() {
  await ensurePosTable();

  await query(
    `INSERT INTO pos (name, code)
     SELECT 'Main POS', 'MAIN'
     WHERE NOT EXISTS (
       SELECT 1 FROM pos WHERE code = 'MAIN'
     )`
  );

  const result = await query('SELECT id FROM pos ORDER BY created_at ASC LIMIT 1');
  return result.rows[0]?.id || null;
}

async function resolvePosIdForSignup(payload) {
  if (!(await usersHasPosIdColumn())) {
    return null;
  }

  const { role, newPosName, posName, posUniqueId } = payload;

  if (role === 'admin') {
    const created = await createAdminPosOrThrow(newPosName);
    if (created.error) {
      return { error: created.error };
    }
    return { posId: created.pos.id, createdPos: created.pos };
  }

  const resolved = await resolvePosByCredentials(posName, posUniqueId);
  if (!resolved) {
    return { error: 'Invalid POS credentials. Enter POS name and POS unique ID.' };
  }

  return { posId: resolved.id, createdPos: null };
}

function setUserTokenCookie(res, token) {
  res.cookie('userToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  });
}

export async function signup(req, res) {
  try {
    const {
      name,
      email,
      password,
      role,
      newPosName,
      posName,
      posUniqueId,
      adminSecretCode,
    } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'name, email, password and role are required' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (String(password).length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    if (!ALLOWED_ROLES.has(role)) {
      return res.status(400).json({ error: 'Invalid role. Allowed: admin, staff, kitchen' });
    }

    const isAdminEndpoint = String(req.originalUrl || '').includes('/admin/');
    if (role === 'admin' && !isAdminEndpoint) {
      return res.status(403).json({ error: 'Use /auth/admin/signup for admin registration' });
    }

    if (role === 'admin') {
      if (!adminSecretCode || adminSecretCode !== ADMIN_SECRET_CODE) {
        return res.status(403).json({ error: 'Invalid admin secret code' });
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const hasPosColumn = await usersHasPosIdColumn();
    const resolvedPosId = await resolvePosIdForSignup({
      role,
      newPosName,
      posName,
      posUniqueId,
    });

    if (resolvedPosId?.error) {
      return res.status(400).json({ error: resolvedPosId.error });
    }

    if (hasPosColumn && !resolvedPosId?.posId) {
      return res.status(400).json({ error: 'Unable to resolve POS for signup' });
    }

    const insertQuery = hasPosColumn
      ? `INSERT INTO users (name, email, password, role, pos_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name, email, role, pos_id, created_at`
      : `INSERT INTO users (name, email, password, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, email, role, created_at`;

    const insertValues = hasPosColumn
      ? [name.trim(), String(email).toLowerCase().trim(), passwordHash, role, resolvedPosId.posId]
      : [name.trim(), String(email).toLowerCase().trim(), passwordHash, role];

    const result = await query(
      insertQuery,
      insertValues
    );

    const token = createToken(result.rows[0]);
    setUserTokenCookie(res, token);

    return res.status(201).json({
      message: 'User registered successfully',
      token,
      user: result.rows[0],
      ...(resolvedPosId?.createdPos && {
        createdPos: {
          id: resolvedPosId.createdPos.id,
          name: resolvedPosId.createdPos.name,
          uniqueId: resolvedPosId.createdPos.code,
        },
      }),
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }

    console.error('Signup failed:', err.message);
    return res.status(500).json({ error: 'Failed to register user' });
  }
}

export async function login(req, res) {
  try {
    const { email, password, posName, posUniqueId, adminSecretCode } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const hasPosColumn = await usersHasPosIdColumn();
    const selectQuery = hasPosColumn
      ? `SELECT u.id, u.name, u.email, u.password, u.role, u.is_active, u.pos_id,
             p.name AS pos_name, p.code AS pos_code
        FROM users u
        LEFT JOIN pos p ON p.id = u.pos_id
        WHERE u.email = $1`
      : `SELECT id, name, email, password, role, is_active
         FROM users
         WHERE email = $1`;

    const result = await query(
      selectQuery,
      [String(email).toLowerCase().trim()]
    );

    const user = result.rows[0];
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const passwordOk = await bcrypt.compare(password, user.password);
    if (!passwordOk) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isAdminEndpoint = String(req.originalUrl || '').includes('/admin/');
    if (user.role === 'admin' && !isAdminEndpoint) {
      return res.status(403).json({ error: 'Use /auth/admin/login for admin access' });
    }
    if (user.role !== 'admin' && isAdminEndpoint) {
      return res.status(403).json({ error: 'Admin login endpoint is only for admin users' });
    }

    if (user.role === 'admin') {
      if (!adminSecretCode || adminSecretCode !== ADMIN_SECRET_CODE) {
        return res.status(403).json({ error: 'Invalid admin secret code' });
      }
    }

    if (user.role !== 'admin') {
      if (!posName || !posUniqueId) {
        return res.status(400).json({ error: 'posName and posUniqueId are required for staff/kitchen login' });
      }

      const normalizedPosName = String(posName).trim().toLowerCase();
      const normalizedPosUniqueId = String(posUniqueId).trim();
      const userPosName = String(user.pos_name || '').trim().toLowerCase();
      const userPosUniqueId = String(user.pos_code || '').trim();

      if (!userPosName || !userPosUniqueId || normalizedPosName !== userPosName || normalizedPosUniqueId !== userPosUniqueId) {
        return res.status(401).json({ error: 'Invalid POS name or POS unique ID' });
      }
    }

    const token = createToken(user);
    setUserTokenCookie(res, token);

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        posId: user.pos_id || null,
      },
    });
  } catch (err) {
    console.error('Login failed:', err.message);
    return res.status(500).json({ error: 'Failed to login' });
  }
}

export async function me(req, res) {
  return res.status(200).json({ user: req.user });
}

export async function adminSignup(req, res) {
  req.body = { ...req.body, role: 'admin' };
  return signup(req, res);
}

export async function adminLogin(req, res) {
  return login(req, res);
}