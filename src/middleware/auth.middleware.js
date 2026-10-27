const { verifyAccessToken } = require('../utils/tokenUtils');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { prisma } = require('../config/db');

/**
 * Verifies the Bearer access token, loads the current user (with role +
 * permissions) and attaches it to req.user. Rejects if the user has been
 * deactivated since the token was issued.
 */
const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Access token missing. Please log in.');
  }

  const token = header.split(' ')[1];

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Access token expired');
    }
    throw ApiError.unauthorized('Invalid access token');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: {
      role: {
        include: { permissions: { include: { permission: true } } },
      },
    },
  });

  if (!user || !user.isActive) {
    throw ApiError.unauthorized('Account is inactive or no longer exists');
  }

  req.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    roleId: user.roleId,
    roleName: user.role.name,
    mineSiteId: user.mineSiteId,
    permissions: user.role.permissions.map((rp) => rp.permission.key),
  };

  next();
});

module.exports = { authenticate };
