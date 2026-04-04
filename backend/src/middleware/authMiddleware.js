import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
}

export function authenticateToken(req, res, next) {
  try {
    const token = req.cookies?.userToken;
    if (!token) {
      return res.status(401).json({ error: 'Authentication cookie is required' });
    }

    const decoded = jwt.verify(token, getJwtSecret());

    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      posId: decoded.posId || null,
    };

    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
  };
}

export const requireAuth = authenticateToken;

export function attachPOSContext(req, res, next) {
  if (!req.user?.posId) {
    return res.status(403).json({ error: 'POS context missing in token' });
  }

  req.pos = { id: req.user.posId };
  return next();
}

export function authorizeRole(...roles) {
  return authorizeRoles(...roles);
}

async function getAccessiblePosIds(userId) {
  const result = await query(
    `SELECT upa.pos_id
     FROM user_pos_access upa
     WHERE upa.user_id = $1`,
    [userId]
  );
  return new Set(result.rows.map((row) => row.pos_id));
}

export async function enforcePOSIsolation(req, res, next) {
  try {
    const requestedPosId = req.params?.posId || req.query?.posId || req.body?.posId || req.user?.posId;
    if (!requestedPosId) {
      return res.status(400).json({ error: 'posId is required' });
    }

    if (req.user.role === 'admin') {
      const allowedPosIds = await getAccessiblePosIds(req.user.id);
      if (!allowedPosIds.has(requestedPosId)) {
        return res.status(403).json({ error: 'Forbidden for requested POS' });
      }
      req.pos = { id: requestedPosId };
      return next();
    }

    if (requestedPosId !== req.user.posId) {
      return res.status(403).json({ error: 'Cross-POS access is forbidden' });
    }

    req.pos = { id: req.user.posId };
    return next();
  } catch (err) {
    return res.status(500).json({ error: 'Failed to validate POS access' });
  }
}

export async function enforceActiveSession(req, res, next) {
  try {
    const posId = req.pos?.id || req.user?.posId;
    if (!posId) {
      return res.status(403).json({ error: 'POS context missing' });
    }

    const activeSessionRes = await query(
      `SELECT id, status
       FROM pos_sessions
       WHERE pos_id = $1 AND status = 'active'
       ORDER BY opened_at DESC
       LIMIT 1`,
      [posId]
    );

    if (!activeSessionRes.rows[0]) {
      return res.status(409).json({ error: 'No active session found for this POS' });
    }

    req.activeSession = activeSessionRes.rows[0];
    return next();
  } catch (err) {
    return res.status(500).json({ error: 'Failed to validate active session' });
  }
}