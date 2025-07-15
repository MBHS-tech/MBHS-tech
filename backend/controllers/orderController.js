const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const User = require('../models/User');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = async (req, res, next) => {
  try {
    const {
      shippingAddress,
      billingAddress,
      paymentMethod,
      shippingMethod = 'standard',
      customerNotes,
      isGift = false,
      giftMessage
    } = req.body;

    // Get user's cart
    const cart = await Cart.findOne({ user: req.user.id })
      .populate('items.product');

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Your cart is empty'
      });
    }

    // Validate stock availability and prepare order items
    const orderItems = [];
    let subtotal = 0;

    for (const cartItem of cart.items) {
      const product = cartItem.product;

      if (!product || !product.isActive) {
        return res.status(400).json({
          success: false,
          message: `Product "${product?.name || 'Unknown'}" is no longer available`
        });
      }

      // Check stock
      if (product.inventory.trackQuantity && 
          product.inventory.quantity < cartItem.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.name}". Only ${product.inventory.quantity} available.`
        });
      }

      // Prepare order item
      const orderItem = {
        product: product._id,
        name: product.name,
        image: product.images[0]?.url || '',
        price: product.price, // Use current product price
        quantity: cartItem.quantity,
        selectedVariants: cartItem.selectedVariants
      };

      orderItems.push(orderItem);
      subtotal += orderItem.price * orderItem.quantity;
    }

    // Calculate totals
    const tax = subtotal * 0.08; // 8% tax rate (can be configurable)
    let shippingCost = 0;
    
    switch (shippingMethod) {
      case 'express':
        shippingCost = 15;
        break;
      case 'overnight':
        shippingCost = 25;
        break;
      default:
        shippingCost = subtotal > 100 ? 0 : 10; // Free shipping over $100
    }

    // Apply cart discount if exists
    let discountAmount = 0;
    let discountCode = '';
    if (cart.discountCode && cart.discountCode.code) {
      discountCode = cart.discountCode.code;
      if (cart.discountCode.discountType === 'percentage') {
        discountAmount = (subtotal * cart.discountCode.discountAmount) / 100;
      } else {
        discountAmount = cart.discountCode.discountAmount;
      }
    }

    const totalAmount = subtotal + tax + shippingCost - discountAmount;

    // Create order
    const order = new Order({
      user: req.user.id,
      items: orderItems,
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      paymentMethod,
      subtotal,
      tax,
      shippingCost,
      discountAmount,
      discountCode,
      totalAmount,
      shippingMethod,
      customerNotes,
      isGift,
      giftMessage
    });

    // Calculate estimated delivery
    order.calculateEstimatedDelivery();

    // Handle payment based on method
    if (paymentMethod === 'stripe') {
      // Create Stripe payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(totalAmount * 100), // Amount in cents
        currency: 'usd',
        metadata: {
          orderId: order._id.toString(),
          userId: req.user.id
        }
      });

      order.paymentDetails.stripePaymentIntentId = paymentIntent.id;
      order.paymentStatus = 'pending';
    } else if (paymentMethod === 'cash_on_delivery') {
      order.paymentStatus = 'pending';
      order.orderStatus = 'confirmed';
    }

    await order.save();

    // Update product inventory
    for (const cartItem of cart.items) {
      const product = cartItem.product;
      if (product.inventory.trackQuantity) {
        product.inventory.quantity -= cartItem.quantity;
        product.salesCount += cartItem.quantity;
        await product.save();
      }
    }

    // Add order to user's order history
    await User.findByIdAndUpdate(req.user.id, {
      $push: { orderHistory: order._id }
    });

    // Clear user's cart
    cart.clearCart();
    await cart.save();

    // Populate order for response
    await order.populate([
      { path: 'items.product', select: 'name images' },
      { path: 'user', select: 'firstName lastName email' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        items: order.items,
        shippingAddress: order.shippingAddress,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        subtotal: order.subtotal,
        tax: order.tax,
        shippingCost: order.shippingCost,
        discountAmount: order.discountAmount,
        totalAmount: order.totalAmount,
        estimatedDeliveryDate: order.estimatedDeliveryDate,
        paymentDetails: paymentMethod === 'stripe' ? {
          clientSecret: order.paymentDetails.stripePaymentIntentId ? 
            (await stripe.paymentIntents.retrieve(order.paymentDetails.stripePaymentIntentId)).client_secret : null
        } : null,
        createdAt: order.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user orders
// @route   GET /api/orders
// @access  Private
const getUserOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    const orders = await Order.find({ user: req.user.id })
      .populate('items.product', 'name images')
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    const total = await Order.countDocuments({ user: req.user.id });

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

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
const getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.product', 'name images slug')
      .populate('user', 'firstName lastName email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user owns the order or is admin
    if (order.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this order'
      });
    }

    res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private
const cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.product');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user owns the order
    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this order'
      });
    }

    // Check if order can be cancelled
    if (!['pending', 'confirmed'].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Order cannot be cancelled at this stage'
      });
    }

    // Restore inventory
    for (const item of order.items) {
      if (item.product && item.product.inventory.trackQuantity) {
        item.product.inventory.quantity += item.quantity;
        item.product.salesCount -= item.quantity;
        await item.product.save();
      }
    }

    // Update order status
    order.addTrackingEntry('cancelled', 'Order cancelled by customer');
    await order.save();

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Confirm stripe payment
// @route   POST /api/orders/:id/confirm-payment
// @access  Private
const confirmStripePayment = async (req, res, next) => {
  try {
    const { paymentIntentId } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user owns the order
    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this order'
      });
    }

    // Verify payment with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status === 'succeeded') {
      order.paymentStatus = 'paid';
      order.orderStatus = 'confirmed';
      order.paymentDetails.paymentDate = new Date();
      order.paymentDetails.transactionId = paymentIntent.id;
      
      order.addTrackingEntry('confirmed', 'Payment received and order confirmed');
      await order.save();

      res.status(200).json({
        success: true,
        message: 'Payment confirmed successfully',
        order
      });
    } else {
      order.paymentStatus = 'failed';
      await order.save();

      res.status(400).json({
        success: false,
        message: 'Payment failed'
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Track order
// @route   GET /api/orders/:id/track
// @access  Private
const trackOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .select('orderNumber orderStatus orderTracking estimatedDeliveryDate actualDeliveryDate trackingNumber');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user owns the order or is admin
    if (order.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to track this order'
      });
    }

    res.status(200).json({
      success: true,
      tracking: {
        orderNumber: order.orderNumber,
        currentStatus: order.orderStatus,
        trackingNumber: order.trackingNumber,
        estimatedDeliveryDate: order.estimatedDeliveryDate,
        actualDeliveryDate: order.actualDeliveryDate,
        timeline: order.orderTracking.sort((a, b) => a.timestamp - b.timestamp)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Request return
// @route   POST /api/orders/:id/return
// @access  Private
const requestReturn = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user owns the order
    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to return this order'
      });
    }

    // Check if order is eligible for return
    if (order.orderStatus !== 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Order must be delivered to request a return'
      });
    }

    // Check if return window is still open (30 days)
    const daysSinceDelivery = Math.ceil((new Date() - order.actualDeliveryDate) / (1000 * 60 * 60 * 24));
    if (daysSinceDelivery > 30) {
      return res.status(400).json({
        success: false,
        message: 'Return window has expired (30 days from delivery)'
      });
    }

    if (order.returnRequested) {
      return res.status(400).json({
        success: false,
        message: 'Return has already been requested for this order'
      });
    }

    // Update order with return request
    order.returnRequested = true;
    order.returnReason = reason;
    order.returnStatus = 'requested';
    order.addTrackingEntry('returned', `Return requested: ${reason}`);

    await order.save();

    res.status(200).json({
      success: true,
      message: 'Return request submitted successfully',
      order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get order by number (for order lookup)
// @route   GET /api/orders/lookup/:orderNumber
// @access  Public (with email verification)
const getOrderByNumber = async (req, res, next) => {
  try {
    const { orderNumber } = req.params;
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required for order lookup'
      });
    }

    const order = await Order.findOne({ orderNumber })
      .populate('items.product', 'name images')
      .populate('user', 'email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Verify email matches
    if (order.user.email.toLowerCase() !== email.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: 'Email does not match order records'
      });
    }

    res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  getUserOrders,
  getOrder,
  cancelOrder,
  confirmStripePayment,
  trackOrder,
  requestReturn,
  getOrderByNumber
};