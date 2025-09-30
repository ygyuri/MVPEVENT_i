const fs = require('fs');
const path = require('path');
const csv = require('csv-writer');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

/**
 * Export Service for generating different file formats
 * Handles CSV, Excel, PDF, and JSON exports
 */
class ExportService {
  constructor() {
    this.exportDir = path.join(__dirname, '../exports');
    this.ensureExportDir();
  }

  /**
   * Ensure export directory exists
   */
  ensureExportDir() {
    if (!fs.existsSync(this.exportDir)) {
      fs.mkdirSync(this.exportDir, { recursive: true });
    }
  }

  /**
   * Export data to CSV format
   * @param {Array} data - Data to export
   * @param {Object} options - Export options
   * @returns {string} File path
   */
  async exportToCSV(data, options = {}) {
    const { filename, fields } = options;
    const filePath = path.join(this.exportDir, `${filename}.csv`);
    
    // Define CSV headers
    const headers = fields || [
      { id: 'ticketNumber', title: 'Ticket Number' },
      { id: 'eventTitle', title: 'Event Title' },
      { id: 'eventDate', title: 'Event Date' },
      { id: 'ticketType', title: 'Ticket Type' },
      { id: 'price', title: 'Price' },
      { id: 'firstName', title: 'First Name' },
      { id: 'lastName', title: 'Last Name' },
      { id: 'email', title: 'Email' },
      { id: 'phone', title: 'Phone' },
      { id: 'orderNumber', title: 'Order Number' },
      { id: 'purchaseDate', title: 'Purchase Date' },
      { id: 'paymentMethod', title: 'Payment Method' },
      { id: 'status', title: 'Status' },
      { id: 'usedAt', title: 'Used At' }
    ];

    const writer = csv.createObjectCsvWriter({
      path: filePath,
      header: headers
    });

    // Transform data for CSV
    const csvData = data.map(item => ({
      ticketNumber: item.ticketNumber || '',
      eventTitle: item.event?.title || '',
      eventDate: item.event?.dates?.startDate ? new Date(item.event.dates.startDate).toLocaleDateString() : '',
      ticketType: item.ticketType || '',
      price: item.price || 0,
      firstName: item.holder?.firstName || '',
      lastName: item.holder?.lastName || '',
      email: item.holder?.email || '',
      phone: item.holder?.phone || '',
      orderNumber: item.order?.orderNumber || '',
      purchaseDate: item.order?.createdAt ? new Date(item.order.createdAt).toLocaleDateString() : '',
      paymentMethod: item.order?.payment?.method || '',
      status: item.status || '',
      usedAt: item.usedAt ? new Date(item.usedAt).toLocaleDateString() : ''
    }));

    await writer.writeRecords(csvData);
    return filePath;
  }

  /**
   * Export data to Excel format
   * @param {Array} data - Data to export
   * @param {Object} options - Export options
   * @returns {string} File path
   */
  async exportToExcel(data, options = {}) {
    const { filename, fields } = options;
    const filePath = path.join(this.exportDir, `${filename}.xlsx`);
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendees');

    // Define columns
    const columns = fields || [
      { header: 'Ticket Number', key: 'ticketNumber', width: 15 },
      { header: 'Event Title', key: 'eventTitle', width: 30 },
      { header: 'Event Date', key: 'eventDate', width: 12 },
      { header: 'Ticket Type', key: 'ticketType', width: 15 },
      { header: 'Price', key: 'price', width: 10 },
      { header: 'First Name', key: 'firstName', width: 15 },
      { header: 'Last Name', key: 'lastName', width: 15 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Order Number', key: 'orderNumber', width: 15 },
      { header: 'Purchase Date', key: 'purchaseDate', width: 12 },
      { header: 'Payment Method', key: 'paymentMethod', width: 12 },
      { header: 'Status', key: 'status', width: 10 },
      { header: 'Used At', key: 'usedAt', width: 12 }
    ];

    worksheet.columns = columns;

    // Add data rows
    data.forEach(item => {
      worksheet.addRow({
        ticketNumber: item.ticketNumber || '',
        eventTitle: item.event?.title || '',
        eventDate: item.event?.dates?.startDate ? new Date(item.event.dates.startDate).toLocaleDateString() : '',
        ticketType: item.ticketType || '',
        price: item.price || 0,
        firstName: item.holder?.firstName || '',
        lastName: item.holder?.lastName || '',
        email: item.holder?.email || '',
        phone: item.holder?.phone || '',
        orderNumber: item.order?.orderNumber || '',
        purchaseDate: item.order?.createdAt ? new Date(item.order.createdAt).toLocaleDateString() : '',
        paymentMethod: item.order?.payment?.method || '',
        status: item.status || '',
        usedAt: item.usedAt ? new Date(item.usedAt).toLocaleDateString() : ''
      });
    });

    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      if (column.width < 10) column.width = 10;
    });

