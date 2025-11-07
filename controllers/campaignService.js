const factory = require('./handlersFactory');
const Campaign = require('../model/campaignModel');

// @desc    Get list of campaigns
// @route   GET /api/v1/campaigns
// @access  Public
exports.getCampaigns = factory.getAll(Campaign);

// @desc    Get specific campaign by id
// @route   GET /api/v1/campaigns/:id
// @access  Public
exports.getCampaign = factory.getOne(Campaign);

// @desc    Create campaign
// @route   POST  /api/v1/campaigns
// @access  Private/Admin-Manager
exports.createCampaign = factory.createOne(Campaign);

// @desc    Update specific campaign
// @route   PUT /api/v1/campaigns/:id
// @access  Private/Admin-Manager
exports.updateCampaign = factory.updateOne(Campaign);

// @desc    Delete specific campaign
// @route   DELETE /api/v1/campaigns/:id
// @access  Private/Admin
exports.deleteCampaign = factory.deleteOne(Campaign);
