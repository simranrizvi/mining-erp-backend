const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./dashboard.service');

const overview = asyncHandler(async (req, res) => {
  const data = await service.getOverview(req.user);
  res.status(200).json(new ApiResponse(200, data));
});

const productionTrend = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days, 10) || 14;
  const data = await service.getProductionTrend(req.user, days);
  res.status(200).json(new ApiResponse(200, data));
});

module.exports = { overview, productionTrend };
