const express = require('express');
const controller = require('./production.controller');
const validate = require('../../../middleware/validate.middleware');
const schema = require('./production.validation');
const { authenticate } = require('../../../middleware/auth.middleware');
const { authorize } = require('../../../middleware/rbac.middleware');

const router = express.Router();
router.use(authenticate);

router.get('/', authorize('mining.production:read'), controller.list);
router.get('/by-material', authorize('mining.production:read'), controller.byMaterial);
router.get('/:id', authorize('mining.production:read'), controller.getById);
router.post('/', authorize('mining.production:create'), validate(schema.createProduction), controller.create);
router.patch('/:id', authorize('mining.production:update'), validate(schema.updateProduction), controller.update);
router.delete('/:id', authorize('mining.production:delete'), controller.remove);

module.exports = router;
