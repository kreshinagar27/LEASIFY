const jwt = require('jsonwebtoken');
const Owner = require('../models/Owner');
const Tenant = require('../models/Tenant');
const { getJwtSecret } = require('../config/jwt');

// Protect routes - Verify JWT Access Token
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route. No token provided.'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, getJwtSecret());

    let user = null;
    let role = decoded.role;

    if (role === 'owner') {
      user = await Owner.findById(decoded.id);
    } else if (role === 'tenant') {
      user = await Tenant.findById(decoded.id);
    } else {
      // Fallback search across both collections strictly by ID
      user = await Owner.findById(decoded.id) || await Tenant.findById(decoded.id);
      if (user) {
        role = user.role;
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        code: 'STALE_TOKEN',
        message: 'The user belonging to this token no longer exists.'
      });
    }

    req.user = user;
    req.userRole = role || user.role;

    next();
  } catch (error) {
    console.error('JWT Verification Error:', error.message);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        code: 'TOKEN_EXPIRED',
        message: 'Access token expired.'
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route. Invalid token.'
    });
  }
};

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.userRole)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.userRole}' is not authorized to access this route`
      });
    }
    next();
  };
};

module.exports = {
  protect,
  authorize
};

