const Record = require('../models/recordModel.js');
const cloudinary = require('cloudinary').v2;
const PDFDocument = require('pdfkit');
const xlsx = require('xlsx');

// --- GET ALL RECORDS (with new sorting and filtering) ---
const getRecords = async (req, res) => {
  const { search, status, sort, startDate, endDate } = req.query;
  const query = {};

  if (search) {
    query.$or = [
      { mobileModel: { $regex: search, $options: 'i' } },
      { customerName: { $regex: search, $options: 'i' } },
    ];
  }
  if (status) {
    query.paymentStatus = status;
  }
  if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
          const endOfDay = new Date(endDate);
          endOfDay.setHours(23, 59, 59, 999);
          query.date.$lte = endOfDay;
      }
  }
  let sortOption = {};
  switch (sort) {
      case 'oldest': sortOption = { date: 1 }; break;
      case 'priceHigh': sortOption = { totalPrice: -1 }; break;
      case 'priceLow': sortOption = { totalPrice: 1 }; break;
      default: sortOption = { date: -1 };
  }
  try {
    const records = await Record.find(query).sort(sortOption).populate('user', 'name');
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// --- GET A SINGLE RECORD ---
const getRecordById = async (req, res) => {
    try {
        const record = await Record.findById(req.params.id);
        if (!record) return res.status(44).json({ message: 'Record not found' });
        res.json(record);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// --- CREATE A NEW RECORD ---
const createRecord = async (req, res) => {
  const { date, mobileModel, customerName, customerPhone, complaint, spareParts, serviceCharge, paymentStatus } = req.body;
  try {
    const record = new Record({
      date, mobileModel, customerName, customerPhone, complaint,
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

// --- UPDATE A RECORD (WITH DATE FIX) ---
const updateRecord = async (req, res) => {
  try {
    const record = await Record.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found' });
    if (req.user.role !== 'Admin') return res.status(401).json({ message: 'Not authorized' });
    
    // THIS IS THE CORRECTED SECTION
    const { date, mobileModel, customerName, customerPhone, complaint, spareParts, serviceCharge, paymentStatus } = req.body;
    record.date = date || record.date; // The fix is here
    record.mobileModel = mobileModel || record.mobileModel;
    record.customerName = customerName || record.customerName;
    record.customerPhone = customerPhone || record.customerPhone;
    record.complaint = complaint || record.complaint;
    record.serviceCharge = serviceCharge || record.serviceCharge;
    record.paymentStatus = paymentStatus || record.paymentStatus;
    if (spareParts) record.spareParts = JSON.parse(spareParts);
    
    const updatedRecord = await record.save();
    res.json(updatedRecord);
  } catch (error) {
    res.status(400).json({ message: 'Update failed', error: error.message });
  }
};

// --- DELETE A RECORD ---
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

// --- EXPORT FUNCTIONS ---
const exportExcel = async (req, res) => {
    try {
        const records = await Record.find({}).sort({ date: -1 });
        const data = records.map(r => ({
            'Date': new Date(r.date).toLocaleDateString(),
            'Mobile Model': r.mobileModel,
            'Customer Name': r.customerName,
            'Phone': r.customerPhone,
            'Complaint': r.complaint,
            'Service Charge': r.serviceCharge,
            'Total Price': r.totalPrice,
            'Status': r.paymentStatus,
        }));
        const worksheet = xlsx.utils.json_to_sheet(data);
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, "Records");
        const buffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });
        res.setHeader('Content-Disposition', 'attachment; filename=records.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (error) {
        res.status(500).json({ message: 'Export failed' });
    }
};

const exportPdf = async (req, res) => {
    try {
        const records = await Record.find({}).sort({ date: -1 });
        const doc = new PDFDocument({ margin: 30, size: 'A4' });
        res.setHeader('Content-Disposition', 'attachment; filename=records.pdf');
        res.setHeader('Content-Type', 'application/pdf');
        doc.pipe(res);
        // ... (PDF generation logic) ...
        doc.end();
    } catch (error) {
        res.status(500).json({ message: 'PDF Export failed' });
    }
};

// --- INVOICE FUNCTION ---
const generateInvoicePdf = async (req, res) => {
    try {
        const record = await Record.findById(req.params.id);
        if (!record) return res.status(404).json({ message: 'Record not found' });
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=INV-${record._id}.pdf`);
        doc.pipe(res);
        // ... (full PDF generation code from our previous correct version) ...
        doc.end();
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// --- FINAL EXPORTS ---
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
