const PDFDocument = require('pdfkit');

const THEME = {
  headerTop: '#0f172a',
  headerBot: '#312e81',
  accent: '#6366f1',
  accentSoft: '#eef2ff',
  organizerAccent: '#f472b6',
  organizerSoft: '#fce7f3',
  ink: '#0f172a',
  muted: '#64748b',
  line: '#e2e8f0',
  cardBg: '#fafafa',
  white: '#ffffff',
};

function money(amount, currency) {
  const v = Math.round(Number(amount) || 0);
  return `${currency} ${v.toLocaleString('en-KE')}`;
}

function formatEventDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * @param {import('stream').Writable} dest
 * @param {object} report - from getEventSalesReport()
 * @param {{ isAdmin: boolean }} options
 * @returns {Promise<void>}
 */
function streamSalesReportPdf(dest, report, { isAdmin }) {
  const { event, totals, byTicketType, generatedAt } = report;
  const currency = event.currency || 'KES';
  const rate = event.commissionRate ?? 6;

  const doc = new PDFDocument({
    size: 'A4',
    margin: 0,
    info: {
      Title: `Sales report — ${event.title}`,
      Author: 'Event-i',
    },
  });

  doc.pipe(dest);

  const pageW = doc.page.width;
  const pageH = doc.page.height;
  const m = 48;
  const contentW = pageW - m * 2;

  const useOrgStyle = !isAdmin;
  const accent = useOrgStyle ? THEME.organizerAccent : THEME.accent;
  const accentSoft = useOrgStyle ? THEME.organizerSoft : THEME.accentSoft;

  const headerH = 120;
  const grad = doc.linearGradient(0, 0, pageW, headerH);
  grad.stop(0, THEME.headerTop).stop(1, THEME.headerBot);
  doc.rect(0, 0, pageW, headerH).fill(grad);
  doc.rect(0, headerH - 3, pageW, 3).fill(accent);

  doc.fillColor(accentSoft).opacity(0.4).fontSize(8).font('Helvetica-Bold');
  doc.text(isAdmin ? 'ADMIN · EVENT SALES REPORT' : 'ORGANIZER · SALES SUMMARY', m, 32);
  doc.opacity(1);
  doc.fillColor(THEME.white).font('Helvetica-Bold').fontSize(20).text(event.title, m, 48, {
    width: contentW,
    lineGap: 2,
  });
  doc.font('Helvetica').fontSize(9).fillColor('#c7d2fe').text(formatEventDate(event.startDate), m, 92, {
    width: contentW,
  });

  let y = headerH + 28;
  doc.fillColor(THEME.muted).fontSize(8).font('Helvetica');
  doc.text(`Generated ${generatedAt.toISOString().slice(0, 10)} · ${event.slug || event.id}`, m, y);
  y += 22;

  const chipH = 48;
  const chipGap = 8;
  const chipW = (contentW - chipGap * 2) / 3;
  const chips = [
    { label: 'Tickets sold', value: String(totals.ticketsSold) },
    { label: 'Orders', value: String(totals.ordersCount) },
    { label: 'Commission rate', value: `${rate}%` },
  ];
  chips.forEach((c, i) => {
    const x = m + i * (chipW + chipGap);
    doc.save();
    doc.roundedRect(x, y, chipW, chipH, 8).fill(THEME.cardBg);
    doc.roundedRect(x, y, chipW, chipH, 8).strokeColor(THEME.line).lineWidth(0.5).stroke();
    doc.fillColor(THEME.muted).font('Helvetica-Bold').fontSize(6).text(c.label.toUpperCase(), x + 12, y + 10, {
      width: chipW - 24,
    });
    doc.fillColor(THEME.ink).font('Helvetica-Bold').fontSize(14).text(c.value, x + 12, y + 24, {
      width: chipW - 24,
    });
    doc.restore();
  });
  y += chipH + 24;

  doc.fillColor(THEME.ink).font('Helvetica-Bold').fontSize(11).text('Summary', m, y);
  doc.moveTo(m, y + 16).lineTo(m + 36, y + 16).strokeColor(accent).lineWidth(2).stroke();
  y += 28;

  const summaryRows = isAdmin
    ? [
        ['Gross ticket sales (subtotal)', money(totals.grossSubtotal, currency)],
        ['Transaction fees (allocated)', money(totals.transactionFees, currency)],
        ['Service fees — platform (allocated)', money(totals.serviceFees, currency)],
        [`Platform commission (${rate}%)`, money(totals.commissionFees, currency)],
        ['Net to organizer', money(totals.netToOrganizer, currency)],
      ]
    : [
        ['Gross ticket sales', money(totals.grossSubtotal, currency)],
        [`Platform commission (${rate}%)`, money(totals.commissionFees, currency)],
        ['Your estimated net', money(totals.netToOrganizer, currency)],
      ];

  summaryRows.forEach((row, i) => {
    const rowH = 24;
    if (i % 2 === 0) {
      doc.save();
      doc.roundedRect(m, y - 2, contentW, rowH, 4).fill('#f8fafc');
      doc.restore();
    }
    const isLast = i === summaryRows.length - 1;
    doc.fillColor(THEME.ink).font(isLast ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
    doc.text(row[0], m + 12, y + 5, { width: contentW * 0.55 });
    doc.text(row[1], m, y + 5, { width: m + contentW - 12, align: 'right' });
    if (isLast) doc.font('Helvetica');
    y += rowH;
  });
  y += 20;

  doc.fillColor(THEME.ink).font('Helvetica-Bold').fontSize(11).text('By ticket type', m, y);
  doc.moveTo(m, y + 16).lineTo(m + 36, y + 16).strokeColor(accent).lineWidth(2).stroke();
  y += 28;

  let colWidths;
  let headers;
  if (isAdmin) {
    colWidths = [
      contentW * 0.22,
      contentW * 0.09,
      contentW * 0.14,
      contentW * 0.14,
      contentW * 0.14,
      contentW * 0.13,
      contentW * 0.14,
    ];
    headers = ['Type', 'Qty', 'Gross', 'Txn', 'Service', 'Comm', 'Net'];
  } else {
    colWidths = [contentW * 0.4, contentW * 0.12, contentW * 0.2, contentW * 0.14, contentW * 0.14];
    headers = ['Ticket type', 'Qty', 'Sales', 'Commission', 'Your net'];
  }

  const colXs = [m];
  for (let i = 1; i < colWidths.length; i += 1) {
    colXs.push(colXs[i - 1] + colWidths[i - 1]);
  }

  const headH = 22;
  doc.save();
  doc.roundedRect(m, y, contentW, headH, 6).fill(THEME.headerBot);
  doc.fillColor(THEME.white).font('Helvetica-Bold').fontSize(7);
  headers.forEach((h, i) => {
    const align = i <= 1 ? 'left' : 'right';
    doc.text(h, colXs[i] + 5, y + 7, { width: colWidths[i] - 10, align });
  });
  doc.restore();
  y += headH + 4;

  if (!byTicketType.length) {
    doc.fillColor(THEME.muted).font('Helvetica').fontSize(9);
    doc.text('No paid orders for this event.', m + 8, y);
    y += 20;
  } else {
    byTicketType.forEach((row, i) => {
      if (y > pageH - 100) {
        doc.addPage();
        y = m;
      }
      const rowH = 20;
      if (i % 2 === 0) {
        doc.save();
        doc.roundedRect(m, y - 1, contentW, rowH, 3).fill('#f1f5f9');
        doc.restore();
      }
      doc.fillColor(THEME.ink).font('Helvetica').fontSize(8);
      const name = String(row.ticketType || '—');
      doc.text(name.length > 28 ? `${name.slice(0, 26)}…` : name, colXs[0] + 5, y + 5, {
        width: colWidths[0] - 10,
      });
      doc.text(String(row.quantity), colXs[1] + 5, y + 5, { width: colWidths[1] - 10 });
      doc.text(
        money(row.grossSubtotal, currency).replace(`${currency} `, ''),
        colXs[2] + 5,
        y + 5,
        { width: colWidths[2] - 10, align: 'right' }
      );
      if (isAdmin) {
        doc.text(
          money(row.transactionFees, currency).replace(`${currency} `, ''),
          colXs[3] + 5,
          y + 5,
          { width: colWidths[3] - 10, align: 'right' }
        );
        doc.text(
          money(row.serviceFees, currency).replace(`${currency} `, ''),
          colXs[4] + 5,
          y + 5,
          { width: colWidths[4] - 10, align: 'right' }
        );
        doc.text(
          money(row.commissionFees, currency).replace(`${currency} `, ''),
          colXs[5] + 5,
          y + 5,
          { width: colWidths[5] - 10, align: 'right' }
        );
        doc.font('Helvetica-Bold');
        doc.text(
          money(row.netToOrganizer, currency).replace(`${currency} `, ''),
          colXs[6] + 5,
          y + 5,
          { width: colWidths[6] - 10, align: 'right' }
        );
        doc.font('Helvetica');
      } else {
        doc.text(
          money(row.commissionFees, currency).replace(`${currency} `, ''),
          colXs[3] + 5,
          y + 5,
          { width: colWidths[3] - 10, align: 'right' }
        );
        doc.font('Helvetica-Bold');
        doc.text(
          money(row.netToOrganizer, currency).replace(`${currency} `, ''),
          colXs[4] + 5,
          y + 5,
          { width: colWidths[4] - 10, align: 'right' }
        );
        doc.font('Helvetica');
      }
      y += rowH;
    });
  }

  y += 16;
  doc.fillColor(THEME.muted).font('Helvetica').fontSize(7);
  const footnote = isAdmin
    ? 'Paid orders only (payment completed). Transaction and service fees are allocated pro-rata by line subtotal. Organizer net excludes platform commission from gross subtotal.'
    : 'Paid orders only. This summary does not show buyer-paid processing or transaction fees. Your net is ticket sales minus platform commission.';
  doc.text(footnote, m, y, { width: contentW, lineGap: 2 });

  const footY = pageH - 32;
  doc.moveTo(m, footY).lineTo(m + contentW, footY).strokeColor(THEME.line).lineWidth(0.5).stroke();
  doc.fillColor(THEME.muted).fontSize(6).text(`Event-i · ${generatedAt.toLocaleString('en-GB')}`, m, footY + 8, {
    width: contentW,
    align: 'center',
  });

  return new Promise((resolve, reject) => {
    dest.once('finish', resolve);
    dest.once('error', reject);
    doc.end();
  });
}

module.exports = {
  streamSalesReportPdf,
};
