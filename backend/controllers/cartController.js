const Cart = require('../models/Cart');
const Product = require('../models/Product');

// @desc    Get user cart
// @route   GET /api/cart
// @access  Private
const getCart = async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id })
      .populate({
        path: 'items.product',
        select: 'name price images inventory stockStatus'
      });

    if (!cart) {
      // Create empty cart if it doesn't exist
      cart = new Cart({ user: req.user.id, items: [] });
      await cart.save();
    }

    // Check product availability and update prices
    let cartUpdated = false;
    cart.items = cart.items.filter(item => {
      if (!item.product) {
        cartUpdated = true;
        return false; // Remove items with deleted products
      }

      // Update price if it has changed
      if (item.price !== item.product.price) {
        item.price = item.product.price;
        cartUpdated = true;
      }

      // Check stock availability
      if (item.product.inventory.trackQuantity && 
          item.product.inventory.quantity < item.quantity) {
        item.quantity = Math.max(1, item.product.inventory.quantity);
        cartUpdated = true;
      }

      return true;
    });

    if (cartUpdated) {
      await cart.save();
    }

    res.status(200).json({
      success: true,
      cart: {
        id: cart._id,
        items: cart.items,
        totalItems: cart.totalItems,
        totalPrice: cart.totalPrice,
        discountCode: cart.discountCode,
        finalPrice: cart.finalPrice,
        summary: cart.summary
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add item to cart
// @route   POST /api/cart/add
// @access  Private
const addToCart = async (req, res, next) => {
  try {
    const { productId, quantity = 1, selectedVariants = [] } = req.body;

    // Verify product exists and is active
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or not available'
      });
    }

    // Check stock availability
    if (product.inventory.trackQuantity && product.inventory.quantity < quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.inventory.quantity} items available in stock`
      });
    }

    // Get or create cart
    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      cart = new Cart({ user: req.user.id, items: [] });
    }

    // Add item to cart
    cart.addItem(productId, quantity, product.price, selectedVariants);
    await cart.save();

    // Populate cart for response
    await cart.populate({
      path: 'items.product',
      select: 'name price images inventory'
    });

    res.status(200).json({
      success: true,
      message: 'Item added to cart successfully',
      cart: {
        id: cart._id,
        items: cart.items,
        totalItems: cart.totalItems,
        totalPrice: cart.totalPrice,
        finalPrice: cart.finalPrice
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update cart item quantity
// @route   PUT /api/cart/update/:itemId
// @access  Private
const updateCartItem = async (req, res, next) => {
  try {
    const { quantity } = req.body;
    const { itemId } = req.params;

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    const cartItem = cart.items.id(itemId);
    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found'
      });
    }

    // Verify product still exists and check stock
    const product = await Product.findById(cartItem.product);
    if (!product || !product.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Product is no longer available'
      });
    }

    if (product.inventory.trackQuantity && product.inventory.quantity < quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.inventory.quantity} items available in stock`
      });
    }

    // Update quantity
    cart.updateItemQuantity(itemId, quantity);
    await cart.save();

    // Populate cart for response
    await cart.populate({
      path: 'items.product',
      select: 'name price images inventory'
    });

    res.status(200).json({
      success: true,
      message: 'Cart item updated successfully',
      cart: {
        id: cart._id,
        items: cart.items,
        totalItems: cart.totalItems,
        totalPrice: cart.totalPrice,
        finalPrice: cart.finalPrice
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/remove/:itemId
// @access  Private
const removeFromCart = async (req, res, next) => {
  try {
    const { itemId } = req.params;

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    const cartItem = cart.items.id(itemId);
    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found'
      });
    }

    // Remove item from cart
    cart.removeItem(itemId);
    await cart.save();

    // Populate cart for response
    await cart.populate({
      path: 'items.product',
      select: 'name price images inventory'
    });

    res.status(200).json({
      success: true,
      message: 'Item removed from cart successfully',
      cart: {
        id: cart._id,
        items: cart.items,
        totalItems: cart.totalItems,
        totalPrice: cart.totalPrice,
        finalPrice: cart.finalPrice
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Clear cart
// @route   DELETE /api/cart/clear
// @access  Private
const clearCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    cart.clearCart();
    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Cart cleared successfully',
      cart: {
        id: cart._id,
        items: cart.items,
        totalItems: cart.totalItems,
        totalPrice: cart.totalPrice,
        finalPrice: cart.finalPrice
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Apply discount code
// @route   POST /api/cart/discount
// @access  Private
const applyDiscount = async (req, res, next) => {
  try {
    const { code } = req.body;

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    if (cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot apply discount to empty cart'
      });
    }

    // Simple discount validation (in real app, you'd have a Discount model)
    const discountCodes = {
      'SAVE10': { type: 'percentage', amount: 10 },
      'WELCOME20': { type: 'percentage', amount: 20 },
      'FLAT50': { type: 'fixed', amount: 50 },
      'NEWUSER': { type: 'percentage', amount: 15 }
    };

    const discount = discountCodes[code.toUpperCase()];
    if (!discount) {
      return res.status(400).json({
        success: false,
        message: 'Invalid discount code'
      });
    }

    // Apply discount
    cart.applyDiscount(code.toUpperCase(), discount.amount, discount.type);
    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Discount applied successfully',
      cart: {
        id: cart._id,
        items: cart.items,
        totalItems: cart.totalItems,
        totalPrice: cart.totalPrice,
        discountCode: cart.discountCode,
        finalPrice: cart.finalPrice,
        summary: cart.summary
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove discount code
// @route   DELETE /api/cart/discount
// @access  Private
const removeDiscount = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    cart.removeDiscount();
    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Discount removed successfully',
      cart: {
        id: cart._id,
        items: cart.items,
        totalItems: cart.totalItems,
        totalPrice: cart.totalPrice,
        discountCode: cart.discountCode,
        finalPrice: cart.finalPrice
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get cart summary
// @route   GET /api/cart/summary
// @access  Private
const getCartSummary = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    
    if (!cart) {
      return res.status(200).json({
        success: true,
        summary: {
          totalItems: 0,
          totalPrice: 0,
          discountAmount: 0,
          finalPrice: 0
        }
      });
    }

    res.status(200).json({
      success: true,
      summary: cart.summary
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Sync cart with updated product prices
// @route   POST /api/cart/sync
// @access  Private
const syncCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id })
      .populate('items.product');

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    let cartUpdated = false;
    const updatedItems = [];

    for (let item of cart.items) {
      if (!item.product || !item.product.isActive) {
        // Remove items with deleted or inactive products
        cartUpdated = true;
        continue;
      }

      // Update price if it has changed
      if (item.price !== item.product.price) {
        item.price = item.product.price;
        cartUpdated = true;
        updatedItems.push({
          itemId: item._id,
          productName: item.product.name,
          oldPrice: item.price,
          newPrice: item.product.price
        });
      }

      // Check stock and adjust quantity if needed
      if (item.product.inventory.trackQuantity && 
          item.product.inventory.quantity < item.quantity) {
        const oldQuantity = item.quantity;
        item.quantity = Math.max(1, item.product.inventory.quantity);
        cartUpdated = true;
        updatedItems.push({
          itemId: item._id,
          productName: item.product.name,
          message: `Quantity reduced from ${oldQuantity} to ${item.quantity} due to stock availability`
        });
      }
    }

    if (cartUpdated) {
      await cart.save();
    }

    res.status(200).json({
      success: true,
      message: cartUpdated ? 'Cart synced successfully' : 'Cart is already up to date',
      updatedItems,
      cart: {
        id: cart._id,
        items: cart.items,
        totalItems: cart.totalItems,
        totalPrice: cart.totalPrice,
        finalPrice: cart.finalPrice
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  applyDiscount,
  removeDiscount,
  getCartSummary,
  syncCart
};