const express = require('express');
const controller = require('./leave.controller');
const validate = require('../../../middleware/validate.middleware');
const schema = require('./leave.validation');
const { authenticate } = require('../../../middleware/auth.middleware');
const { authorize } = require('../../../middleware/rbac.middleware');

const router = express.Router();
router.use(authenticate);

router.get('/', authorize('hr.leave:read'), controller.list);
router.get('/:id', authorize('hr.leave:read'), controller.getById);
router.post('/', authorize('hr.leave:create'), validate(schema.applyLeave), controller.apply);
router.patch('/:id/action', authorize('hr.leave:approve'), validate(schema.actionLeave), controller.action);
router.patch('/:id/cancel', authorize('hr.leave:update'), controller.cancel);

module.exports = router;
