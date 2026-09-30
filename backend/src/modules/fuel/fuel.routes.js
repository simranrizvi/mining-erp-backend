const express = require('express');
const controller = require('./fuel.controller');
const validate = require('../../middleware/validate.middleware');
const schema = require('./fuel.validation');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');

const router = express.Router();
router.use(authenticate);

router.get('/stations', authorize('fuel:read'), controller.listStations);
router.post('/stations', authorize('fuel:create'), validate(schema.createStation), controller.createStation);
router.patch('/stations/:id', authorize('fuel:update'), validate(schema.updateStation), controller.updateStation);
router.delete('/stations/:id', authorize('fuel:delete'), controller.deleteStation);

router.get('/transactions', authorize('fuel:read'), controller.listTransactions);
router.post('/transactions', authorize('fuel:create'), validate(schema.createTransaction), controller.createTransaction);

router.get('/purchases', authorize('fuel:read'), controller.listPurchases);
router.post('/purchases', authorize('fuel:create'), validate(schema.createPurchase), controller.createPurchase);

module.exports = router;
