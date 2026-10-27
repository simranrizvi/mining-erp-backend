const express = require('express');
const controller = require('./dashboard.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');

const router = express.Router();
router.use(authenticate);

router.get('/overview', authorize('dashboard:read'), controller.overview);
router.get('/production-trend', authorize('dashboard:read'), controller.productionTrend);

module.exports = router;
