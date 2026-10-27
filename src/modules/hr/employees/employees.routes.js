const express = require('express');
const controller = require('./employees.controller');
const validate = require('../../../middleware/validate.middleware');
const schema = require('./employees.validation');
const { authenticate } = require('../../../middleware/auth.middleware');
const { authorize } = require('../../../middleware/rbac.middleware');
const { upload, toFolder } = require('../../../middleware/upload.middleware');

const router = express.Router();
router.use(authenticate);

router.get('/', authorize('hr.employees:read'), controller.list);
router.get('/:id', authorize('hr.employees:read'), controller.getById);
router.post('/', authorize('hr.employees:create'), validate(schema.createEmployee), controller.create);
router.patch('/:id', authorize('hr.employees:update'), validate(schema.updateEmployee), controller.update);
router.delete('/:id', authorize('hr.employees:delete'), controller.remove);
router.post('/:id/photo', authorize('hr.employees:update'), toFolder('employees'), upload.single('photo'), controller.uploadPhoto);

module.exports = router;
