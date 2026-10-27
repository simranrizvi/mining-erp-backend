const express = require('express');
const controller = require('./minesites.controller');
const validate = require('../../middleware/validate.middleware');
const schema = require('./minesites.validation');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');

const router = express.Router();
router.use(authenticate);

router.get('/', authorize('mine_sites:read'), controller.list);
router.get('/:id', authorize('mine_sites:read'), controller.getById);
router.post('/', authorize('mine_sites:create'), validate(schema.createMineSite), controller.create);
router.patch('/:id', authorize('mine_sites:update'), validate(schema.updateMineSite), controller.update);
router.delete('/:id', authorize('mine_sites:delete'), controller.remove);

module.exports = router;
