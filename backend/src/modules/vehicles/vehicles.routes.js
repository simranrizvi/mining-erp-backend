const express = require('express');
const controller = require('./vehicles.controller');
const validate = require('../../middleware/validate.middleware');
const schema = require('./vehicles.validation');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');

const router = express.Router();
router.use(authenticate);

router.get('/', authorize('vehicles:read'), controller.list);
router.get('/:id', authorize('vehicles:read'), controller.getById);
router.post('/', authorize('vehicles:create'), validate(schema.createVehicle), controller.create);
router.patch('/:id', authorize('vehicles:update'), validate(schema.updateVehicle), controller.update);
router.patch('/:id/status', authorize('vehicles:update'), validate(schema.changeStatus), controller.changeStatus);
router.delete('/:id', authorize('vehicles:delete'), controller.remove);

module.exports = router;
