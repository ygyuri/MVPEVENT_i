/**
 * Generate Double Fervour Financial Report
 * Creates a comprehensive PDF report with order breakdown and financial summary
 *
 * Usage: node scripts/generate-double-fervour-report.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const path = require('path');

function fetchOrderData() {
  console.log('🔄 Fetching Double Fervour orders from production...');

  const script = `
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Event = mongoose.connection.db.collection('events');
  const Order = mongoose.connection.db.collection('orders');

  const event = await Event.findOne({ title: /double.*fervour/i, status: 'published' });

  const allOrders = await Order.find({
    'items.eventId': event._id
  }).sort({ createdAt: 1 }).toArray();

  console.log(JSON.stringify(allOrders));
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
    console.log(`✅ Fetched ${orders.length} total orders`);
    return orders;
  } catch (error) {
    console.error('❌ Failed to fetch orders:', error.message);
    process.exit(1);
  }
}

function analyzeOrders(orders) {
  const paidOrders = orders.filter(o => o.status === 'paid' && o.paymentStatus === 'completed');
  const failedOrders = orders.filter(o => o.status === 'failed' || o.paymentStatus === 'failed');
  const cancelledOrders = orders.filter(o => o.status === 'cancelled');
  const pendingOrders = orders.filter(o => o.status === 'pending');

  let totalRevenue = 0;
  let totalComplimentary = 0;
  let totalTickets = 0;

  const breakdown = {
    'Regular (KES 1,015)': { count: 0, revenue: 0, complimentary: 0, voucher: 400 },
    'Couple (KES 1,820/2,020)': { count: 0, revenue: 0, complimentary: 0, voucher: 600 },
    'Gate (KES 1,500)': { count: 0, revenue: 0, complimentary: 0, voucher: 600 },
    'VIP (KES 3,500)': { count: 0, revenue: 0, complimentary: 0, voucher: 1400 },
    'Group/Other': { count: 0, revenue: 0, complimentary: 0, voucher: 0 }
  };

  paidOrders.forEach(order => {
    const amount = order.totalAmount || 0;
    totalRevenue += amount;
    totalTickets += order.items ? order.items.length : 1;

    let voucherAmt = 0;
    let category = 'Group/Other';

    if (amount >= 1000 && amount <= 1050) {
      voucherAmt = 400;
      category = 'Regular (KES 1,015)';
    } else if (amount >= 1800 && amount <= 2100) {
      voucherAmt = 600;
      category = 'Couple (KES 1,820/2,020)';
    } else if (amount >= 1500 && amount <= 1550) {
      voucherAmt = 600;
      category = 'Gate (KES 1,500)';
    } else if (amount >= 3400 && amount <= 3600) {
      voucherAmt = 1400;
      category = 'VIP (KES 3,500)';
    }

    totalComplimentary += voucherAmt;
    breakdown[category].count++;
    breakdown[category].revenue += amount;
    breakdown[category].complimentary += voucherAmt;
  });

  return {
    total: orders.length,
    paid: paidOrders.length,
    failed: failedOrders.length,
    cancelled: cancelledOrders.length,
    pending: pendingOrders.length,
    totalRevenue,
    totalComplimentary,
    netRevenue: totalRevenue - totalComplimentary,
    totalTickets,
    vouchersIssued: paidOrders.length - breakdown['Group/Other'].count,
    breakdown
  };
}

function generateReport(stats) {
  console.log('📄 Generating PDF report...');

  const doc = new PDFDocument({
    size: 'A4',
    margin: 50
  });

  const outputPath = path.join(require('os').homedir(), 'Downloads', 'Double_Fervour_Financial_Report.pdf');
  const writeStream = fs.createWriteStream(outputPath);
  doc.pipe(writeStream);

  // Header
  doc.fontSize(24)
     .font('Helvetica-Bold')
     .fillColor('#1d1d1f')
     .text('Double Fervour', { align: 'center' });

  doc.fontSize(16)
     .font('Helvetica')
     .fillColor('#86868b')
     .text('Edition 2 RnB Experience', { align: 'center' });

  doc.fontSize(12)
     .fillColor('#86868b')
     .text('Financial Report', { align: 'center' });

  doc.moveDown(2);

  // Order Status Summary
  doc.fontSize(16)
     .font('Helvetica-Bold')
     .fillColor('#1d1d1f')
     .text('Order Status Summary');

  doc.moveDown(0.5);
  drawLine(doc);
  doc.moveDown(0.5);

  doc.fontSize(11)
     .font('Helvetica');

  drawRow(doc, 'Total Orders (All)', stats.total.toString());
  drawRow(doc, 'Paid Orders', stats.paid.toString(), '#34c759');
  drawRow(doc, 'Failed Orders', stats.failed.toString(), '#ff3b30');
  drawRow(doc, 'Cancelled Orders', stats.cancelled.toString(), '#ff9500');
  drawRow(doc, 'Pending Orders', stats.pending.toString(), '#007aff');

  doc.moveDown(1);

  // Ticket Breakdown
  doc.fontSize(16)
     .font('Helvetica-Bold')
     .fillColor('#1d1d1f')
     .text('Paid Orders Breakdown by Ticket Type');

  doc.moveDown(0.5);
  drawLine(doc);
  doc.moveDown(0.5);

  Object.keys(stats.breakdown).forEach(category => {
    const data = stats.breakdown[category];
    if (data.count > 0) {
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor('#1d1d1f')
         .text(category);

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#86868b');

      doc.text(`   Orders: ${data.count}`, { continued: false });
      doc.text(`   Revenue: KES ${data.revenue.toLocaleString()}`, { continued: false });
      doc.text(`   Complimentary (KES ${data.voucher} per order): KES ${data.complimentary.toLocaleString()}`, { continued: false });
      doc.text(`   Net Revenue: KES ${(data.revenue - data.complimentary).toLocaleString()}`, { continued: false });

      doc.moveDown(0.7);
    }
  });

  doc.moveDown(0.5);

  // Financial Summary Box
  const boxY = doc.y;
  doc.rect(50, boxY, doc.page.width - 100, 150)
     .fillAndStroke('#f5f5f7', '#e5e5e7');

  doc.fillColor('#1d1d1f')
     .fontSize(18)
     .font('Helvetica-Bold')
     .text('Financial Summary', 70, boxY + 20);

  doc.fontSize(11)
     .font('Helvetica')
     .fillColor('#86868b');

  const summaryY = boxY + 50;
  doc.text(`Total Tickets Sold: ${stats.totalTickets}`, 70, summaryY);
  doc.text(`Vouchers Issued: ${stats.vouchersIssued}`, 70, summaryY + 20);

  doc.moveDown(1);

  doc.fontSize(14)
     .font('Helvetica-Bold')
     .fillColor('#1d1d1f');

  doc.text(`Gross Revenue: KES ${stats.totalRevenue.toLocaleString()}`, 70, summaryY + 50);

  const complimentaryPercent = ((stats.totalComplimentary / stats.totalRevenue) * 100).toFixed(2);
  doc.text(`Total Complimentary: KES ${stats.totalComplimentary.toLocaleString()} (${complimentaryPercent}%)`, 70, summaryY + 70);

  doc.fontSize(16)
     .fillColor('#34c759');
  doc.text(`Net Revenue: KES ${stats.netRevenue.toLocaleString()}`, 70, summaryY + 95);

  // Footer
  doc.fontSize(8)
     .fillColor('#d1d1d6')
     .text(`Generated on ${new Date().toLocaleString()}`, 50, doc.page.height - 50, {
       align: 'center'
     });

  doc.text('Powered by Event-i', 50, doc.page.height - 35, {
    align: 'center'
  });

  return new Promise((resolve, reject) => {
    writeStream.on('finish', () => {
      console.log(`✅ Report generated`);
      console.log(`📄 PDF saved to: ${outputPath}`);
      resolve(outputPath);
    });

    writeStream.on('error', reject);

    doc.end();
  });
}

function drawLine(doc) {
  doc.moveTo(50, doc.y)
     .lineTo(doc.page.width - 50, doc.y)
     .strokeColor('#e5e5e7')
     .lineWidth(1)
     .stroke();
}

function drawRow(doc, label, value, color = '#1d1d1f') {
  const y = doc.y;
  doc.fillColor('#86868b')
     .text(label, 50, y);
  doc.fillColor(color)
     .font('Helvetica-Bold')
     .text(value, doc.page.width - 150, y, { align: 'right' });
  doc.font('Helvetica');
  doc.moveDown(0.3);
}

// Main execution
(async () => {
  console.log('🎟️  Double Fervour Financial Report Generator\n');

  const orders = fetchOrderData();
  const stats = analyzeOrders(orders);
  const pdfPath = await generateReport(stats);

  if (pdfPath) {
    console.log('\n✨ Opening PDF...');
    execSync(`open "${pdfPath}"`);
    console.log('✅ Done!');
  }
})();
