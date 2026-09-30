const express = require('express');
const controller = require('./auth.controller');
const validate = require('../../middleware/validate.middleware');
const schema = require('./auth.validation');
const { authenticate } = require('../../middleware/auth.middleware');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Stricter limiter specifically on login to slow down credential stuffing
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, statusCode: 429, message: 'Too many login attempts. Please try again later.' },
});

router.post('/login', loginLimiter, validate(schema.login), controller.login);
router.post('/refresh', controller.refresh);
router.post('/logout', authenticate, controller.logout);
router.get('/me', authenticate, controller.me);
router.post('/change-password', authenticate, validate(schema.changePassword), controller.changePassword);

module.exports = router;
