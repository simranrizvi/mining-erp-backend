const express = require('express');
const controller = require('./reports.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');

const router = express.Router();
router.use(authenticate);

router.get('/production', authorize('reports:read'), controller.production);
router.get('/attendance', authorize('reports:read'), controller.attendance);
router.get('/inventory-valuation', authorize('reports:read'), controller.inventoryValuation);
router.get('/financial-summary', authorize('reports:read'), controller.financialSummary);
router.get('/equipment-utilization', authorize('reports:read'), controller.equipmentUtilization);

module.exports = router;
