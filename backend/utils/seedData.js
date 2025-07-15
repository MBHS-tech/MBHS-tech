const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Cart = require('../models/Cart');

// Load environment variables
dotenv.config();

// Sample products data
const sampleProducts = [
  {
    name: 'Premium Wireless Headphones',
    description: 'High-quality wireless headphones with noise cancellation and 30-hour battery life. Perfect for music lovers and professionals.',
    shortDescription: 'Premium wireless headphones with noise cancellation',
    price: 299.99,
    comparePrice: 399.99,
    category: 'Electronics',
    subcategory: 'Audio',
    brand: 'TechSound',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
        altText: 'Premium Wireless Headphones',
        isMain: true
      },
      {
        url: 'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=500',
        altText: 'Headphones Side View'
      }
    ],
    inventory: {
      quantity: 50,
      lowStockThreshold: 10,
      trackQuantity: true
    },
    attributes: [
      { name: 'Battery Life', value: '30 hours' },
      { name: 'Connectivity', value: 'Bluetooth 5.0' },
      { name: 'Weight', value: '250g' }
    ],
    variants: [
      {
        name: 'Color',
        options: ['Black', 'White', 'Blue']
      }
    ],
    tags: ['wireless', 'bluetooth', 'noise-cancellation', 'premium'],
    featured: true,
    isActive: true
  },
  {
    name: 'Organic Cotton T-Shirt',
    description: 'Comfortable and sustainable organic cotton t-shirt. Available in multiple colors and sizes.',
    shortDescription: 'Comfortable organic cotton t-shirt',
    price: 29.99,
    comparePrice: 39.99,
    category: 'Clothing',
    subcategory: 'T-Shirts',
    brand: 'EcoWear',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500',
        altText: 'Organic Cotton T-Shirt',
        isMain: true
      }
    ],
    inventory: {
      quantity: 100,
      lowStockThreshold: 20,
      trackQuantity: true
    },
    variants: [
      {
        name: 'Size',
        options: ['XS', 'S', 'M', 'L', 'XL', 'XXL']
      },
      {
        name: 'Color',
        options: ['White', 'Black', 'Navy', 'Gray', 'Red']
      }
    ],
    tags: ['organic', 'cotton', 'sustainable', 'comfortable'],
    featured: true,
    isActive: true
  },
  {
    name: 'Smart Fitness Watch',
    description: 'Advanced fitness tracker with heart rate monitoring, GPS, and 7-day battery life. Track your workouts and health metrics.',
    shortDescription: 'Smart fitness watch with GPS and heart rate monitoring',
    price: 199.99,
    comparePrice: 249.99,
    category: 'Electronics',
    subcategory: 'Wearables',
    brand: 'FitTech',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1544117519-31a4b719223d?w=500',
        altText: 'Smart Fitness Watch',
        isMain: true
      }
    ],
    inventory: {
      quantity: 30,
      lowStockThreshold: 5,
      trackQuantity: true
    },
    attributes: [
      { name: 'Battery Life', value: '7 days' },
      { name: 'Water Resistance', value: '50m' },
      { name: 'Display', value: '1.4" AMOLED' }
    ],
    variants: [
      {
        name: 'Color',
        options: ['Black', 'White', 'Silver']
      },
      {
        name: 'Band Material',
        options: ['Silicone', 'Leather', 'Steel']
      }
    ],
    tags: ['fitness', 'smartwatch', 'gps', 'health'],
    featured: true,
    isActive: true
  },
  {
    name: 'Professional Coffee Maker',
    description: 'Programmable drip coffee maker with thermal carafe. Brews perfect coffee every time with customizable strength settings.',
    shortDescription: 'Professional drip coffee maker with thermal carafe',
    price: 149.99,
    category: 'Home & Garden',
    subcategory: 'Kitchen Appliances',
    brand: 'BrewMaster',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=500',
        altText: 'Professional Coffee Maker',
        isMain: true
      }
    ],
    inventory: {
      quantity: 25,
      lowStockThreshold: 5,
      trackQuantity: true
    },
    attributes: [
      { name: 'Capacity', value: '12 cups' },
      { name: 'Material', value: 'Stainless Steel' },
      { name: 'Programmable', value: 'Yes' }
    ],
    tags: ['coffee', 'kitchen', 'programmable', 'thermal'],
    isActive: true
  },
  {
    name: 'Yoga Mat Premium',
    description: 'High-quality non-slip yoga mat made from eco-friendly materials. Perfect for yoga, pilates, and meditation.',
    shortDescription: 'Premium non-slip yoga mat',
    price: 79.99,
    comparePrice: 99.99,
    category: 'Sports',
    subcategory: 'Fitness Equipment',
    brand: 'ZenFit',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1506629905738-4e9c56653833?w=500',
        altText: 'Premium Yoga Mat',
        isMain: true
      }
    ],
    inventory: {
      quantity: 40,
      lowStockThreshold: 10,
      trackQuantity: true
    },
    dimensions: {
      length: 183,
      width: 61,
      height: 0.6,
      unit: 'cm'
    },
    variants: [
      {
        name: 'Color',
        options: ['Purple', 'Blue', 'Green', 'Pink', 'Black']
      },
      {
        name: 'Thickness',
        options: ['4mm', '6mm', '8mm']
      }
    ],
    tags: ['yoga', 'fitness', 'eco-friendly', 'non-slip'],
    isActive: true
  },
  {
    name: 'Skincare Essential Set',
    description: 'Complete skincare routine set with cleanser, toner, serum, and moisturizer. Suitable for all skin types.',
    shortDescription: 'Complete skincare routine set',
    price: 89.99,
    comparePrice: 120.00,
    category: 'Beauty',
    subcategory: 'Skincare',
    brand: 'GlowLabs',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500',
        altText: 'Skincare Essential Set',
        isMain: true
      }
    ],
    inventory: {
      quantity: 60,
      lowStockThreshold: 15,
      trackQuantity: true
    },
    attributes: [
      { name: 'Skin Type', value: 'All Types' },
      { name: 'Set Contents', value: '4 Products' },
      { name: 'Cruelty Free', value: 'Yes' }
    ],
    tags: ['skincare', 'beauty', 'cruelty-free', 'routine'],
    featured: true,
    isActive: true
  },
  {
    name: 'Classic Leather Wallet',
    description: 'Handcrafted genuine leather wallet with multiple card slots and coin pocket. Timeless design that ages beautifully.',
    shortDescription: 'Handcrafted genuine leather wallet',
    price: 59.99,
    category: 'Clothing',
    subcategory: 'Accessories',
    brand: 'LeatherCraft',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500',
        altText: 'Classic Leather Wallet',
        isMain: true
      }
    ],
    inventory: {
      quantity: 35,
      lowStockThreshold: 8,
      trackQuantity: true
    },
    variants: [
      {
        name: 'Color',
        options: ['Brown', 'Black', 'Tan']
      }
    ],
    tags: ['leather', 'wallet', 'handcrafted', 'accessories'],
    isActive: true
  },
  {
    name: 'LED Desk Lamp',
    description: 'Adjustable LED desk lamp with touch controls and USB charging port. Perfect for home office or study.',
    shortDescription: 'Adjustable LED desk lamp with USB charging',
    price: 45.99,
    category: 'Home & Garden',
    subcategory: 'Lighting',
    brand: 'BrightSpace',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=500',
        altText: 'LED Desk Lamp',
        isMain: true
      }
    ],
    inventory: {
      quantity: 45,
      lowStockThreshold: 10,
      trackQuantity: true
    },
    attributes: [
      { name: 'Light Type', value: 'LED' },
      { name: 'Power', value: '12W' },
      { name: 'USB Port', value: 'Yes' }
    ],
    variants: [
      {
        name: 'Color',
        options: ['White', 'Black', 'Silver']
      }
    ],
    tags: ['led', 'desk', 'lamp', 'office', 'usb'],
    isActive: true
  }
];

