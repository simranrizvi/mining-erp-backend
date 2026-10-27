const express = require('express');
const controller = require('./maintenance.controller');
const validate = require('../../middleware/validate.middleware');
const schema = require('./maintenance.validation');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');

const router = express.Router();
router.use(authenticate);

router.get('/schedules', authorize('maintenance:read'), controller.listSchedules);
router.post('/schedules', authorize('maintenance:create'), validate(schema.createSchedule), controller.createSchedule);
router.patch('/schedules/:id', authorize('maintenance:update'), validate(schema.updateSchedule), controller.updateSchedule);
router.delete('/schedules/:id', authorize('maintenance:delete'), controller.deleteSchedule);

router.get('/records', authorize('maintenance:read'), controller.listRecords);
router.get('/records/:id', authorize('maintenance:read'), controller.getRecordById);
router.post('/records', authorize('maintenance:create'), validate(schema.createRecord), controller.createRecord);
router.patch('/records/:id', authorize('maintenance:update'), validate(schema.updateRecord), controller.updateRecord);
router.delete('/records/:id', authorize('maintenance:delete'), controller.deleteRecord);

module.exports = router;
