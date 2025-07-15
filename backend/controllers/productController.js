const Product = require('../models/Product');
const User = require('../models/User');

// @desc    Get all products with filtering, sorting, and pagination
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res, next) => {
  try {
    // Build query object
    let query = {};
    
    // Only show active products for public access
    query.isActive = true;

    // Category filter
    if (req.query.category) {
      query.category = req.query.category;
    }

    // Subcategory filter
    if (req.query.subcategory) {
      query.subcategory = req.query.subcategory;
    }

    // Brand filter
    if (req.query.brand) {
      query.brand = req.query.brand;
    }

    // Price range filter
    if (req.query.minPrice || req.query.maxPrice) {
      query.price = {};
      if (req.query.minPrice) query.price.$gte = parseFloat(req.query.minPrice);
      if (req.query.maxPrice) query.price.$lte = parseFloat(req.query.maxPrice);
    }

    // Rating filter
    if (req.query.minRating) {
      query.averageRating = { $gte: parseFloat(req.query.minRating) };
    }

    // Featured products
    if (req.query.featured === 'true') {
      query.featured = true;
    }

    // Stock status filter
    if (req.query.inStock === 'true') {
      query['inventory.quantity'] = { $gt: 0 };
    }

    // Search functionality
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { tags: { $in: [searchRegex] } },
        { brand: searchRegex }
      ];
    }

    // Tags filter
    if (req.query.tags) {
      const tags = req.query.tags.split(',');
      query.tags = { $in: tags };
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 12;
    const startIndex = (page - 1) * limit;

    // Sorting
    let sort = {};
    switch (req.query.sort) {
      case 'price_asc':
        sort.price = 1;
        break;
      case 'price_desc':
        sort.price = -1;
        break;
      case 'name_asc':
        sort.name = 1;
        break;
      case 'name_desc':
        sort.name = -1;
        break;
      case 'rating':
        sort.averageRating = -1;
        break;
      case 'newest':
        sort.createdAt = -1;
        break;
      case 'oldest':
        sort.createdAt = 1;
        break;
      case 'popular':
        sort.salesCount = -1;
        break;
      default:
        sort.createdAt = -1;
    }

    // Execute query
    const products = await Product.find(query)
      .select('-reviews') // Exclude reviews for better performance
      .sort(sort)
      .skip(startIndex)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await Product.countDocuments(query);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Get product statistics for filters
    const categories = await Product.distinct('category', { isActive: true });
    const brands = await Product.distinct('brand', { isActive: true, brand: { $ne: null } });
    const priceRange = await Product.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      pagination: {
        page,
        limit,
        totalPages,
        hasNextPage,
        hasPrevPage
      },
      filters: {
        categories,
        brands,
        priceRange: priceRange[0] || { minPrice: 0, maxPrice: 0 }
      },
      products
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
const getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('reviews.user', 'firstName lastName')
      .populate('relatedProducts', 'name price images averageRating');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Increment view count
    product.viewCount += 1;
    await product.save();

    res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get product by slug
// @route   GET /api/products/slug/:slug
// @access  Public
const getProductBySlug = async (req, res, next) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug })
      .populate('reviews.user', 'firstName lastName')
      .populate('relatedProducts', 'name price images averageRating');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Increment view count
    product.viewCount += 1;
    await product.save();

    res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add product review
// @route   POST /api/products/:id/reviews
// @access  Private
const addProductReview = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if user already reviewed this product
    const existingReview = product.reviews.find(
      review => review.user.toString() === req.user.id
    );

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product'
      });
    }

    // Add review
    const review = {
      user: req.user.id,
      rating: Number(rating),
      comment
    };

    product.reviews.push(review);
    product.calculateAverageRating();
    await product.save();

    res.status(201).json({
      success: true,
      message: 'Review added successfully',
      review
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update product review
// @route   PUT /api/products/:id/reviews/:reviewId
// @access  Private
const updateProductReview = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const review = product.reviews.id(req.params.reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user owns the review
    if (review.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this review'
      });
    }

    // Update review
    review.rating = rating || review.rating;
    review.comment = comment || review.comment;

    product.calculateAverageRating();
    await product.save();

    res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      review
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete product review
// @route   DELETE /api/products/:id/reviews/:reviewId
// @access  Private
const deleteProductReview = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const review = product.reviews.id(req.params.reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user owns the review or is admin
    if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this review'
      });
    }

    // Remove review
    product.reviews.pull(req.params.reviewId);
    product.calculateAverageRating();
    await product.save();

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle wishlist
// @route   POST /api/products/:id/wishlist
// @access  Private
const toggleWishlist = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const productId = req.params.id;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const isInWishlist = user.wishlist.includes(productId);

    if (isInWishlist) {
      // Remove from wishlist
      user.wishlist.pull(productId);
    } else {
      // Add to wishlist
      user.wishlist.push(productId);
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: isInWishlist ? 'Removed from wishlist' : 'Added to wishlist',
      isInWishlist: !isInWishlist
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get categories with product counts
// @route   GET /api/products/categories
// @access  Public
const getCategories = async (req, res, next) => {
  try {
    const categories = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      categories
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get product suggestions (for search autocomplete)
// @route   GET /api/products/suggestions
// @access  Public
const getProductSuggestions = async (req, res, next) => {
  try {
    const { query } = req.query;
    
    if (!query || query.length < 2) {
      return res.status(200).json({
        success: true,
        suggestions: []
      });
    }

    const searchRegex = new RegExp(query, 'i');
    
    const suggestions = await Product.find({
      isActive: true,
      $or: [
        { name: searchRegex },
        { tags: { $in: [searchRegex] } },
        { brand: searchRegex }
      ]
    })
    .select('name slug')
    .limit(10)
    .lean();

    res.status(200).json({
      success: true,
      suggestions
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get featured products
// @route   GET /api/products/featured
// @access  Public
const getFeaturedProducts = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 8;
    
    const products = await Product.find({ 
      isActive: true, 
      featured: true 
    })
    .select('-reviews')
    .sort({ averageRating: -1, salesCount: -1 })
    .limit(limit)
    .lean();

    res.status(200).json({
      success: true,
      count: products.length,
      products
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get related products
// @route   GET /api/products/:id/related
// @access  Public
const getRelatedProducts = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const limit = parseInt(req.query.limit, 10) || 4;

    // Find products in same category, excluding current product
    const relatedProducts = await Product.find({
      _id: { $ne: req.params.id },
      category: product.category,
      isActive: true
    })
    .select('-reviews')
    .sort({ averageRating: -1, salesCount: -1 })
    .limit(limit)
    .lean();

    res.status(200).json({
      success: true,
      count: relatedProducts.length,
      products: relatedProducts
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};