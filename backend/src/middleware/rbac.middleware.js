const ApiError = require('../utils/ApiError');

/**
 * Dynamic, permission-based access control.
 *
 * Usage: authorize('hr.employees:create')
 *        authorize(['finance.expenses:approve', 'finance.expenses:update']) -> ANY match required
 *
 * Because permissions live in the database (Role -> RolePermission ->
 * Permission) and are attached to req.user.permissions during
 * authentication, a Super Admin can create a brand-new role, assign any
 * combination of permissions to it, and every route in the system will
 * respect that instantly — no source code changes required.
 *
 * The literal role name "Super Admin" always bypasses checks as a safety
 * net (e.g. immediately after seeding, before permissions are fully wired).
 */
function authorize(requiredPermissions) {
  const required = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }

    if (req.user.roleName === 'Super Admin') {
      return next();
    }

    const hasPermission = required.some((perm) => req.user.permissions.includes(perm));
    if (!hasPermission) {
      return next(
        ApiError.forbidden(`You do not have permission to perform this action (${required.join(' or ')}).`)
      );
    }

    next();
  };
}

/**
 * Restricts a route to a specific mine site unless the user's role is
 * global (Super Admin / Operations Admin). Useful for Mine Manager style
 * roles who are scoped to a single site.
 */
function scopeToOwnMineSite(mineSiteIdFromRequest) {
  return (req, res, next) => {
    const globalRoles = ['Super Admin', 'Operations Admin'];
    if (globalRoles.includes(req.user.roleName)) return next();

    if (req.user.mineSiteId && mineSiteIdFromRequest && req.user.mineSiteId !== mineSiteIdFromRequest) {
      return next(ApiError.forbidden('You can only access data for your assigned mine site.'));
    }
    next();
  };
}

module.exports = { authorize, scopeToOwnMineSite };
