# E-Commerce Website - Full Stack

A modern, responsive e-commerce platform built with React and Node.js.

## 🚀 Features

### Frontend
- Responsive design (desktop, tablet, mobile)
- Product listing with filters and categories
- Product detail pages with image gallery and reviews
- Shopping cart functionality
- User authentication (signup/login/logout)
- User dashboard with order history
- Checkout process with payment integration
- Admin panel for product and order management

### Backend
- RESTful API with Express.js
- User authentication with JWT
- Product management (CRUD operations)
- Shopping cart API
- Order processing system
- Payment integration with Stripe
- Email notifications
- MongoDB database integration

## 🛠️ Tech Stack

### Frontend
- React 18 with hooks
- React Router for navigation
- Axios for API calls
- Tailwind CSS for styling
- React Context for state management

### Backend
- Node.js with Express.js
- MongoDB with Mongoose
- JWT for authentication
- bcrypt for password hashing
- Stripe for payments
- Nodemailer for emails
- Express Validator for input validation

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

## 🔧 Environment Variables

Create `.env` files in both frontend and backend directories:

### Backend (.env)
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ecommerce
JWT_SECRET=your_jwt_secret_key
STRIPE_SECRET_KEY=your_stripe_secret_key
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

## 🚀 Deployment

### Docker
```bash
docker-compose up -d
```

### Manual Deployment
- Frontend: Deploy to Vercel/Netlify
- Backend: Deploy to Render/Heroku/DigitalOcean

## 📱 API Documentation

The API includes the following endpoints:

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (admin)
- `PUT /api/products/:id` - Update product (admin)
- `DELETE /api/products/:id` - Delete product (admin)

### Cart
- `GET /api/cart` - Get user cart
- `POST /api/cart/add` - Add item to cart
- `PUT /api/cart/update` - Update cart item
- `DELETE /api/cart/remove` - Remove cart item

### Orders
- `GET /api/orders` - Get user orders
- `POST /api/orders` - Create new order
- `GET /api/orders/:id` - Get order details

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 📄 License

MIT License - see LICENSE file for details.