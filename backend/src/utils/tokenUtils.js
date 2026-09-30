const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');

function generateAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      roleId: user.roleId,
      roleName: user.role?.name,
      mineSiteId: user.mineSiteId,
    },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN }
  );
}

function generateRefreshToken() {
  // Opaque random token stored (hashed lookup not required since it's
  // already random + stored server-side in the refresh_tokens table,
  // which allows immediate revocation).
  return crypto.randomBytes(64).toString('hex');
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

module.exports = { generateAccessToken, generateRefreshToken, verifyAccessToken };
