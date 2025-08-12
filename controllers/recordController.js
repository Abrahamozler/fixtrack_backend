const Record = require('../models/recordModel.js');
const cloudinary = require('cloudinary').v2;
const PDFDocument = require('pdfkit');
const xlsx = require('xlsx');

// ... (keep the existing functions: getRecords, getRecordById, createRecord, updateRecord, deleteRecord, exportExcel, exportPdf) ...

// NEW FUNCTION: Generate PDF Invoice for a single record
const generateInvoicePdf = async (req, res) => {
    try {
        const record = await Record.findById(req.params.id);
        if (!record) {
            return res.status(404).json({ message: 'Record not found' });
        }

        const doc = new PDFDocument({ margin: 50, size: 'A4' });

        // Set headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=INV-${record._id}.pdf`);
        doc.pipe(res);

        // --- Start PDF Content ---

        // Header
        doc.fontSize(20).font('Helvetica-Bold').text('Cyber Park', { align: 'left' });
        doc.fontSize(10).font('Helvetica').text('Kothamangalam', { align: 'left' });

        doc.moveUp(2);
        doc.fontSize(10).font('Helvetica-Bold').text('SERVICE INVOICE', { align: 'right' });
        doc.font('Helvetica').text(`Invoice #: INV-${record._id}`, { align: 'right' });
        doc.text(`Date Issued: ${new Date().toLocaleDateString()}`, { align: 'right' });
        doc.text(`Service Date: ${record.date.toLocaleDateString()}`, { align: 'right' });
        
        doc.moveDown(2);

        // Customer Info
        doc.font('Helvetica-Bold').text('Billed To:');
        doc.font('Helvetica').text(record.customerName);
        if (record.customerPhone) {
            doc.text(record.customerPhone);
        }

        doc.moveDown(2);

        // --- Invoice Table ---
        const tableTop = doc.y;
        const descriptionX = 50;
        const amountX = 450;
        
        // Table Header
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Description', descriptionX, tableTop);
        doc.text('Amount (INR)', amountX, tableTop, { width: 100, align: 'right' });
        doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
        
        let currentY = tableTop + 25;
        doc.fontSize(10).font('Helvetica');

        // Service Item
        doc.text(`Service for ${record.mobileModel}`, descriptionX, currentY);
        doc.fontSize(8).font('Helvetica-Oblique').text(`Complaint: ${record.complaint}`, descriptionX + 5, doc.y);
        doc.fontSize(10).font('Helvetica').text(record.serviceCharge.toFixed(2), amountX, currentY, { width: 100, align: 'right' });
        currentY = doc.y + 10;

        // Spare Parts Items
        record.spareParts.forEach(part => {
            doc.text(`Spare Part: ${part.name}`, descriptionX, currentY);
            doc.text(part.price.toFixed(2), amountX, currentY, { width: 100, align: 'right' });
            currentY += 20;
        });

        doc.moveTo(50, currentY).lineTo(550, currentY).stroke();
        doc.moveDown(2);

        // --- Totals ---
        let totalsY = currentY + 10;
        const totalsAmountX = 400;
        doc.font('Helvetica-Bold');
        doc.text('Subtotal:', totalsAmountX, totalsY, { width: 100, align: 'left' });
        doc.font('Helvetica').text(record.totalPrice.toFixed(2), amountX, totalsY, { width: 100, align: 'right' });
        totalsY += 20;
        
        doc.font('Helvetica-Bold').fontSize(12);
        doc.text('Total Amount:', totalsAmountX, totalsY, { width: 100, align: 'left' });
        doc.text(`₹${record.totalPrice.toFixed(2)}`, amountX, totalsY, { width: 100, align: 'right' });
        totalsY += 20;
        
        doc.font('Helvetica-Bold');
        doc.text('Payment Status:', totalsAmountX, totalsY, { width: 100, align: 'left' });
        doc.fillColor(record.paymentStatus === 'Paid' ? 'green' : 'red').text(record.paymentStatus, amountX, totalsY, { width: 100, align: 'right' });
        doc.fillColor('black'); // Reset color

        // Footer
        const pageBottom = doc.page.height - 100;
        doc.moveTo(50, pageBottom).lineTo(550, pageBottom).stroke();
        doc.fontSize(8).font('Helvetica');
        doc.text('Terms & Conditions:', 50, pageBottom + 10);
        doc.text('1. Service warranty is applicable for 30 days. 2. Warranty does not cover physical or liquid damage.', 50, pageBottom + 20, { align: 'justify' });
        doc.fontSize(10).font('Helvetica-Bold').text('Thank you for choosing Cyber Park!', 50, pageBottom + 50, { align: 'center' });
        
        // --- End PDF Content ---
        doc.end();

    } catch (error) {
        console.error('Invoice generation failed:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};


// Make sure to add the new function to the exports
module.exports = {
  getRecords,
  getRecordById,
  createRecord,
  updateRecord,
  deleteRecord,
  exportExcel,
  exportPdf,
  generateInvoicePdf // The new function
};
