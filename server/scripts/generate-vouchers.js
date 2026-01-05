/**
 * Generate Vouchers for Double Fervour Paid Tickets
 * Creates printable vouchers with customer names and voucher amounts
 *
 * Usage: node scripts/generate-vouchers.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const path = require('path');

// Voucher amounts by ticket type/price
const VOUCHER_RULES = {
  // Regular ticket (1000 KES) → 400 KES voucher
  1000: 400,
  1015: 400, // Regular with service fee

  // Couple ticket (1800 KES) → 600 KES voucher
  1800: 600,
  2020: 600, // Couple with service fee

  // VIP ticket → 1400 KES voucher
  3500: 1400,

  // Gate ticket (1500 KES) → 600 KES voucher
  1500: 600,
  1520: 600, // Gate with service fee

  // Group tickets → No voucher (will return 0)
};

function getVoucherAmount(totalAmount, ticketType) {
  // Direct match
  if (VOUCHER_RULES[totalAmount]) {
    return VOUCHER_RULES[totalAmount];
  }

  // Fuzzy matching
  if (totalAmount >= 1000 && totalAmount <= 1050) return 400;
  if (totalAmount >= 1800 && totalAmount <= 2100) return 600;
  if (totalAmount >= 1500 && totalAmount <= 1550) return 600;
  if (totalAmount >= 3400 && totalAmount <= 3600) return 1400;

  // Group tickets or unknown - no voucher
  return 0;
}

function fetchOrdersFromProduction() {
  console.log('🔄 Fetching paid orders from production...');

  const script = `
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Event = mongoose.connection.db.collection('events');
  const Order = mongoose.connection.db.collection('orders');

  const event = await Event.findOne({ title: /double.*fervour/i, status: 'published' });

  const orders = await Order.find({
    'items.eventId': event._id,
    status: 'paid',
    paymentStatus: 'completed'
  }).sort({ createdAt: 1 }).toArray();

  console.log(JSON.stringify(orders));
  process.exit(0);
}).catch(err => { process.exit(1); });
`;

  try {
    const output = execSync(
      `ssh event-i-prod "docker exec event_i_server_prod node -e \\"${script.replace(/"/g, '\\"')}\\"" 2>/dev/null`,
      { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }
    );

    // Clean up any extra output before JSON
    const jsonStart = output.indexOf('[');
    const jsonEnd = output.lastIndexOf(']') + 1;
    const jsonOutput = output.substring(jsonStart, jsonEnd);

    const orders = JSON.parse(jsonOutput);
    console.log(`✅ Fetched ${orders.length} paid orders`);
    return orders;
  } catch (error) {
    console.error('❌ Failed to fetch orders:', error.message);
    if (error.stdout) {
      console.error('Output length:', error.stdout.length);
      console.error('First 500 chars:', error.stdout.substring(0, 500));
    }
    process.exit(1);
  }
}

function generateVouchers(orders) {
  console.log(`📄 Generating vouchers...`);

  // Filter orders that have vouchers
  const voucherOrders = orders.filter(order => {
    const voucherAmount = getVoucherAmount(order.totalAmount || 0, order.items[0]?.ticketType);
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

  const outputPath = path.join(require('os').homedir(), 'Downloads', 'Double_Fervour_Vouchers.pdf');
  const writeStream = fs.createWriteStream(outputPath);
  doc.pipe(writeStream);

  // Generate vouchers - 8 per page (2 columns x 4 rows)
  voucherOrders.forEach((order, index) => {
    const customerName = order.customer?.name || order.customer?.firstName + ' ' + order.customer?.lastName || 'Valued Customer';
    const voucherAmount = getVoucherAmount(order.totalAmount || 0, order.items[0]?.ticketType);
    const orderNumber = order.orderNumber;

    // Add new page every 8 vouchers (except first page)
    if (index > 0 && index % 8 === 0) {
      doc.addPage();
    }

    // Calculate grid position (2 columns x 4 rows)
    const col = index % 2; // 0 or 1
    const row = Math.floor((index % 8) / 2); // 0, 1, 2, or 3

    drawVoucherCompact(doc, {
      customerName,
      voucherAmount,
      orderNumber,
      ticketType: order.items[0]?.ticketType || 'General',
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

function drawVoucherCompact(doc, { customerName, voucherAmount, orderNumber, ticketType, voucherNumber }, col, row) {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;

  // Grid layout: 2 columns x 4 rows with margins
  const margin = 15;
  const gap = 10;
  const cardWidth = (pageWidth - (2 * margin) - gap) / 2; // ~270 points
  const cardHeight = (pageHeight - (2 * margin) - (3 * gap)) / 4; // ~195 points

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

  // Divider line
  doc.moveTo(cardX + innerPadding, cardY + innerPadding + 105)
     .lineTo(cardX + cardWidth - innerPadding, cardY + innerPadding + 105)
     .strokeColor('#e5e5e7')
     .lineWidth(0.5)
     .stroke();

  // Details section (Apple-style clean layout)
  doc.fontSize(5.5)
     .font('Helvetica')
     .fillColor('#86868b');

  const detailsY = cardY + innerPadding + 115;

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
  console.log('🎟️  Double Fervour Voucher Generator\n');

  const orders = fetchOrdersFromProduction();
  const pdfPath = await generateVouchers(orders);

  if (pdfPath) {
    console.log('\n✨ Opening PDF...');
    execSync(`open "${pdfPath}"`);
    console.log('✅ Done!');
  }
})();
