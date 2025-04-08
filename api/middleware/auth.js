const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Optional: if you want to attach the full user object
require('dotenv').config(); // Make sure JWT_SECRET is loaded

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { id: decoded.id };
      next();
    } catch (error) {
      console.error('Token verification failed:', error);
       if (error.name === 'JsonWebTokenError') {
          return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
      }
      if (error.name === 'TokenExpiredError') {
          return res.status(401).json({ success: false, message: 'Not authorized, token expired' });
      }
       return res.status(401).json({ success: false, message: 'Not authorized' });
    }
  }

  if (!token) {
    res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }
};

module.exports = { protect };