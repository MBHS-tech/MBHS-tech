const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  image: String,
  price: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  selectedVariants: [{
    name: String,
    value: String
  }]
});

const shippingAddressSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  street: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  zipCode: {
    type: String,
    required: true
  },
  country: {
    type: String,
    required: true
  },
  phone: String
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [orderItemSchema],
  shippingAddress: {
    type: shippingAddressSchema,
    required: true
  },
  billingAddress: shippingAddressSchema,
  paymentMethod: {
    type: String,
    required: true,
    enum: ['stripe', 'paypal', 'cash_on_delivery']
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentDetails: {
    stripePaymentIntentId: String,
    paypalOrderId: String,
    transactionId: String,
    paymentDate: Date
  },
  orderStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'],
    default: 'pending'
  },
  orderTracking: [{
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned']
    },
    message: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  tax: {
    type: Number,
    default: 0,
    min: 0
  },
  shippingCost: {
    type: Number,
    default: 0,
    min: 0
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  discountCode: String,
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD',
    uppercase: true
  },
  notes: String,
  estimatedDeliveryDate: Date,
  actualDeliveryDate: Date,
  shippingMethod: {
    type: String,
    enum: ['standard', 'express', 'overnight'],
    default: 'standard'
  },
  trackingNumber: String,
  returnRequested: {
    type: Boolean,
    default: false
  },
  returnReason: String,
  returnStatus: {
    type: String,
    enum: ['none', 'requested', 'approved', 'rejected', 'completed'],
    default: 'none'
  },
  refundAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  isGift: {
    type: Boolean,
    default: false
  },
  giftMessage: String,
  customerNotes: String
}, {
  timestamps: true
});

// Indexes for better performance
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });

// Generate order number before saving
orderSchema.pre('save', function(next) {
  if (this.isNew && !this.orderNumber) {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.orderNumber = `ORD-${timestamp.slice(-8)}-${random}`;
  }
  next();
});

// Add tracking entry when status changes
orderSchema.pre('save', function(next) {
  if (this.isModified('orderStatus') && !this.isNew) {
    this.orderTracking.push({
      status: this.orderStatus,
      message: `Order status updated to ${this.orderStatus}`,
      timestamp: new Date()
    });
  }
  next();
});

// Calculate estimated delivery date
orderSchema.methods.calculateEstimatedDelivery = function() {
  const baseDate = new Date();
  let daysToAdd = 7; // Standard shipping

  switch (this.shippingMethod) {
    case 'express':
      daysToAdd = 3;
      break;
    case 'overnight':
      daysToAdd = 1;
      break;
    default:
      daysToAdd = 7;
  }

  this.estimatedDeliveryDate = new Date(baseDate.getTime() + (daysToAdd * 24 * 60 * 60 * 1000));
};

// Method to add tracking entry
orderSchema.methods.addTrackingEntry = function(status, message) {
  this.orderTracking.push({
    status,
    message: message || `Order status updated to ${status}`,
    timestamp: new Date()
  });
  this.orderStatus = status;
};

// Method to calculate totals
orderSchema.methods.calculateTotals = function() {
  this.subtotal = this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  this.totalAmount = this.subtotal + this.tax + this.shippingCost - this.discountAmount;
};

// Virtual for order summary
orderSchema.virtual('summary').get(function() {
  return {
    orderNumber: this.orderNumber,
    totalItems: this.items.reduce((total, item) => total + item.quantity, 0),
    subtotal: this.subtotal,
    tax: this.tax,
    shippingCost: this.shippingCost,
    discountAmount: this.discountAmount,
    totalAmount: this.totalAmount,
    orderStatus: this.orderStatus,
    paymentStatus: this.paymentStatus
  };
});

// Virtual for latest tracking
orderSchema.virtual('latestTracking').get(function() {
  if (this.orderTracking && this.orderTracking.length > 0) {
    return this.orderTracking[this.orderTracking.length - 1];
  }
  return null;
});

// Virtual for days since order
orderSchema.virtual('daysSinceOrder').get(function() {
  const diffTime = Math.abs(new Date() - this.createdAt);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

module.exports = mongoose.model('Order', orderSchema);