// Sample users data
const sampleUsers = [
  {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    password: 'password123',
    phone: '+1234567890',
    role: 'user',
    isEmailVerified: true,
    isActive: true,
    addresses: [
      {
        type: 'shipping',
        firstName: 'John',
        lastName: 'Doe',
        street: '123 Main Street',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'United States',
        isDefault: true
      }
    ]
  },
  {
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com',
    password: 'password123',
    phone: '+1234567891',
    role: 'user',
    isEmailVerified: true,
    isActive: true,
    addresses: [
      {
        type: 'shipping',
        firstName: 'Jane',
        lastName: 'Smith',
        street: '456 Oak Avenue',
        city: 'Los Angeles',
        state: 'CA',
        zipCode: '90210',
        country: 'United States',
        isDefault: true
      }
    ]
  },
  {
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@example.com',
    password: 'admin123',
    role: 'admin',
    isEmailVerified: true,
    isActive: true
  }
];

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('📊 MongoDB Connected for seeding');
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    process.exit(1);
  }
};

// Clear existing data
const clearData = async () => {
  try {
    await Order.deleteMany({});
    await Cart.deleteMany({});
    await Product.deleteMany({});
    await User.deleteMany({});
    console.log('🗑️ Existing data cleared');
  } catch (error) {
    console.error('❌ Error clearing data:', error.message);
    throw error;
  }
};

