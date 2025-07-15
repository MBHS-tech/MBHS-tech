const express = require('express');
const router = express.Router();

const {
  createOrder,
  getUserOrders,
  getOrder,
  cancelOrder,
  confirmStripePayment,
  trackOrder,
  requestReturn,
  getOrderByNumber
} = require('../controllers/orderController');

const { authenticate } = require('../middleware/auth');
const {
  validateCreateOrder,
  validateObjectId,
  validatePagination
} = require('../middleware/validation');

// Public routes
router.get('/lookup/:orderNumber', getOrderByNumber);

// Protected routes (require authentication)
router.use(authenticate);

router.post('/', validateCreateOrder, createOrder);
router.get('/', validatePagination, getUserOrders);
router.get('/:id', validateObjectId('id'), getOrder);
router.get('/:id/track', validateObjectId('id'), trackOrder);
router.put('/:id/cancel', validateObjectId('id'), cancelOrder);
router.post('/:id/confirm-payment', validateObjectId('id'), confirmStripePayment);
router.post('/:id/return', validateObjectId('id'), requestReturn);

module.exports = router;