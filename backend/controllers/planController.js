const Plan = require('../model/planModel');
const factory = require('./handlersFactory');

// @desc    Get all plans
// @route   GET /api/v1/plans
// @access  Public
exports.getPlans = factory.getAll(Plan);

// @desc    Get a specific plan
// @route   GET /api/v1/plans/:id
// @access  Public
exports.getPlan = factory.getOne(Plan);

// @desc    Create a new plan
// @route   POST /api/v1/plans
// @access  Private/Admin
exports.createPlan = factory.createOne(Plan);

// @desc    Update a specific plan
// @route   PUT /api/v1/plans/:id
// @access  Private/Admin
exports.updatePlan = factory.updateOne(Plan);

// @desc    Delete a specific plan
// @route   DELETE /api/v1/plans/:id
// @access  Private/Admin
exports.deletePlan = factory.deleteOne(Plan);