// Seed users
const seedUsers = async () => {
  try {
    // Hash passwords
    for (let user of sampleUsers) {
      const salt = await bcrypt.genSalt(12);
      user.password = await bcrypt.hash(user.password, salt);
    }

    const users = await User.insertMany(sampleUsers);
    console.log(`👥 ${users.length} users seeded`);
    return users;
  } catch (error) {
    console.error('❌ Error seeding users:', error.message);
    throw error;
  }
};

// Seed products
const seedProducts = async () => {
  try {
    const products = await Product.insertMany(sampleProducts);
    console.log(`📦 ${products.length} products seeded`);
    
    // Calculate average ratings for some products
    for (let i = 0; i < Math.min(5, products.length); i++) {
      const product = products[i];
      product.calculateAverageRating();
      await product.save();
    }

    return products;
  } catch (error) {
    console.error('❌ Error seeding products:', error.message);
    throw error;
  }
};

// Create sample orders
const createSampleOrders = async (users, products) => {
  try {
    const orders = [];
    const regularUsers = users.filter(user => user.role === 'user');

    for (let i = 0; i < 10; i++) {
      const user = regularUsers[Math.floor(Math.random() * regularUsers.length)];
      const numItems = Math.floor(Math.random() * 3) + 1; // 1-3 items per order
      const orderItems = [];
      let subtotal = 0;

      for (let j = 0; j < numItems; j++) {
        const product = products[Math.floor(Math.random() * products.length)];
        const quantity = Math.floor(Math.random() * 3) + 1; // 1-3 quantity
        
        orderItems.push({
          product: product._id,
          name: product.name,
          image: product.images[0]?.url || '',
          price: product.price,
          quantity
        });

        subtotal += product.price * quantity;
      }

      const tax = subtotal * 0.08;
      const shippingCost = subtotal > 100 ? 0 : 10;
      const totalAmount = subtotal + tax + shippingCost;

      const orderStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
      const paymentStatuses = ['pending', 'paid'];
      const shippingMethods = ['standard', 'express', 'overnight'];

      const order = new Order({
        user: user._id,
        items: orderItems,
        shippingAddress: user.addresses[0] || {
          firstName: user.firstName,
          lastName: user.lastName,
          street: '123 Sample Street',
          city: 'Sample City',
          state: 'SC',
          zipCode: '12345',
          country: 'United States'
        },
        paymentMethod: Math.random() > 0.3 ? 'stripe' : 'cash_on_delivery',
        paymentStatus: paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)],
        orderStatus: orderStatuses[Math.floor(Math.random() * orderStatuses.length)],
        subtotal,
        tax,
        shippingCost,
        totalAmount,
        shippingMethod: shippingMethods[Math.floor(Math.random() * shippingMethods.length)],
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random date within last 30 days
      });

      order.calculateEstimatedDelivery();
      orders.push(order);
    }

    const savedOrders = await Order.insertMany(orders);
    console.log(`📋 ${savedOrders.length} sample orders created`);
    return savedOrders;
  } catch (error) {
    console.error('❌ Error creating sample orders:', error.message);
    throw error;
  }
};

// Main seeding function
const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    await connectDB();
    await clearData();
    
    const users = await seedUsers();
    const products = await seedProducts();
    await createSampleOrders(users, products);
    
    console.log('✅ Database seeding completed successfully!');
    console.log('\n📋 Sample Login Credentials:');
    console.log('👤 Regular User: john.doe@example.com / password123');
    console.log('👤 Regular User: jane.smith@example.com / password123');
    console.log('👑 Admin User: admin@example.com / admin123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database seeding failed:', error.message);
    process.exit(1);
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = {
  seedDatabase,
  clearData,
  seedUsers,
  seedProducts,
  createSampleOrders
};