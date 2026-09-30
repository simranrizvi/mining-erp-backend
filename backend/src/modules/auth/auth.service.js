const bcrypt = require('bcryptjs');
const { prisma } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const env = require('../../config/env');
const {
  generateAccessToken,
  generateRefreshToken,
} = require('../../utils/tokenUtils');

const userWithRole = {
  role: { include: { permissions: { include: { permission: true } } } },
  mineSite: { select: { id: true, name: true, code: true } },
};

function sanitizeUser(user) {
  const { password, ...rest } = user;
  return {
    ...rest,
    permissions: user.role.permissions.map((rp) => rp.permission.key),
  };
}

async function issueTokens(user, req) {
  const accessToken = generateAccessToken(user);
  const refreshTokenValue = generateRefreshToken();

  await prisma.refreshToken.create({
    data: {
      token: refreshTokenValue,
      userId: user.id,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
      expiresAt: new Date(Date.now() + env.JWT_REFRESH_EXPIRES_IN_MS),
    },
  });

  return { accessToken, refreshTokenValue };
}

async function login({ email, password }, req) {
  const user = await prisma.user.findUnique({ where: { email }, include: userWithRole });

  if (!user) throw ApiError.unauthorized('Invalid email or password.');
  if (!user.isActive) throw ApiError.forbidden('Your account has been deactivated. Contact your administrator.');

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw ApiError.unauthorized('Invalid email or password.');

  const { accessToken, refreshTokenValue } = await issueTokens(user, req);

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  return { user: sanitizeUser(user), accessToken, refreshToken: refreshTokenValue };
}

async function refresh(refreshTokenValue, req) {
  if (!refreshTokenValue) throw ApiError.unauthorized('Refresh token missing.');

  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshTokenValue } });

  if (!stored || stored.revoked || stored.expiresAt < new Date()) {
    throw ApiError.unauthorized('Refresh token invalid or expired. Please log in again.');
  }

  const user = await prisma.user.findUnique({ where: { id: stored.userId }, include: userWithRole });
  if (!user || !user.isActive) throw ApiError.unauthorized('Account no longer active.');

  // Rotate: revoke the used token and issue a fresh pair
  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
  const { accessToken, refreshTokenValue: newRefreshToken } = await issueTokens(user, req);

  return { user: sanitizeUser(user), accessToken, refreshToken: newRefreshToken };
}

async function logout(refreshTokenValue) {
  if (!refreshTokenValue) return;
  await prisma.refreshToken.updateMany({
    where: { token: refreshTokenValue },
    data: { revoked: true },
  });
}

async function changePassword(userId, currentPassword, newPassword) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) throw ApiError.badRequest('Current password is incorrect.');

  const hashed = await bcrypt.hash(newPassword, env.BCRYPT_SALT_ROUNDS);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashed, mustChangePassword: false },
  });

  // Revoke all existing sessions to force re-login with the new password
  await prisma.refreshToken.updateMany({ where: { userId }, data: { revoked: true } });
}

async function getProfile(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: userWithRole });
  if (!user) throw ApiError.notFound('User not found.');
  return sanitizeUser(user);
}

module.exports = { login, refresh, logout, changePassword, getProfile, sanitizeUser };
