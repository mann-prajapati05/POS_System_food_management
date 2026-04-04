import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

const ALLOWED_ROLES = new Set(['admin', 'staff', 'kitchen']);

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
      posId: user.pos_id,
    },
    getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
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
    const { name, email, password, role } = req.body;

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

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await query(
      `INSERT INTO users (name, email, password, role, pos_id)
       VALUES ($1, $2, $3, $4, (SELECT id FROM pos ORDER BY created_at ASC LIMIT 1))
       RETURNING id, name, email, role, pos_id, created_at`,
      [name.trim(), String(email).toLowerCase().trim(), passwordHash, role]
    );

    await query(
      `INSERT INTO user_pos_access (user_id, pos_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, pos_id) DO NOTHING`,
      [result.rows[0].id, result.rows[0].pos_id]
    );

    const token = createToken(result.rows[0]);
    setUserTokenCookie(res, token);

    return res.status(201).json({
      message: 'User registered successfully',
      token,
      user: result.rows[0],
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
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const result = await query(
      `SELECT id, name, email, password, role, pos_id, is_active
       FROM users
       WHERE email = $1`,
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

    const token = createToken(user);
    setUserTokenCookie(res, token);

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        posId: user.pos_id,
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