const express = require('express');
const router = express.Router();

const {
  getProducts,
  getProduct,
  getProductBySlug,
  addProductReview,
  updateProductReview,
  deleteProductReview,
  toggleWishlist,
  getCategories,
  getProductSuggestions,
  getFeaturedProducts,
  getRelatedProducts
} = require('../controllers/productController');

const { authenticate, optionalAuth } = require('../middleware/auth');
const {
  validateReview,
  validateObjectId,
  validatePagination
} = require('../middleware/validation');

// Public routes
router.get('/', validatePagination, optionalAuth, getProducts);
router.get('/categories', getCategories);
router.get('/featured', getFeaturedProducts);
router.get('/suggestions', getProductSuggestions);
router.get('/slug/:slug', optionalAuth, getProductBySlug);
router.get('/:id', validateObjectId('id'), optionalAuth, getProduct);
router.get('/:id/related', validateObjectId('id'), getRelatedProducts);

// Protected routes (require authentication)
router.post('/:id/reviews', validateObjectId('id'), authenticate, validateReview, addProductReview);
router.put('/:id/reviews/:reviewId', validateObjectId('id'), validateObjectId('reviewId'), authenticate, validateReview, updateProductReview);
router.delete('/:id/reviews/:reviewId', validateObjectId('id'), validateObjectId('reviewId'), authenticate, deleteProductReview);
router.post('/:id/wishlist', validateObjectId('id'), authenticate, toggleWishlist);

module.exports = router;