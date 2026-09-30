const express = require('express');
const controller = require('./attendance.controller');
const validate = require('../../../middleware/validate.middleware');
const schema = require('./attendance.validation');
const { authenticate } = require('../../../middleware/auth.middleware');
const { authorize } = require('../../../middleware/rbac.middleware');

const router = express.Router();
router.use(authenticate);

router.get('/', authorize('hr.attendance:read'), controller.list);
router.get('/summary', authorize('hr.attendance:read'), controller.summary);
router.post('/check-in', authorize('hr.attendance:create'), validate(schema.checkIn), controller.checkIn);
router.patch('/:id/check-out', authorize('hr.attendance:update'), validate(schema.checkOut), controller.checkOut);
router.post('/bulk-mark', authorize('hr.attendance:create'), validate(schema.bulkMark), controller.bulkMark);

module.exports = router;
