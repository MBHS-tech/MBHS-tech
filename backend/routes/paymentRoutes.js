const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const { authenticate } = require('../middleware/auth');
const Cart = require('../models/Cart');

// @desc    Create payment intent
// @route   POST /api/payment/create-intent
// @access  Private
const createPaymentIntent = async (req, res, next) => {
  try {
    const { amount, currency = 'usd' } = req.body;

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        userId: req.user.id
      }
    });

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create payment intent from cart
// @route   POST /api/payment/cart-intent
// @access  Private
const createCartPaymentIntent = async (req, res, next) => {
  try {
    // Get user's cart
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Calculate tax and shipping (simplified)
    const subtotal = cart.finalPrice;
    const tax = subtotal * 0.08; // 8% tax
    const shipping = subtotal > 100 ? 0 : 10; // Free shipping over $100
    const total = subtotal + tax + shipping;

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100), // Convert to cents
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        userId: req.user.id,
        cartId: cart._id.toString(),
        subtotal: subtotal.toString(),
        tax: tax.toString(),
        shipping: shipping.toString()
      }
    });

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      amount: total,
      breakdown: {
        subtotal,
        tax,
        shipping,
        total
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Confirm payment
// @route   POST /api/payment/confirm
// @access  Private
const confirmPayment = async (req, res, next) => {
  try {
    const { paymentIntentId } = req.body;

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      res.status(200).json({
        success: true,
        message: 'Payment confirmed',
        paymentIntent: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount / 100
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Payment not completed',
        status: paymentIntent.status
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Refund payment
// @route   POST /api/payment/refund
// @access  Private (Admin only)
const refundPayment = async (req, res, next) => {
  try {
    const { paymentIntentId, amount, reason } = req.body;

    // Create refund
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined, // If amount not specified, refund full amount
      reason: reason || 'requested_by_customer'
    });

    res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      refund: {
        id: refund.id,
        amount: refund.amount / 100,
        status: refund.status
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get payment methods
// @route   GET /api/payment/methods
// @access  Private
const getPaymentMethods = async (req, res, next) => {
  try {
    // This would typically get saved payment methods for the customer
    // For now, return available payment options
    res.status(200).json({
      success: true,
      methods: [
        {
          type: 'card',
          name: 'Credit/Debit Card',
          enabled: true
        },
        {
          type: 'paypal',
          name: 'PayPal',
          enabled: false // Not implemented in this demo
        },
        {
          type: 'cash_on_delivery',
          name: 'Cash on Delivery',
          enabled: true
        }
      ]
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Webhook for Stripe events
// @route   POST /api/payment/webhook
// @access  Public (Stripe webhook)
const stripeWebhook = async (req, res, next) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.log(`Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log(`PaymentIntent ${paymentIntent.id} succeeded!`);
      // Handle successful payment (update order status, send confirmation email, etc.)
      break;
    
    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      console.log(`PaymentIntent ${failedPayment.id} failed!`);
      // Handle failed payment
      break;
    
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
};

// Routes
router.use(authenticate); // Most routes require authentication

router.post('/create-intent', createPaymentIntent);
router.post('/cart-intent', createCartPaymentIntent);
router.post('/confirm', confirmPayment);
router.get('/methods', getPaymentMethods);

// Admin only routes
const { authorize } = require('../middleware/auth');
router.post('/refund', authorize('admin'), refundPayment);

// Webhook route (no authentication required)
router.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

module.exports = router;