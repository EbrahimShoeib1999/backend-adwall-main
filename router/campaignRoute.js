const express = require('express');

const {
    getCampaigns,
    getCampaign,
    createCampaign,
    updateCampaign,
    deleteCampaign,
} = require('../controllers/campaignService');

const authService = require('../controllers/authService');
const { canCreateAd } = require('../middlewares/subscriptionMiddleware');

const router = express.Router();

router
    .route('/')
    .get(getCampaigns)
    .post(
        authService.protect,
        authService.allowedTo('admin', 'manager', 'user'), // Allow all authenticated users
        createCampaign
    );

router
    .route('/:id')
    .get(getCampaign)
    .put(
        authService.protect,
        authService.allowedTo('admin', 'manager'),
        updateCampaign
    )
    .delete(
        authService.protect,
        authService.allowedTo('admin'),
        deleteCampaign
    );

module.exports = router;