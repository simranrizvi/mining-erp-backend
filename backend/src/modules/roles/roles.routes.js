const express = require('express');
const controller = require('./roles.controller');
const validate = require('../../middleware/validate.middleware');
const schema = require('./roles.validation');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');

const router = express.Router();
router.use(authenticate);

router.get('/permissions/catalog', authorize('roles:read'), controller.listPermissions);
router.get('/', authorize('roles:read'), controller.list);
router.get('/:id', authorize('roles:read'), controller.getById);
router.post('/', authorize('roles:create'), validate(schema.createRole), controller.create);
router.patch('/:id', authorize('roles:update'), validate(schema.updateRole), controller.update);
router.delete('/:id', authorize('roles:delete'), controller.remove);
router.put('/:id/permissions', authorize('roles:update'), validate(schema.setPermissions), controller.setPermissions);

module.exports = router;
