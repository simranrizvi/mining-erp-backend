const { prisma } = require('../config/db');
const logger = require('../config/logger');

/**
 * Writes a single audit trail entry. Called explicitly from services after
 * a mutating operation succeeds (create/update/delete/approve/login/...),
 * so we always capture a meaningful before/after diff rather than a raw
 * HTTP method name.
 *
 * Never throws — audit logging failures must not break the main request.
 */
async function recordAuditLog({ req, action, module, entityId, description, oldValue = null, newValue = null }) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: req?.user?.id || null,
        action,
        module,
        entityId: entityId ? String(entityId) : null,
        description,
        oldValue: oldValue ?? undefined,
        newValue: newValue ?? undefined,
        ipAddress: req?.ip,
        userAgent: req?.headers?.['user-agent'],
      },
    });
  } catch (err) {
    logger.error(`Failed to write audit log: ${err.message}`);
  }
}

/**
 * Express middleware that logs every request's basic metadata (method,
 * path, status, duration, user) to the application logger for observability.
 * This is separate from the business-level audit trail above.
 */
function requestLogger(logger) {
  return (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info(
        `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms - user:${req.user?.id || 'anonymous'}`
      );
    });
    next();
  };
}

module.exports = { recordAuditLog, requestLogger };
