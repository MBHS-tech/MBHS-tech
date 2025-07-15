const express = require('express');
const router = express.Router();

// Import admin controller (to be created)
const {
  getAllUsers,
  getUserById,
  updateUserStatus,
  deleteUser,
  createProduct,
  updateProduct,
  deleteProduct,
  getAllOrders,
  updateOrderStatus,
  getDashboardStats,
  getRecentActivity
} = require('../controllers/adminController');

const { authenticate, authorize } = require('../middleware/auth');
const {
  validateProduct,
  validateProductUpdate,
  validateObjectId,
  validatePagination
} = require('../middleware/validation');

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

// Dashboard
router.get('/dashboard', getDashboardStats);
router.get('/activity', getRecentActivity);

// User management
router.get('/users', validatePagination, getAllUsers);
router.get('/users/:id', validateObjectId('id'), getUserById);
router.put('/users/:id/status', validateObjectId('id'), updateUserStatus);
router.delete('/users/:id', validateObjectId('id'), deleteUser);

// Product management
router.post('/products', validateProduct, createProduct);
router.put('/products/:id', validateObjectId('id'), validateProductUpdate, updateProduct);
router.delete('/products/:id', validateObjectId('id'), deleteProduct);

// Order management
router.get('/orders', validatePagination, getAllOrders);
router.put('/orders/:id/status', validateObjectId('id'), updateOrderStatus);

module.exports = router;