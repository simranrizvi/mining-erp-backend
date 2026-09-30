const ApiError = require('../utils/ApiError');

/**
 * Validates req.body (default) or another request part against a Joi
 * schema. On failure, collects every field error into ApiError.details
 * instead of failing on just the first one.
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message.replace(/"/g, ''),
      }));
      return next(ApiError.badRequest('Validation failed', details));
    }

    req[source] = value;
    next();
  };
}

module.exports = validate;
