const express = require('express');
const controller = require('./settings.controller');
const validate = require('../../middleware/validate.middleware');
const schema = require('./settings.validation');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');

const router = express.Router();
router.use(authenticate);

router.get('/company', authorize('settings:read'), controller.getCompany);
router.patch('/company', authorize('settings:update'), validate(schema.updateCompany), controller.updateCompany);

router.get('/system', authorize('settings:read'), controller.listSettings);
router.put('/system', authorize('settings:update'), validate(schema.upsertSetting), controller.upsertSetting);
router.delete('/system/:key', authorize('settings:delete'), controller.deleteSetting);

router.get('/departments', authorize('settings:read'), controller.listDepartments);
router.post('/departments', authorize('settings:create'), validate(schema.nameOnly), controller.createDepartment);
router.delete('/departments/:id', authorize('settings:delete'), controller.deleteDepartment);

router.get('/leave-types', authorize('settings:read'), controller.listLeaveTypes);
router.post('/leave-types', authorize('settings:create'), validate(schema.createLeaveType), controller.createLeaveType);
router.delete('/leave-types/:id', authorize('settings:delete'), controller.deleteLeaveType);

router.get('/shifts', authorize('settings:read'), controller.listShifts);
router.post('/shifts', authorize('settings:create'), validate(schema.createShift), controller.createShift);
router.delete('/shifts/:id', authorize('settings:delete'), controller.deleteShift);

module.exports = router;
