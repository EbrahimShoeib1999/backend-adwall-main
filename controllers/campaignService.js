const asyncHandler = require('express-async-handler');
const factory = require('./handlersFactory');
const Campaign = require('../model/campaignModel');
const User = require('../model/userModel');
const { createNotification } = require('./notificationController');
const { sendSuccessResponse, statusCodes } = require('../utils/responseHandler');

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
// @access  Private/User with Subscription
exports.createCampaign = asyncHandler(async (req, res, next) => {
    // Set the advertiser ID from the authenticated user
    req.body.advertiser = req.user._id;

    const doc = await Campaign.create(req.body);

    sendSuccessResponse(res, statusCodes.CREATED, 'تم إنشاء الحملة بنجاح', { data: doc });
});

// @desc    Update specific campaign
// @route   PUT /api/v1/campaigns/:id
// @access  Private/Admin-Manager
exports.updateCampaign = factory.updateOne(Campaign);

// @desc    Delete specific campaign
// @route   DELETE /api/v1/campaigns/:id
// @access  Private/Admin
exports.deleteCampaign = factory.deleteOne(Campaign);
