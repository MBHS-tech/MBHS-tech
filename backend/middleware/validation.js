const { body, param, query, validationResult } = require('express-validator');

// Validation result handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors: errors.array()
    });
  }
  next();
};

// User validation rules
const validateUserRegistration = [
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  handleValidationErrors
];

const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

const validatePasswordReset = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  handleValidationErrors
];

const validatePasswordUpdate = [
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
  handleValidationErrors
];

// Product validation rules
const validateProduct = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Product name must be between 2 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('category')
    .isIn(['Electronics', 'Clothing', 'Books', 'Home & Garden', 'Sports', 'Beauty', 'Toys', 'Food', 'Other'])
    .withMessage('Please select a valid category'),
  body('inventory.quantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Inventory quantity must be a non-negative integer'),
  handleValidationErrors
];

const validateProductUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Product name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('category')
    .optional()
    .isIn(['Electronics', 'Clothing', 'Books', 'Home & Garden', 'Sports', 'Beauty', 'Toys', 'Food', 'Other'])
    .withMessage('Please select a valid category'),
  handleValidationErrors
];

// Cart validation rules
const validateAddToCart = [
  body('productId')
    .isMongoId()
    .withMessage('Invalid product ID'),
  body('quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  handleValidationErrors
];

const validateUpdateCartItem = [
  body('quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  handleValidationErrors
];

// Order validation rules
const validateCreateOrder = [
  body('shippingAddress.firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name is required'),
  body('shippingAddress.lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name is required'),
  body('shippingAddress.street')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Street address is required'),
  body('shippingAddress.city')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('City is required'),
  body('shippingAddress.state')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('State is required'),
  body('shippingAddress.zipCode')
    .trim()
    .isLength({ min: 3, max: 10 })
    .withMessage('ZIP code is required'),
  body('shippingAddress.country')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Country is required'),
  body('paymentMethod')
    .isIn(['stripe', 'paypal', 'cash_on_delivery'])
    .withMessage('Invalid payment method'),
  body('shippingMethod')
    .optional()
    .isIn(['standard', 'express', 'overnight'])
    .withMessage('Invalid shipping method'),
  handleValidationErrors
];

// Review validation rules
const validateReview = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('comment')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Comment must be between 10 and 500 characters'),
  handleValidationErrors
];

// Address validation rules
const validateAddress = [
  body('type')
    .isIn(['shipping', 'billing'])
    .withMessage('Address type must be shipping or billing'),
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name is required'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name is required'),
  body('street')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Street address is required'),
  body('city')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('City is required'),
  body('state')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('State is required'),
  body('zipCode')
    .trim()
    .isLength({ min: 3, max: 10 })
    .withMessage('ZIP code is required'),
  body('country')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Country is required'),
  handleValidationErrors
];

// MongoDB ObjectId validation
const validateObjectId = (paramName) => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName}`),
  handleValidationErrors
];

// Pagination validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateUserRegistration,
  validateUserLogin,
  validatePasswordReset,
  validatePasswordUpdate,
  validateProduct,
  validateProductUpdate,
  validateAddToCart,
  validateUpdateCartItem,
  validateCreateOrder,
  validateReview,
  validateAddress,
  validateObjectId,
  validatePagination
};