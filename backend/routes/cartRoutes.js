const express = require('express');
const router = express.Router();

const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  applyDiscount,
  removeDiscount,
  getCartSummary,
  syncCart
} = require('../controllers/cartController');

const { authenticate } = require('../middleware/auth');
const {
  validateAddToCart,
  validateUpdateCartItem,
  validateObjectId
} = require('../middleware/validation');

// All cart routes require authentication
router.use(authenticate);

router.get('/', getCart);
router.get('/summary', getCartSummary);
router.post('/add', validateAddToCart, addToCart);
router.post('/sync', syncCart);
router.put('/update/:itemId', validateObjectId('itemId'), validateUpdateCartItem, updateCartItem);
router.delete('/remove/:itemId', validateObjectId('itemId'), removeFromCart);
router.delete('/clear', clearCart);

// Discount management
router.post('/discount', applyDiscount);
router.delete('/discount', removeDiscount);

module.exports = router;