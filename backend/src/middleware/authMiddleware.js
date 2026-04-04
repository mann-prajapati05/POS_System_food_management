import jwt from 'jsonwebtoken';

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