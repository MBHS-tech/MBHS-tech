const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Cart = require('../models/Cart');

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private (Admin)
const getDashboardStats = async (req, res, next) => {
  try {
    // Get date ranges
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const last30Days = new Date(new Date().setDate(new Date().getDate() - 30));

    // Get basic counts
    const totalUsers = await User.countDocuments();
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });

    // Revenue statistics
    const totalRevenue = await Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    const monthlyRevenue = await Order.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
          createdAt: { $gte: startOfMonth }
        }
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    // Recent orders
    const recentOrders = await Order.countDocuments({
      createdAt: { $gte: last30Days }
    });

    // Order status breakdown
    const orderStatusBreakdown = await Order.aggregate([
      {
        $group: {
          _id: '$orderStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    // Top selling products
    const topProducts = await Order.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalSold: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $project: {
          name: '$product.name',
          totalSold: 1,
          revenue: 1
        }
      }
    ]);

    // Low stock products
    const lowStockProducts = await Product.find({
      'inventory.trackQuantity': true,
      $expr: { $lte: ['$inventory.quantity', '$inventory.lowStockThreshold'] }
    }).select('name inventory.quantity inventory.lowStockThreshold');

    // Recent registrations
    const newUsersThisMonth = await User.countDocuments({
      createdAt: { $gte: startOfMonth }
    });

    res.status(200).json({
      success: true,
      stats: {
        overview: {
          totalUsers,
          totalProducts,
          totalOrders,
          activeUsers,
          totalRevenue: totalRevenue[0]?.total || 0,
          monthlyRevenue: monthlyRevenue[0]?.total || 0,
          recentOrders,
          newUsersThisMonth
        },
        orderStatusBreakdown,
        topProducts,
        lowStockProducts: lowStockProducts.slice(0, 10)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get recent activity
// @route   GET /api/admin/activity
// @access  Private (Admin)
const getRecentActivity = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;

    // Get recent orders
    const recentOrders = await Order.find()
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('orderNumber totalAmount orderStatus createdAt user');

    // Get recent user registrations
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('firstName lastName email createdAt');

    // Get recent product updates
    const recentProducts = await Product.find()
      .sort({ updatedAt: -1 })
      .limit(limit)
      .select('name price createdAt updatedAt');

    res.status(200).json({
      success: true,
      activity: {
        recentOrders,
        recentUsers,
        recentProducts
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Admin)
const getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    // Build query
    let query = {};
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex }
      ];
    }

    if (req.query.role) {
      query.role = req.query.role;
    }

    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === 'true';
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit)
      .populate('orderHistory', 'orderNumber totalAmount')
      .lean();

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      },
      users
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user by ID
// @route   GET /api/admin/users/:id
// @access  Private (Admin)
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('orderHistory')
      .populate('wishlist', 'name price images');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's order statistics
    const orderStats = await Order.aggregate([
      { $match: { user: user._id } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$totalAmount' },
          avgOrderValue: { $avg: '$totalAmount' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      user,
      orderStats: orderStats[0] || {
        totalOrders: 0,
        totalSpent: 0,
        avgOrderValue: 0
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user status
// @route   PUT /api/admin/users/:id/status
// @access  Private (Admin)
const updateUserStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin)
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user has orders
    const orderCount = await Order.countDocuments({ user: user._id });
    if (orderCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete user with existing orders. Deactivate instead.'
      });
    }

    // Delete user's cart
    await Cart.deleteOne({ user: user._id });

    // Delete user
    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create product
// @route   POST /api/admin/products
// @access  Private (Admin)
const createProduct = async (req, res, next) => {
  try {
    const product = await Product.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update product
// @route   PUT /api/admin/products/:id
// @access  Private (Admin)
const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete product
// @route   DELETE /api/admin/products/:id
// @access  Private (Admin)
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if product is in any pending orders
    const pendingOrders = await Order.countDocuments({
      'items.product': product._id,
      orderStatus: { $in: ['pending', 'confirmed', 'processing'] }
    });

    if (pendingOrders > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete product with pending orders. Mark as inactive instead.'
      });
    }

    // Remove from all carts
    await Cart.updateMany(
      { 'items.product': product._id },
      { $pull: { items: { product: product._id } } }
    );

    // Remove from all wishlists
    await User.updateMany(
      { wishlist: product._id },
      { $pull: { wishlist: product._id } }
    );

    // Delete product
    await Product.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all orders
// @route   GET /api/admin/orders
// @access  Private (Admin)
const getAllOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    // Build query
    let query = {};
    if (req.query.status) {
      query.orderStatus = req.query.status;
    }

    if (req.query.paymentStatus) {
      query.paymentStatus = req.query.paymentStatus;
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.$or = [
        { orderNumber: searchRegex }
      ];
    }

    // Date range filter
    if (req.query.startDate || req.query.endDate) {
      query.createdAt = {};
      if (req.query.startDate) {
        query.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        query.createdAt.$lte = new Date(req.query.endDate);
      }
    }

    const orders = await Order.find(query)
      .populate('user', 'firstName lastName email')
      .populate('items.product', 'name images')
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    const total = await Order.countDocuments(query);

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      },
      orders
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status
// @route   PUT /api/admin/orders/:id/status
// @access  Private (Admin)
const updateOrderStatus = async (req, res, next) => {
  try {
    const { orderStatus, trackingNumber, notes } = req.body;

    const order = await Order.findById(req.params.id)
      .populate('user', 'firstName lastName email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Update order status
    const oldStatus = order.orderStatus;
    order.orderStatus = orderStatus;

    if (trackingNumber) {
      order.trackingNumber = trackingNumber;
    }

    if (notes) {
      order.notes = notes;
    }

    // Add tracking entry
    order.addTrackingEntry(orderStatus, notes || `Order status updated to ${orderStatus} by admin`);

    // Handle specific status changes
    if (orderStatus === 'delivered' && oldStatus !== 'delivered') {
      order.actualDeliveryDate = new Date();
    }

    await order.save();

    // Send email notification based on status change
    const { sendTemplateEmail } = require('../utils/sendEmail');
    
    if (orderStatus === 'shipped' && oldStatus !== 'shipped') {
      try {
        await sendTemplateEmail('orderShipped', order.user.email, order);
      } catch (emailError) {
        console.error('Failed to send shipping notification:', emailError);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      order
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getRecentActivity,
  getAllUsers,
  getUserById,
  updateUserStatus,
  deleteUser,
  createProduct,
  updateProduct,
  deleteProduct,
  getAllOrders,
  updateOrderStatus
};