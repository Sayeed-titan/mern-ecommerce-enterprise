const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const generateInvoice = (order, outputPath) => {
  return new Promise((resolve, reject) => {
    try {
      console.log('🔄 Starting PDF generation for order:', order.orderNumber);
      
      // Validate required data
      if (!order || !order.orderItems || order.orderItems.length === 0) {
        throw new Error('Invalid order data: missing order items');
      }

      if (!order.shippingAddress) {
        throw new Error('Invalid order data: missing shipping address');
      }

      // Create a document
      const doc = new PDFDocument({ margin: 50 });

      // Pipe to file
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      console.log('✅ PDF document created and stream opened');

      // Add company header with background
      doc
        .rect(0, 0, doc.page.width, 120)
        .fill('#3B82F6');

      doc
        .fillColor('#FFFFFF')
        .fontSize(28)
        .font('Helvetica-Bold')
        .text('INVOICE', 50, 40, { align: 'center' })
        .fontSize(12)
        .font('Helvetica')
        .text('Enterprise E-Commerce Platform', { align: 'center' })
        .text('123 Business Street, Commerce City, ST 12345', { align: 'center' })
        .text('Phone: (555) 123-4567 | Email: support@ecommerce.com', { align: 'center' });

      // Reset color
      doc.fillColor('#000000');

      // Add invoice details in a box
      doc
        .rect(50, 150, 250, 100)
        .stroke('#CCCCCC');

      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('INVOICE DETAILS', 60, 160)
        .font('Helvetica')
        .fontSize(9)
        .text(`Invoice Number: ${order.invoiceNumber || order.orderNumber}`, 60, 180)
        .text(`Order Number: ${order.orderNumber}`, 60, 195)
        .text(`Invoice Date: ${new Date(order.createdAt).toLocaleDateString()}`, 60, 210)
        .text(`Status: ${order.status.toUpperCase()}`, 60, 225);

      // Add customer details in a box
      doc
        .rect(320, 150, 240, 100)
        .stroke('#CCCCCC');

      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('BILL TO:', 330, 160)
        .font('Helvetica')
        .fontSize(9)
        .text(order.user?.name || 'Customer', 330, 180)
        .text(order.user?.email || '', 330, 195);

      // Shipping address
      const addressLines = [
        order.shippingAddress.street,
        `${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}`,
        order.shippingAddress.country
      ];
      
      let yPos = 210;
      addressLines.forEach(line => {
        doc.text(line, 330, yPos, { width: 220 });
        yPos += 12;
      });

      // Add table header with background
      const tableTop = 280;
      doc
        .rect(50, tableTop - 5, 510, 25)
        .fill('#F3F4F6');

      doc
        .fillColor('#000000')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('DESCRIPTION', 60, tableTop, { width: 200 })
        .text('QTY', 270, tableTop, { width: 50, align: 'center' })
        .text('PRICE', 330, tableTop, { width: 80, align: 'right' })
        .text('AMOUNT', 450, tableTop, { width: 100, align: 'right' });

      // Add separator line
      doc
        .strokeColor('#CCCCCC')
        .lineWidth(1)
        .moveTo(50, tableTop + 20)
        .lineTo(560, tableTop + 20)
        .stroke();

      // Add items
      let position = tableTop + 30;
      doc.font('Helvetica').fontSize(9);

      order.orderItems.forEach((item, index) => {
        // Add zebra striping
        if (index % 2 === 0) {
          doc
            .rect(50, position - 5, 510, 25)
            .fill('#F9FAFB');
          doc.fillColor('#000000');
        }

        doc
          .text(item.name, 60, position, { width: 200 })
          .text(item.quantity.toString(), 270, position, { width: 50, align: 'center' })
          .text(`$${item.price.toFixed(2)}`, 330, position, { width: 80, align: 'right' })
          .text(`$${(item.quantity * item.price).toFixed(2)}`, 450, position, {
            width: 100,
            align: 'right',
          });

        position += 25;
      });

      // Add separator line
      doc
        .strokeColor('#CCCCCC')
        .lineWidth(1)
        .moveTo(50, position + 5)
        .lineTo(560, position + 5)
        .stroke();

      // Add totals section
      position += 25;
      const totalsX = 380;
      const amountX = 450;

      doc
        .fontSize(10)
        .font('Helvetica')
        .text('Subtotal:', totalsX, position)
        .text(`$${order.itemsPrice.toFixed(2)}`, amountX, position, {
          width: 100,
          align: 'right',
        });

      position += 20;
      doc
        .text('Tax:', totalsX, position)
        .text(`$${order.taxPrice.toFixed(2)}`, amountX, position, {
          width: 100,
          align: 'right',
        });

      position += 20;
      doc
        .text('Shipping:', totalsX, position)
        .text(`$${order.shippingPrice.toFixed(2)}`, amountX, position, {
          width: 100,
          align: 'right',
        });

      if (order.discountAmount && order.discountAmount > 0) {
        position += 20;
        doc
          .fillColor('#10B981')
          .text('Discount:', totalsX, position)
          .text(`-$${order.discountAmount.toFixed(2)}`, amountX, position, {
            width: 100,
            align: 'right',
          });
        doc.fillColor('#000000');
      }

      // Total with background
      position += 25;
      doc
        .rect(totalsX - 10, position - 5, 180, 30)
        .fill('#3B82F6');

      doc
        .fillColor('#FFFFFF')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('TOTAL:', totalsX, position + 5)
        .text(`$${order.totalPrice.toFixed(2)}`, amountX, position + 5, {
          width: 100,
          align: 'right',
        });

      doc.fillColor('#000000');

      // Add payment info if paid
      if (order.isPaid) {
        position += 50;
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('PAYMENT INFORMATION', 50, position)
          .font('Helvetica')
          .fontSize(9)
          .text(`Status: PAID`, 50, position + 15)
          .text(`Method: ${order.paymentMethod.toUpperCase()}`, 50, position + 28)
          .text(`Payment Date: ${new Date(order.paidAt).toLocaleDateString()}`, 50, position + 41);
      }

      // Add footer with background
      const footerY = doc.page.height - 80;
      doc
        .rect(0, footerY, doc.page.width, 80)
        .fill('#F3F4F6');

      doc
        .fillColor('#6B7280')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Thank you for your business!', 50, footerY + 15, {
          align: 'center',
          width: doc.page.width - 100,
        })
        .font('Helvetica')
        .fontSize(8)
        .text('For questions about this invoice, please contact:', footerY + 35, {
          align: 'center',
          width: doc.page.width - 100,
        })
        .text('support@ecommerce.com | (555) 123-4567', {
          align: 'center',
          width: doc.page.width - 100,
        });

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