const express = require('express');
const router = express.Router();

const {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  addAddress,
  updateAddress,
  deleteAddress
} = require('../controllers/authController');

const { authenticate } = require('../middleware/auth');
const {
  validateUserRegistration,
  validateUserLogin,
  validatePasswordReset,
  validatePasswordUpdate,
  validateAddress,
  validateObjectId
} = require('../middleware/validation');

// Public routes
router.post('/register', validateUserRegistration, register);
router.post('/login', validateUserLogin, login);
router.post('/forgot-password', validatePasswordReset, forgotPassword);
router.put('/reset-password/:token', validatePasswordUpdate, resetPassword);
router.get('/verify-email/:token', verifyEmail);

// Protected routes
router.use(authenticate); // All routes below require authentication

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/change-password', changePassword);

// Address management
router.post('/addresses', validateAddress, addAddress);
router.put('/addresses/:addressId', validateObjectId('addressId'), validateAddress, updateAddress);
router.delete('/addresses/:addressId', validateObjectId('addressId'), deleteAddress);

module.exports = router;