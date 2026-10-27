const express = require('express');
const controller = require('./auditlogs.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');

const router = express.Router();
router.use(authenticate);
router.get('/', authorize('audit_logs:read'), controller.list);

module.exports = router;
