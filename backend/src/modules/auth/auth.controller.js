const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const authService = require('./auth.service');
const { recordAuditLog } = require('../../middleware/auditLog.middleware');
const env = require('../../config/env');

const REFRESH_COOKIE_NAME = 'refreshToken';

const cookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: 'lax',
  maxAge: env.JWT_REFRESH_EXPIRES_IN_MS,
  path: '/api/v1/auth',
};

const login = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.login(req.body, req);

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, cookieOptions);

  await recordAuditLog({
    req: { ...req, user },
    action: 'LOGIN',
    module: 'auth',
    entityId: user.id,
    description: `${user.name} logged in`,
  });

  res.status(200).json(new ApiResponse(200, { user, accessToken }, 'Login successful'));
});

const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies[REFRESH_COOKIE_NAME];
  const { user, accessToken, refreshToken } = await authService.refresh(token, req);

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, cookieOptions);
  res.status(200).json(new ApiResponse(200, { user, accessToken }, 'Token refreshed'));
});

const logout = asyncHandler(async (req, res) => {
  const token = req.cookies[REFRESH_COOKIE_NAME];
  await authService.logout(token);
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/v1/auth' });

  await recordAuditLog({
    req,
    action: 'LOGOUT',
    module: 'auth',
    entityId: req.user?.id,
    description: `${req.user?.name || 'User'} logged out`,
  });

  res.status(200).json(new ApiResponse(200, null, 'Logged out successfully'));
});

const me = asyncHandler(async (req, res) => {
  const profile = await authService.getProfile(req.user.id);
  res.status(200).json(new ApiResponse(200, profile));
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await authService.changePassword(req.user.id, currentPassword, newPassword);

  await recordAuditLog({
    req,
    action: 'UPDATE',
    module: 'auth',
    entityId: req.user.id,
    description: 'User changed their password',
  });

  res.status(200).json(new ApiResponse(200, null, 'Password changed successfully. Please log in again.'));
});

module.exports = { login, refresh, logout, me, changePassword };
