const express = require('express');
const controller = require('./users.controller');
const validate = require('../../middleware/validate.middleware');
const schema = require('./users.validation');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');

const router = express.Router();
router.use(authenticate);

router.get('/', authorize('users:read'), controller.list);
router.get('/:id', authorize('users:read'), controller.getById);
router.post('/', authorize('users:create'), validate(schema.createUser), controller.create);
router.patch('/:id', authorize('users:update'), validate(schema.updateUser), controller.update);
router.delete('/:id', authorize('users:delete'), controller.remove);
router.post('/:id/reset-password', authorize('users:update'), validate(schema.resetPassword), controller.resetPassword);

module.exports = router;
