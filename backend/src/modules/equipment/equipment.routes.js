const express = require('express');
const controller = require('./equipment.controller');
const validate = require('../../middleware/validate.middleware');
const schema = require('./equipment.validation');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');

const router = express.Router();
router.use(authenticate);

router.get('/', authorize('equipment:read'), controller.list);
router.get('/utilization', authorize('equipment:read'), controller.utilization);
router.get('/:id', authorize('equipment:read'), controller.getById);
router.post('/', authorize('equipment:create'), validate(schema.createEquipment), controller.create);
router.patch('/:id', authorize('equipment:update'), validate(schema.updateEquipment), controller.update);
router.patch('/:id/status', authorize('equipment:update'), validate(schema.changeStatus), controller.changeStatus);
router.delete('/:id', authorize('equipment:delete'), controller.remove);

module.exports = router;
