const Record = require('../models/recordModel.js');
const cloudinary = require('cloudinary').v2;
const PDFDocument = require('pdfkit');
const xlsx = require('xlsx');

// --- EXISTING FUNCTIONS (MUST BE PRESENT) ---

const getRecords = async (req, res) => {
  const { search, status, sort } = req.query;
  const query = {};
  if (search) {
    query.$or = [
      { mobileModel: { $regex: search, $options: 'i' } },
      { customerName: { $regex: search, $options: 'i' } },
    ];
  }
  if (status) query.paymentStatus = status;
  let sortOption = { createdAt: -1 };
  if (sort === 'oldest') sortOption = { createdAt: 1 };
  try {
    const records = await Record.find(query).sort(sortOption).populate('user', 'name');
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

const getRecordById = async (req, res) => {
    try {
        const record = await Record.findById(req.params.id);
        if (!record) return res.status(404).json({ message: 'Record not found' });
        res.json(record);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

const createRecord = async (req, res) => {
  const { mobileModel, customerName, customerPhone, complaint, spareParts, serviceCharge, paymentStatus } = req.body;
  try {
    const record = new Record({
      mobileModel, customerName, customerPhone, complaint,
      spareParts: JSON.parse(spareParts),
      serviceCharge, paymentStatus, user: req.user._id,
    });
    if (req.files && req.files.beforePhoto) {
        record.beforePhoto = { url: req.files.beforePhoto[0].path, public_id: req.files.beforePhoto[0].filename };
    }
    if (req.files && req.files.afterPhoto) {
        record.afterPhoto = { url: req.files.afterPhoto[0].path, public_id: req.files.afterPhoto[0].filename };
    }
    const createdRecord = await record.save();
    res.status(201).json(createdRecord);
  } catch (error) {
    res.status(400).json({ message: 'Invalid data', error: error.message });
  }
};

const updateRecord = async (req, res) => {
  try {
    const record = await Record.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found' });
    if (req.user.role !== 'Admin') return res.status(401).json({ message: 'Not authorized' });
    const { mobileModel, customerName, customerPhone, complaint, spareParts, serviceCharge, paymentStatus } = req.body;
    record.mobileModel = mobileModel || record.mobileModel;
    record.customerName = customerName || record.customerName;
    record.customerPhone = customerPhone || record.customerPhone;
    record.complaint = complaint || record.complaint;
    record.serviceCharge = serviceCharge || record.serviceCharge;
    record.paymentStatus = paymentStatus || record.paymentStatus;
    if (spareParts) record.spareParts = JSON.parse(spareParts);
    if (req.files && req.files.beforePhoto) { /* ... image update logic ... */ }
    if (req.files && req.files.afterPhoto) { /* ... image update logic ... */ }
    const updatedRecord = await record.save();
    res.json(updatedRecord);
  } catch (error) {
    res.status(400).json({ message: 'Update failed', error: error.message });
  }
};

const deleteRecord = async (req, res) => {
    try {
        const record = await Record.findById(req.params.id);
        if (!record) return res.status(404).json({ message: 'Record not found' });
        if (req.user.role !== 'Admin') return res.status(401).json({ message: 'Not authorized' });
        if (record.beforePhoto && record.beforePhoto.public_id) await cloudinary.uploader.destroy(record.beforePhoto.public_id);
        if (record.afterPhoto && record.afterPhoto.public_id) await cloudinary.uploader.destroy(record.afterPhoto.public_id);
        await record.deleteOne();
        res.json({ message: 'Record removed' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

const exportExcel = async (req, res) => { /* ... existing exportExcel function ... */ };
const exportPdf = async (req, res) => { /* ... existing exportPdf function ... */ };

// --- NEW INVOICE FUNCTION ---

const generateInvoicePdf = async (req, res) => {
    try {
        const record = await Record.findById(req.params.id);
        if (!record) return res.status(404).json({ message: 'Record not found' });
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=INV-${record._id}.pdf`);
        doc.pipe(res);
        // --- PDF Content ---
        doc.fontSize(20).font('Helvetica-Bold').text('Cyber Park', { align: 'left' });
        doc.fontSize(10).font('Helvetica').text('Kothamangalam', { align: 'left' });
        doc.moveUp(2);
        doc.fontSize(10).font('Helvetica-Bold').text('SERVICE INVOICE', { align: 'right' });
        doc.font('Helvetica').text(`Invoice #: INV-${record._id}`, { align: 'right' });
        doc.text(`Date Issued: ${new Date().toLocaleDateString()}`, { align: 'right' });
        doc.text(`Service Date: ${record.date.toLocaleDateString()}`, { align: 'right' });
        doc.moveDown(2);
        doc.font('Helvetica-Bold').text('Billed To:');
        doc.font('Helvetica').text(record.customerName);
        if (record.customerPhone) doc.text(record.customerPhone);
        doc.moveDown(2);
        const tableTop = doc.y;
        doc.fontSize(10).font('Helvetica-Bold').text('Description', 50, tableTop).text('Amount (INR)', 450, tableTop, { width: 100, align: 'right' });
        doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
        let currentY = tableTop + 25;
        doc.fontSize(10).font('Helvetica').text(`Service for ${record.mobileModel}`, 50, currentY).fontSize(8).font('Helvetica-Oblique').text(`Complaint: ${record.complaint}`, 55, doc.y);
        doc.fontSize(10).font('Helvetica').text(record.serviceCharge.toFixed(2), 450, currentY, { width: 100, align: 'right' });
        currentY = doc.y + 10;
        record.spareParts.forEach(part => {
            doc.text(`Spare Part: ${part.name}`, 50, currentY).text(part.price.toFixed(2), 450, currentY, { width: 100, align: 'right' });
            currentY += 20;
        });
        doc.moveTo(50, currentY).lineTo(550, currentY).stroke();
        doc.moveDown(2);
        let totalsY = currentY + 10;
        doc.font('Helvetica-Bold').text('Subtotal:', 400, totalsY, { width: 100, align: 'left' }).font('Helvetica').text(record.totalPrice.toFixed(2), 450, totalsY, { width: 100, align: 'right' });
        totalsY += 20;
        doc.font('Helvetica-Bold').fontSize(12).text('Total Amount:', 400, totalsY, { width: 100, align: 'left' }).text(`₹${record.totalPrice.toFixed(2)}`, 450, totalsY, { width: 100, align: 'right' });
        totalsY += 20;
        doc.font('Helvetica-Bold').text('Payment Status:', 400, totalsY, { width: 100, align: 'left' }).fillColor(record.paymentStatus === 'Paid' ? 'green' : 'red').text(record.paymentStatus, 450, totalsY, { width: 100, align: 'right' }).fillColor('black');
        const pageBottom = doc.page.height - 100;
        doc.moveTo(50, pageBottom).lineTo(550, pageBottom).stroke();
        doc.fontSize(8).font('Helvetica').text('Terms & Conditions:', 50, pageBottom + 10).text('1. Service warranty is applicable for 30 days. 2. Warranty does not cover physical or liquid damage.', 50, pageBottom + 20, { align: 'justify' });
        doc.fontSize(10).font('Helvetica-Bold').text('Thank you for choosing Cyber Park!', 50, pageBottom + 50, { align: 'center' });
        doc.end();
    } catch (error) {
        console.error('Invoice generation failed:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// --- CORRECTED EXPORTS ---
module.exports = {
  getRecords,
  getRecordById,
  createRecord,
  updateRecord,
  deleteRecord,
  exportExcel,
  exportPdf,
  generateInvoicePdf
};


// ... inside the createRecord function
const createRecord = async (req, res) => {
  // Add 'date' to this list
  const {
    date,
    mobileModel,
    customerName,
    customerPhone,
    complaint,
    spareParts,
    serviceCharge,
    paymentStatus
  } = req.body;

  try {
    const record = new Record({
      date, // Add 'date' here
      mobileModel,
      customerName,
      customerPhone,
      // ... the rest of the fields remain the same
    });
    // ... the rest of the function remains the same
  } catch (error) {
    // ...
  }
};
