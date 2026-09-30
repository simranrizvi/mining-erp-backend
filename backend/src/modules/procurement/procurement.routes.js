const express = require('express');
const controller = require('./procurement.controller');
const validate = require('../../middleware/validate.middleware');
const schema = require('./procurement.validation');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');

const router = express.Router();
router.use(authenticate);

router.get('/vendors', authorize('vendors:read'), controller.listVendors);
router.get('/vendors/:id', authorize('vendors:read'), controller.getVendorById);
router.post('/vendors', authorize('vendors:create'), validate(schema.createVendor), controller.createVendor);
router.patch('/vendors/:id', authorize('vendors:update'), validate(schema.updateVendor), controller.updateVendor);
router.delete('/vendors/:id', authorize('vendors:delete'), controller.deleteVendor);

router.get('/requests', authorize('procurement:read'), controller.listPurchaseRequests);
router.get('/requests/:id', authorize('procurement:read'), controller.getPurchaseRequestById);
router.post('/requests', authorize('procurement:create'), validate(schema.createPurchaseRequest), controller.createPurchaseRequest);
router.patch('/requests/:id/action', authorize('procurement:approve'), validate(schema.actionPurchaseRequest), controller.actionPurchaseRequest);

router.get('/orders', authorize('procurement:read'), controller.listPurchaseOrders);
router.get('/orders/:id', authorize('procurement:read'), controller.getPurchaseOrderById);
router.post('/orders', authorize('procurement:create'), validate(schema.createPurchaseOrder), controller.createPurchaseOrder);
router.post('/orders/:id/receive', authorize('procurement:update'), validate(schema.receiveItems), controller.receiveItems);

module.exports = router;
