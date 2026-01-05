/**
 * Generate Vouchers for Specific Customers
 * Creates printable vouchers for specified email addresses
 *
 * Usage: node scripts/generate-specific-vouchers.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const path = require('path');

// Specific emails to generate vouchers for
const TARGET_EMAILS = [
  'nelimakerryll@gmail.com',
  'van042dee@gmail.com',
  'eliasngurungigi@gmail.com',
  'doofwanzenza@gmail.com',
  'peterkeroti55@gmail.com',
  'kadenyikibitsu@gmail.com',
  'jmukami996@gmail.com'
];

// Voucher amounts by ticket type/price
const VOUCHER_RULES = {
  1000: 400,
  1015: 400,
  1800: 600,
  2020: 600,
  3500: 1400,
  1500: 600,
  1520: 600,
  1820: 600, // Couple ticket with service fee
};

function getVoucherAmount(totalAmount) {
  if (VOUCHER_RULES[totalAmount]) {
    return VOUCHER_RULES[totalAmount];
  }

  if (totalAmount >= 1000 && totalAmount <= 1050) return 400;
  if (totalAmount >= 1800 && totalAmount <= 2100) return 600;
  if (totalAmount >= 1500 && totalAmount <= 1550) return 600;
  if (totalAmount >= 3400 && totalAmount <= 3600) return 1400;

  return 0;
}

function fetchSpecificOrders() {
  console.log('🔄 Fetching orders for specified customers...');

  const emailList = TARGET_EMAILS.map(e => `'${e}'`).join(', ');

  const script = `
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Event = mongoose.connection.db.collection('events');
  const Order = mongoose.connection.db.collection('orders');

  const event = await Event.findOne({ title: /double.*fervour/i, status: 'published' });

  const targetEmails = [${emailList}];

  const orders = await Order.find({
    'items.eventId': event._id,
    status: 'paid',
    paymentStatus: 'completed'
  }).sort({ createdAt: 1 }).toArray();

  const filteredOrders = orders.filter(order => {
    const email = order.customer.email.toLowerCase();
    return targetEmails.some(target => email === target.toLowerCase());
  });

  console.log(JSON.stringify(filteredOrders));
  process.exit(0);
}).catch(err => { process.exit(1); });
`;

  try {
    const output = execSync(
      `ssh event-i-prod "docker exec event_i_server_prod node -e \\"${script.replace(/"/g, '\\"')}\\"" 2>/dev/null`,
      { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }
    );

    const jsonStart = output.indexOf('[');
    const jsonEnd = output.lastIndexOf(']') + 1;
    const jsonOutput = output.substring(jsonStart, jsonEnd);

    const orders = JSON.parse(jsonOutput);
    console.log(`✅ Fetched ${orders.length} paid orders for specified customers`);
    return orders;
  } catch (error) {
    console.error('❌ Failed to fetch orders:', error.message);
    process.exit(1);
  }
}

function generateVouchers(orders) {
  console.log(`📄 Generating vouchers...`);

  const voucherOrders = orders.filter(order => {
    const voucherAmount = getVoucherAmount(order.totalAmount || 0);
    return voucherAmount > 0;
  });

  console.log(`   ${voucherOrders.length} customers eligible for vouchers`);

  if (voucherOrders.length === 0) {
    console.log('❌ No vouchers to generate');
    return null;
  }

  const doc = new PDFDocument({
    size: 'A4',
    margin: 0,
    bufferPages: true
  });

  const outputPath = path.join(require('os').homedir(), 'Downloads', 'Specific_Customer_Vouchers.pdf');
  const writeStream = fs.createWriteStream(outputPath);
  doc.pipe(writeStream);

  // Generate vouchers - 8 per page (2 columns x 4 rows)
  voucherOrders.forEach((order, index) => {
    const customerName = order.customer?.name || order.customer?.firstName + ' ' + order.customer?.lastName || 'Valued Customer';
    const voucherAmount = getVoucherAmount(order.totalAmount || 0);
    const orderNumber = order.orderNumber;

    // Add new page every 8 vouchers (except first page)
    if (index > 0 && index % 8 === 0) {
      doc.addPage();
    }

    // Calculate grid position (2 columns x 4 rows)
    const col = index % 2;
    const row = Math.floor((index % 8) / 2);

    drawVoucherCompact(doc, {
      customerName,
      voucherAmount,
      orderNumber,
      email: order.customer?.email || '',
      voucherNumber: `DF-${String(index + 1).padStart(3, '0')}`
    }, col, row);
  });

  return new Promise((resolve, reject) => {
    writeStream.on('finish', () => {
      console.log(`✅ ${voucherOrders.length} vouchers generated`);
      console.log(`📄 PDF saved to: ${outputPath}`);
      resolve(outputPath);
    });

    writeStream.on('error', reject);

    doc.end();
  });
}

function drawVoucherCompact(doc, { customerName, voucherAmount, orderNumber, email, voucherNumber }, col, row) {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;

  // Grid layout: 2 columns x 4 rows with margins
  const margin = 15;
  const gap = 10;
  const cardWidth = (pageWidth - (2 * margin) - gap) / 2;
  const cardHeight = (pageHeight - (2 * margin) - (3 * gap)) / 4;

  // Calculate position
  const cardX = margin + (col * (cardWidth + gap));
  const cardY = margin + (row * (cardHeight + gap));

  // Subtle shadow (Apple style)
  doc.rect(cardX + 2, cardY + 2, cardWidth, cardHeight)
     .fill('#00000006');

  // Card with minimal border
  doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 8)
     .fillAndStroke('#ffffff', '#e5e5e7');
  doc.lineWidth(0.5);

  // Minimal header
  const innerPadding = 12;
  doc.fontSize(7)
     .font('Helvetica')
     .fillColor('#86868b')
     .text('DOUBLE FERVOUR', cardX + innerPadding, cardY + innerPadding, {
       width: cardWidth - (2 * innerPadding),
       align: 'left',
       characterSpacing: 1
     });

  doc.fontSize(5.5)
     .fillColor('#86868b')
     .text('Edition 2 RnB Experience', cardX + innerPadding, cardY + innerPadding + 9, {
       width: cardWidth - (2 * innerPadding),
       align: 'left'
     });

  // Divider line (Apple style)
  doc.moveTo(cardX + innerPadding, cardY + innerPadding + 20)
     .lineTo(cardX + cardWidth - innerPadding, cardY + innerPadding + 20)
     .strokeColor('#e5e5e7')
     .lineWidth(0.5)
     .stroke();

  // Voucher label (minimal)
  doc.fontSize(7)
     .font('Helvetica')
     .fillColor('#86868b')
     .text('Complimentary Voucher', cardX + innerPadding, cardY + innerPadding + 28, {
       width: cardWidth - (2 * innerPadding),
       align: 'center'
     });

  // Voucher amount - Apple style (clean, large)
  doc.fontSize(32)
     .font('Helvetica-Bold')
     .fillColor('#1d1d1f')
     .text(`KES ${voucherAmount.toLocaleString()}`, cardX + innerPadding, cardY + innerPadding + 45, {
       width: cardWidth - (2 * innerPadding),
       align: 'center'
     });

  // Customer name (Apple style)
  doc.fontSize(9)
     .font('Helvetica')
     .fillColor('#1d1d1f')
     .text(customerName, cardX + innerPadding, cardY + innerPadding + 85, {
       width: cardWidth - (2 * innerPadding),
       align: 'center',
       ellipsis: true
     });

  // Email (small)
  doc.fontSize(5)
     .fillColor('#86868b')
     .text(email, cardX + innerPadding, cardY + innerPadding + 98, {
       width: cardWidth - (2 * innerPadding),
       align: 'center',
       ellipsis: true
     });

  // Divider line
  doc.moveTo(cardX + innerPadding, cardY + innerPadding + 108)
     .lineTo(cardX + cardWidth - innerPadding, cardY + innerPadding + 108)
     .strokeColor('#e5e5e7')
     .lineWidth(0.5)
     .stroke();

  // Details section (Apple-style clean layout)
  doc.fontSize(5.5)
     .font('Helvetica')
     .fillColor('#86868b');

  const detailsY = cardY + innerPadding + 118;

  // Voucher Number
  doc.text('Voucher No', cardX + innerPadding, detailsY, { continued: false });
  doc.font('Helvetica-Bold').fillColor('#1d1d1f').fontSize(6);
  doc.text(voucherNumber, cardX + innerPadding, detailsY + 8, { continued: false });

  // Order Number
  doc.font('Helvetica').fillColor('#86868b').fontSize(5.5);
  doc.text('Order No', cardX + innerPadding, detailsY + 22, { continued: false });
  doc.font('Helvetica-Bold').fillColor('#1d1d1f').fontSize(6);
  doc.text(orderNumber, cardX + innerPadding, detailsY + 30, {
    width: cardWidth - (2 * innerPadding),
    continued: false,
    ellipsis: true
  });

  // Footer (Apple style - minimal)
  doc.fontSize(5)
     .font('Helvetica')
     .fillColor('#86868b')
     .text('Redeemable at Double Fervour Edition 2', cardX + innerPadding, cardY + cardHeight - 12, {
       width: cardWidth - (2 * innerPadding),
       align: 'center'
     });

  // Apple logo-style dot (subtle branding)
  doc.circle(cardX + cardWidth / 2, cardY + cardHeight - 3, 1)
     .fill('#d1d1d6');
}

// Main execution
(async () => {
  console.log('🎟️  Specific Customer Voucher Generator\n');
  console.log('Target emails:');
  TARGET_EMAILS.forEach(email => console.log(`  - ${email}`));
  console.log('');

  const orders = fetchSpecificOrders();
  const pdfPath = await generateVouchers(orders);

  if (pdfPath) {
    console.log('\n✨ Opening PDF...');
    execSync(`open "${pdfPath}"`);
    console.log('✅ Done!');
  }
})();