    await workbook.xlsx.writeFile(filePath);
    return filePath;
  }

  /**
   * Export data to PDF format
   * @param {Array} data - Data to export
   * @param {Object} options - Export options
   * @returns {string} File path
   */
  async exportToPDF(data, options = {}) {
    const { filename, eventTitle } = options;
    const filePath = path.join(this.exportDir, `${filename}.pdf`);
    
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Add title
    doc.fontSize(20).text('Attendee List', { align: 'center' });
    if (eventTitle) {
      doc.fontSize(14).text(eventTitle, { align: 'center' });
    }
    doc.moveDown(2);

    // Add export info
    doc.fontSize(10)
       .text(`Exported on: ${new Date().toLocaleDateString()}`, { align: 'right' })
       .text(`Total attendees: ${data.length}`, { align: 'right' });
    doc.moveDown(2);

    // Add table headers
    const tableTop = doc.y;
    const itemHeight = 20;
    const pageHeight = doc.page.height - 100;
    let currentY = tableTop;

    // Headers
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Ticket #', 50, currentY);
    doc.text('Name', 120, currentY);
    doc.text('Email', 250, currentY);
    doc.text('Type', 400, currentY);
    doc.text('Status', 450, currentY);
    
    currentY += itemHeight;
    doc.moveTo(50, currentY).lineTo(550, currentY).stroke();

    // Add data rows
    doc.font('Helvetica').fontSize(9);
    data.forEach((item, index) => {
      // Check if we need a new page
      if (currentY > pageHeight) {
        doc.addPage();
        currentY = 50;
      }

      const name = `${item.holder?.firstName || ''} ${item.holder?.lastName || ''}`.trim();
      const email = item.holder?.email || '';
      const ticketType = item.ticketType || '';
      const status = item.status || '';

      doc.text(item.ticketNumber || '', 50, currentY);
      doc.text(name, 120, currentY);
      doc.text(email, 250, currentY);
      doc.text(ticketType, 400, currentY);
      doc.text(status, 450, currentY);

      currentY += itemHeight;
      
      // Add separator line every 5 rows
      if ((index + 1) % 5 === 0) {
        doc.moveTo(50, currentY).lineTo(550, currentY).stroke();
        currentY += 5;
      }
    });

    doc.end();
    
    return new Promise((resolve, reject) => {
      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
    });
  }

  /**
   * Export data to JSON format
   * @param {Array} data - Data to export
   * @param {Object} options - Export options
   * @returns {string} File path
   */
  async exportToJSON(data, options = {}) {
    const { filename, includeMetadata = true } = options;
    const filePath = path.join(this.exportDir, `${filename}.json`);
    
    const exportData = {
      ...(includeMetadata && {
        metadata: {
          exportedAt: new Date().toISOString(),
          totalRecords: data.length,
          format: 'json',
          version: '1.0'
        }
      }),
      attendees: data
    };

    fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));
    return filePath;
  }

  /**
   * Generate export filename
   * @param {string} eventId - Event ID
   * @param {string} format - Export format
   * @param {Object} filters - Applied filters
   * @returns {string} Filename
   */
  generateFilename(eventId, format, filters = {}) {
    const timestamp = new Date().toISOString().slice(0, 10);
    const filterSuffix = Object.keys(filters).length > 0 ? '_filtered' : '';
    return `attendees_${eventId}_${timestamp}${filterSuffix}`;
  }

  /**
   * Clean up old export files
   * @param {number} maxAge - Maximum age in hours
   */
  async cleanupOldExports(maxAge = 24) {
    try {
      const files = fs.readdirSync(this.exportDir);
      const cutoffTime = Date.now() - (maxAge * 60 * 60 * 1000);
      
      files.forEach(file => {
        const filePath = path.join(this.exportDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime.getTime() < cutoffTime) {
          fs.unlinkSync(filePath);
          console.log(`Cleaned up old export file: ${file}`);
        }
      });
    } catch (error) {
      console.error('Error cleaning up export files:', error);
    }
  }

  /**
   * Get export file info
   * @param {string} filePath - File path
   * @returns {Object} File info
   */
  getFileInfo(filePath) {
    const stats = fs.statSync(filePath);
    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      extension: path.extname(filePath)
    };
  }

  /**
   * Delete export file
   * @param {string} filePath - File path
   */
  deleteFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  /**
   * Get all export files for an event
   * @param {string} eventId - Event ID
   * @returns {Array} List of export files
   */
  getEventExports(eventId) {
    try {
      const files = fs.readdirSync(this.exportDir);
      return files
        .filter(file => file.includes(eventId))
        .map(file => {
          const filePath = path.join(this.exportDir, file);
          const info = this.getFileInfo(filePath);
          return {
            filename: file,
            path: filePath,
            ...info
          };
        });
    } catch (error) {
      console.error('Error getting event exports:', error);
      return [];
    }
  }
}

module.exports = new ExportService();


