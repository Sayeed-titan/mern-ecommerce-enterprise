const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

// Send email
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Enterprise E-Commerce" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Email sending error:', error);
    throw error;
  }
};

// Send order confirmation email
const sendOrderConfirmation = async (order, user) => {
  const itemsList = order.orderItems
    .map(
      (item) =>
        `<li>${item.name} x ${item.quantity} - $${(item.price * item.quantity).toFixed(2)}</li>`
    )
    .join('');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">Order Confirmation</h1>
      <p>Hi ${user.name},</p>
      <p>Thank you for your order! Your order has been confirmed.</p>
      
      <h2>Order Details</h2>
      <p><strong>Order Number:</strong> ${order.orderNumber}</p>
      <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
      
      <h3>Items Ordered:</h3>
      <ul>${itemsList}</ul>
      
      <h3>Order Summary</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px; text-align: right;">Subtotal:</td>
          <td style="padding: 8px; text-align: right;">$${order.itemsPrice.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 8px; text-align: right;">Shipping:</td>
          <td style="padding: 8px; text-align: right;">$${order.shippingPrice.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 8px; text-align: right;">Tax:</td>
          <td style="padding: 8px; text-align: right;">$${order.taxPrice.toFixed(2)}</td>
        </tr>
        ${
          order.discountAmount > 0
            ? `<tr>
                <td style="padding: 8px; text-align: right;">Discount:</td>
                <td style="padding: 8px; text-align: right; color: green;">-$${order.discountAmount.toFixed(2)}</td>
              </tr>`
            : ''
        }
        <tr style="font-weight: bold; border-top: 2px solid #333;">
          <td style="padding: 8px; text-align: right;">Total:</td>
          <td style="padding: 8px; text-align: right;">$${order.totalPrice.toFixed(2)}</td>
        </tr>
      </table>
      
      <h3>Shipping Address</h3>
      <p>
        ${order.shippingAddress.street}<br>
        ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}<br>
        ${order.shippingAddress.country}
      </p>
      
      <p>We'll send you another email when your order ships.</p>
      
      <p>
        Best regards,<br>
        Enterprise E-Commerce Team
      </p>
    </div>
  `;

  await sendEmail({
    to: user.email,
    subject: `Order Confirmation - ${order.orderNumber}`,
    html,
  });
};

// Send order status update email
const sendOrderStatusUpdate = async (order, user) => {
  const statusMessages = {
    processing: 'Your order is being processed.',
    shipped: 'Your order has been shipped!',
    delivered: 'Your order has been delivered!',
    cancelled: 'Your order has been cancelled.',
  };

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">Order Status Update</h1>
      <p>Hi ${user.name},</p>
      <p>${statusMessages[order.status]}</p>
      
      <p><strong>Order Number:</strong> ${order.orderNumber}</p>
      <p><strong>Status:</strong> ${order.status.toUpperCase()}</p>
      
      ${
        order.trackingNumber
          ? `<p><strong>Tracking Number:</strong> ${order.trackingNumber}</p>`
          : ''
      }
      
      <p>
        Best regards,<br>
        Enterprise E-Commerce Team
      </p>
    </div>
  `;

  await sendEmail({
    to: user.email,
    subject: `Order Status Update - ${order.orderNumber}`,
    html,
  });
};

// Send low stock alert to vendor
const sendLowStockAlert = async (product, vendor) => {
  const stock = product.hasVariants
    ? product.variants.reduce((sum, v) => sum + v.stock, 0)
    : product.stock;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #e74c3c;">Low Stock Alert!</h1>
      <p>Hi ${vendor.name},</p>
      <p>The following product is running low on stock:</p>
      
      <h2>${product.name}</h2>
      <p><strong>Current Stock:</strong> ${stock} units</p>
      <p><strong>Low Stock Threshold:</strong> ${product.lowStockThreshold} units</p>
      
      <p>Please restock this product soon to avoid running out.</p>
      
      <p>
        Best regards,<br>
        Enterprise E-Commerce Team
      </p>
    </div>
  `;

  await sendEmail({
    to: vendor.email,
    subject: `Low Stock Alert - ${product.name}`,
    html,
  });
};

// Send welcome email
const sendWelcomeEmail = async (user) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">Welcome to Enterprise E-Commerce!</h1>
      <p>Hi ${user.name},</p>
      <p>Thank you for creating an account with us.</p>
      
      ${
        user.role === 'vendor'
          ? '<p>Your vendor account has been created. You can now start adding products to your store.</p>'
          : '<p>Start exploring our wide range of products and enjoy shopping with us!</p>'
      }
      
      <p>If you have any questions, feel free to contact our support team.</p>
      
      <p>
        Best regards,<br>
        Enterprise E-Commerce Team
      </p>
    </div>
  `;

  await sendEmail({
    to: user.email,
    subject: 'Welcome to Enterprise E-Commerce',
    html,
  });
};

module.exports = {
  sendEmail,
  sendOrderConfirmation,
  sendOrderStatusUpdate,
  sendLowStockAlert,
  sendWelcomeEmail,
};