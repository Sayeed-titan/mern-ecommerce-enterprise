const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const generateInvoice = (order, outputPath) => {
  return new Promise((resolve, reject) => {
    try {
      // Create a document
      const doc = new PDFDocument({ margin: 50 });

      // Pipe to file
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // Add company header
      doc
        .fontSize(20)
        .text('INVOICE', 50, 50, { align: 'center' })
        .fontSize(10)
        .text('Enterprise E-Commerce Platform', { align: 'center' })
        .text('Email: support@ecommerce.com', { align: 'center' })
        .moveDown();

      // Add invoice details
      doc
        .fontSize(12)
        .text(`Invoice Number: ${order.invoiceNumber || order.orderNumber}`, 50, 150)
        .text(`Order Number: ${order.orderNumber}`)
        .text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`)
        .text(`Status: ${order.status.toUpperCase()}`)
        .moveDown();

      // Add customer details
      doc
        .fontSize(12)
        .text('Bill To:', 50, 240)
        .fontSize(10)
        .text(order.user?.name || 'Customer')
        .text(order.user?.email || '')
        .text(`${order.shippingAddress.street}`)
        .text(`${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}`)
        .text(order.shippingAddress.country)
        .moveDown(2);

      // Add table header
      const tableTop = 380;
      doc
        .fontSize(10)
        .text('Item', 50, tableTop, { width: 200 })
        .text('Qty', 250, tableTop, { width: 50 })
        .text('Price', 300, tableTop, { width: 80, align: 'right' })
        .text('Total', 400, tableTop, { width: 100, align: 'right' });

      // Add line
      doc
        .strokeColor('#aaaaaa')
        .lineWidth(1)
        .moveTo(50, tableTop + 20)
        .lineTo(550, tableTop + 20)
        .stroke();

      // Add items
      let position = tableTop + 30;
      order.orderItems.forEach((item) => {
        doc
          .fontSize(9)
          .text(item.name, 50, position, { width: 200 })
          .text(item.quantity, 250, position, { width: 50 })
          .text(`$${item.price.toFixed(2)}`, 300, position, { width: 80, align: 'right' })
          .text(`$${(item.quantity * item.price).toFixed(2)}`, 400, position, {
            width: 100,
            align: 'right',
          });

        position += 25;
      });

      // Add line
      doc
        .strokeColor('#aaaaaa')
        .lineWidth(1)
        .moveTo(50, position)
        .lineTo(550, position)
        .stroke();

      // Add totals
      position += 20;
      doc
        .fontSize(10)
        .text('Subtotal:', 350, position)
        .text(`$${order.itemsPrice.toFixed(2)}`, 400, position, {
          width: 100,
          align: 'right',
        });

      position += 20;
      doc
        .text('Tax:', 350, position)
        .text(`$${order.taxPrice.toFixed(2)}`, 400, position, {
          width: 100,
          align: 'right',
        });

      position += 20;
      doc
        .text('Shipping:', 350, position)
        .text(`$${order.shippingPrice.toFixed(2)}`, 400, position, {
          width: 100,
          align: 'right',
        });

      if (order.discountAmount > 0) {
        position += 20;
        doc
          .text('Discount:', 350, position)
          .text(`-$${order.discountAmount.toFixed(2)}`, 400, position, {
            width: 100,
            align: 'right',
          });
      }

      position += 20;
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('Total:', 350, position)
        .text(`$${order.totalPrice.toFixed(2)}`, 400, position, {
          width: 100,
          align: 'right',
        });

      // Add payment info
      if (order.isPaid) {
        position += 40;
        doc
          .fontSize(10)
          .font('Helvetica')
          .text(`Payment Status: PAID`, 50, position)
          .text(`Payment Method: ${order.paymentMethod.toUpperCase()}`)
          .text(`Payment Date: ${new Date(order.paidAt).toLocaleDateString()}`);
      }

      // Add footer
      doc
        .fontSize(8)
        .text(
          'Thank you for your business!',
          50,
          doc.page.height - 100,
          { align: 'center', width: 500 }
        )
        .text(
          'For questions, contact: support@ecommerce.com',
          { align: 'center', width: 500 }
        );

      // Finalize PDF
      doc.end();

      stream.on('finish', () => {
        resolve(outputPath);
      });

      stream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { generateInvoice };