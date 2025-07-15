// Global error handler middleware
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for debugging
  console.error(`Error: ${error.message}`.red);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = {
      message,
      statusCode: 404
    };
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    let field = Object.keys(err.keyValue)[0];
    let value = err.keyValue[field];
    
    // Customize message based on field
    let message = 'Duplicate field value';
    if (field === 'email') {
      message = 'Email already exists';
    } else if (field === 'sku') {
      message = 'Product SKU already exists';
    } else if (field === 'slug') {
      message = 'Product URL slug already exists';
    }
    
    error = {
      message,
      statusCode: 400
    };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = {
      message,
      statusCode: 400
    };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = {
      message,
      statusCode: 401
    };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = {
      message,
      statusCode: 401
    };
  }

  // Stripe errors
  if (err.type === 'StripeCardError') {
    const message = err.message || 'Payment failed';
    error = {
      message,
      statusCode: 400
    };
  }

  if (err.type === 'StripeInvalidRequestError') {
    const message = 'Invalid payment request';
    error = {
      message,
      statusCode: 400
    };
  }

  // File upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = 'File too large';
    error = {
      message,
      statusCode: 400
    };
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    const message = 'Too many files uploaded';
    error = {
      message,
      statusCode: 400
    };
  }

  // Rate limiting errors
  if (err.message && err.message.includes('Too many requests')) {
    error = {
      message: 'Too many requests, please try again later',
      statusCode: 429
    };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      error: err 
    })
  });
};

module.exports = errorHandler;