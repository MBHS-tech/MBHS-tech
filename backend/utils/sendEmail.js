const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // Create reusable transporter object using SMTP transport
  const transporter = nodemailer.createTransporter({
    service: process.env.EMAIL_SERVICE || 'gmail',
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS // App specific password for Gmail
    }
  });

  // Define email options
  const mailOptions = {
    from: `"E-Commerce Store" <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html || generateDefaultHTML(options.subject, options.message)
  };

  // Send email
  const info = await transporter.sendMail(mailOptions);
  console.log('Email sent: ', info.messageId);
  return info;
};

// Generate default HTML template for emails
const generateDefaultHTML = (subject, message) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .container {
                background-color: #ffffff;
                padding: 30px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 2px solid #e1e1e1;
            }
            .logo {
                font-size: 24px;
                font-weight: bold;
                color: #2c3e50;
                margin-bottom: 10px;
            }
            .content {
                margin-bottom: 30px;
            }
            .button {
                display: inline-block;
                padding: 12px 24px;
                background-color: #3498db;
                color: #ffffff;
                text-decoration: none;
                border-radius: 5px;
                margin: 15px 0;
                font-weight: bold;
            }
            .footer {
                text-align: center;
                font-size: 12px;
                color: #777;
                border-top: 1px solid #e1e1e1;
                padding-top: 20px;
                margin-top: 30px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🛒 E-Commerce Store</div>
                <h2>${subject}</h2>
            </div>
            <div class="content">
                <p>${message.replace(/\n/g, '</p><p>')}</p>
            </div>
            <div class="footer">
                <p>© ${new Date().getFullYear()} E-Commerce Store. All rights reserved.</p>
                <p>If you have any questions, please contact our support team.</p>
            </div>
        </div>
    </body>
    </html>
  `;
};

// Email templates for different types of emails
const emailTemplates = {
  // Welcome email template
  welcome: (firstName) => ({
    subject: 'Welcome to E-Commerce Store!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Welcome ${firstName}!</h2>
        <p>Thank you for joining E-Commerce Store. We're excited to have you as a member of our community.</p>
        <p>Start exploring our amazing collection of products and enjoy your shopping experience!</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/products" style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Start Shopping</a>
        </div>
        <p>Best regards,<br>The E-Commerce Store Team</p>
      </div>
    `
  }),

  // Order confirmation template
  orderConfirmation: (order) => ({
    subject: `Order Confirmation - #${order.orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Order Confirmation</h2>
        <p>Hi ${order.user.firstName},</p>
        <p>Thank you for your order! We've received your order and it's being processed.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3>Order Details</h3>
          <p><strong>Order Number:</strong> ${order.orderNumber}</p>
          <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
          <p><strong>Total Amount:</strong> $${order.totalAmount.toFixed(2)}</p>
        </div>

        <h3>Items Ordered:</h3>
        ${order.items.map(item => `
          <div style="border-bottom: 1px solid #eee; padding: 10px 0;">
            <p><strong>${item.name}</strong></p>
            <p>Quantity: ${item.quantity} × $${item.price.toFixed(2)} = $${(item.quantity * item.price).toFixed(2)}</p>
          </div>
        `).join('')}

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/orders/${order._id}" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Track Your Order</a>
        </div>

        <p>You'll receive another email when your order ships.</p>
        <p>Thank you for shopping with us!</p>
      </div>
    `
  }),

  // Password reset template
  passwordReset: (resetUrl) => ({
    subject: 'Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Password Reset Request</h2>
        <p>You requested a password reset for your E-Commerce Store account.</p>
        <p>Click the button below to reset your password:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Reset Password</a>
        </div>
        
        <p><strong>This link will expire in 30 minutes.</strong></p>
        <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
        
        <p>For security reasons, please don't share this link with anyone.</p>
      </div>
    `
  }),

  // Order shipped template
  orderShipped: (order) => ({
    subject: `Your Order Has Shipped - #${order.orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Your Order Has Shipped! 📦</h2>
        <p>Hi ${order.user.firstName},</p>
        <p>Great news! Your order <strong>#${order.orderNumber}</strong> has been shipped and is on its way to you.</p>
        
        ${order.trackingNumber ? `
          <div style="background-color: #e8f5e8; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3>Tracking Information</h3>
            <p><strong>Tracking Number:</strong> ${order.trackingNumber}</p>
            <p><strong>Estimated Delivery:</strong> ${new Date(order.estimatedDeliveryDate).toLocaleDateString()}</p>
          </div>
        ` : ''}

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/orders/${order._id}/track" style="background-color: #17a2b8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Track Your Package</a>
        </div>

        <p>You'll receive another email when your order is delivered.</p>
        <p>Thank you for shopping with us!</p>
      </div>
    `
  })
};

// Function to send templated emails
const sendTemplateEmail = async (templateName, recipientEmail, data) => {
  const template = emailTemplates[templateName];
  if (!template) {
    throw new Error(`Email template '${templateName}' not found`);
  }

  const emailContent = template(data);
  
  await sendEmail({
    email: recipientEmail,
    subject: emailContent.subject,
    html: emailContent.html
  });
};

module.exports = {
  sendEmail,
  sendTemplateEmail,
  emailTemplates
};