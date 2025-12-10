const passport = require('passport');
const express = require('express');
const {
  signupValidator,
  loginValidator,
} = require('../utils/validators/authValidator');

const {
  signup,
  login,
  forgotPassword,
  verifyPassResetCode,
  resetPassword,
  googleCallback,
  getGoogleClientId,
  verifyGoogle, // Import verifyGoogle
} = require('../controllers/authService');

const router = express.Router();

router.post('/signup', signupValidator, signup);
router.post('/login', loginValidator, login);
router.post('/forgotPassword', forgotPassword);
router.post('/verifyResetCode', verifyPassResetCode);
router.put('/resetPassword', resetPassword);

// Social Login Routes
router.get('/google', passport.authenticate('google', { 
  scope: ['profile', 'email'],
  accessType: 'offline',
  prompt: 'consent'
}));

// New POST route for frontend-initiated Google login
router.post('/google', verifyGoogle);

router.get('/google/client-id', getGoogleClientId);

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false }),
  googleCallback
);

module.exports = router;