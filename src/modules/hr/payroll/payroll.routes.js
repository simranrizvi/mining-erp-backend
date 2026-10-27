const express = require('express');
const controller = require('./payroll.controller');
const validate = require('../../../middleware/validate.middleware');
const schema = require('./payroll.validation');
const { authenticate } = require('../../../middleware/auth.middleware');
const { authorize } = require('../../../middleware/rbac.middleware');

const router = express.Router();
router.use(authenticate);

router.get('/summary', authorize('hr.payroll:read'), controller.summary);
router.get('/', authorize('hr.payroll:read'), controller.list);
router.get('/:id', authorize('hr.payroll:read'), controller.getById);
router.post('/', authorize('hr.payroll:create'), validate(schema.createPayroll), controller.create);
router.post('/generate', authorize('hr.payroll:create'), validate(schema.generatePayroll), controller.generate);
router.patch('/:id', authorize('hr.payroll:update'), validate(schema.updatePayroll), controller.update);
router.patch('/:id/action', authorize('hr.payroll:update'), validate(schema.actionPayroll), controller.action);
router.delete('/:id', authorize('hr.payroll:delete'), controller.remove);

module.exports = router;
