const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({ error: 'Token format invalid' });
    }

    const token = parts[1];
    const secret = process.env.JWT_SECRET || 'your-secret-key';

    jwt.verify(token, secret, (err, decoded) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({ error: 'Token expired' });
        }
        return res.status(401).json({ error: 'Token invalid' });
      }

      // Attach user info to request for downstream services
      req.user = decoded;
      req.headers['x-user-id'] = decoded.userId;
      req.headers['x-user-email'] = decoded.email;
      req.headers['x-user-role'] = decoded.role;

      next();
    });
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
};

module.exports = authMiddleware;
