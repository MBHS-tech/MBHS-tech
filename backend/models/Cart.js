const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
    default: 1
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative']
  },
  selectedVariants: [{
    name: String, // e.g., "Size"
    value: String // e.g., "Large"
  }]
}, {
  timestamps: true
});

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [cartItemSchema],
  totalItems: {
    type: Number,
    default: 0
  },
  totalPrice: {
    type: Number,
    default: 0
  },
  discountCode: {
    code: String,
    discountAmount: {
      type: Number,
      default: 0
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'percentage'
    }
  },
  finalPrice: {
    type: Number,
    default: 0
  },
  lastModified: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Update totals before saving
cartSchema.pre('save', function(next) {
  this.totalItems = this.items.reduce((total, item) => total + item.quantity, 0);
  this.totalPrice = this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  
  // Apply discount if exists
  let discountAmount = 0;
  if (this.discountCode && this.discountCode.code) {
    if (this.discountCode.discountType === 'percentage') {
      discountAmount = (this.totalPrice * this.discountCode.discountAmount) / 100;
    } else {
      discountAmount = this.discountCode.discountAmount;
    }
  }
  
  this.finalPrice = Math.max(0, this.totalPrice - discountAmount);
  this.lastModified = new Date();
  next();
});

// Method to add item to cart
cartSchema.methods.addItem = function(productId, quantity, price, variants = []) {
  const existingItemIndex = this.items.findIndex(item => 
    item.product.toString() === productId.toString() &&
    JSON.stringify(item.selectedVariants) === JSON.stringify(variants)
  );

  if (existingItemIndex > -1) {
    // Update quantity if item exists
    this.items[existingItemIndex].quantity += quantity;
  } else {
    // Add new item
    this.items.push({
      product: productId,
      quantity,
      price,
      selectedVariants: variants
    });
  }
};

// Method to update item quantity
cartSchema.methods.updateItemQuantity = function(itemId, quantity) {
  const item = this.items.id(itemId);
  if (item) {
    if (quantity <= 0) {
      this.items.pull(itemId);
    } else {
      item.quantity = quantity;
    }
  }
};

// Method to remove item
cartSchema.methods.removeItem = function(itemId) {
  this.items.pull(itemId);
};

// Method to clear cart
cartSchema.methods.clearCart = function() {
  this.items = [];
  this.discountCode = undefined;
};

// Method to apply discount
cartSchema.methods.applyDiscount = function(code, amount, type = 'percentage') {
  this.discountCode = {
    code,
    discountAmount: amount,
    discountType: type
  };
};

// Method to remove discount
cartSchema.methods.removeDiscount = function() {
  this.discountCode = undefined;
};

// Virtual for cart summary
cartSchema.virtual('summary').get(function() {
  return {
    totalItems: this.totalItems,
    totalPrice: this.totalPrice,
    discountAmount: this.discountCode ? 
      (this.discountCode.discountType === 'percentage' ? 
        (this.totalPrice * this.discountCode.discountAmount) / 100 : 
        this.discountCode.discountAmount) : 0,
    finalPrice: this.finalPrice
  };
});

// Index for better performance
cartSchema.index({ user: 1 });

module.exports = mongoose.model('Cart', cartSchema);