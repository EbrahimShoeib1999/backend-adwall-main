const express = require('express');
const {
  createReview,
  getReviews,
  getReview,
  deleteReview,
  approveReview,
  createFilterObj,
} = require('../controllers/reviewController');
const authService = require('../controllers/authService');

const router = express.Router({ mergeParams: true });

router
  .route('/')
  .get(createFilterObj, getReviews)
  .post(
    authService.protect,
    authService.allowedTo('user'),
    createReview
  );

router
  .route('/:id')
  .get(getReview)
  .delete(
    authService.protect, 
    authService.allowedTo('admin'), 
    deleteReview
  );

router
  .route('/:id/approve')
  .patch(
    authService.protect, 
    authService.allowedTo('admin'), 
    approveReview
  );

module.exports = router;