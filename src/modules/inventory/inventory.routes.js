const express = require('express');
const controller = require('./inventory.controller');
const validate = require('../../middleware/validate.middleware');
const schema = require('./inventory.validation');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');

const router = express.Router();
router.use(authenticate);

router.get('/warehouses', authorize('inventory:read'), controller.listWarehouses);
router.post('/warehouses', authorize('inventory:create'), validate(schema.createWarehouse), controller.createWarehouse);
router.patch('/warehouses/:id', authorize('inventory:update'), validate(schema.updateWarehouse), controller.updateWarehouse);
router.delete('/warehouses/:id', authorize('inventory:delete'), controller.deleteWarehouse);

router.get('/categories', authorize('inventory:read'), controller.listCategories);
router.post('/categories', authorize('inventory:create'), validate(schema.createCategory), controller.createCategory);

router.get('/items', authorize('inventory:read'), controller.listItems);
router.get('/items/:id', authorize('inventory:read'), controller.getItemById);
router.post('/items', authorize('inventory:create'), validate(schema.createItem), controller.createItem);
router.patch('/items/:id', authorize('inventory:update'), validate(schema.updateItem), controller.updateItem);
router.delete('/items/:id', authorize('inventory:delete'), controller.deleteItem);

router.get('/movements', authorize('inventory:read'), controller.listStockMovements);
router.post('/movements', authorize('inventory:update'), validate(schema.stockMovement), controller.stockMovement);

module.exports = router;
