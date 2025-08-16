const Record = require('../models/recordModel.js');
const cloudinary = require('cloudinary').v2;
const PDFDocument = require('pdfkit');
const xlsx = require('xlsx');

// --- GET ALL RECORDS (with sorting, filtering, pagination) ---
const getRecords = async (req, res) => {
  const { search, status, sort, startDate, endDate, page = 1 } = req.query;
  const query = {};
  const limit = 10;
  const skip = (page - 1) * limit;

  if (search) {
    query.$or = [
      { mobileModel: { $regex: search, $options: 'i' } },
      { customerName: { $regex: search, $options: 'i' } },
    ];
  }
  if (status) query.paymentStatus = status;
  if (startDate) {
    if (!query.date) query.date = {};
    query.date.$gte = new Date(startDate);
  }
  if (endDate) {
    if (!query.date) query.date = {};
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);
    query.date.$lte = endOfDay;
  }

  let sortOption = {};
  switch (sort) {
    case 'oldest': sortOption = { date: 1 }; break;
    case 'priceHigh': sortOption = { totalPrice: -1 }; break;
    case 'priceLow': sortOption = { totalPrice: 1 }; break;
    default: sortOption = { date: -1 }; // newest first
  }

  try {
    const records = await Record.find(query)
      .sort(sortOption)
      .limit(limit)
      .skip(skip)
      .populate('user', 'username');

    const totalRecords = await Record.countDocuments(query);

    res.json({
      records,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalRecords / limit),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// --- GET RECORD BY ID ---
const getRecordById = async (req, res) => {
  try {
    const record = await Record.findById(req.params.id).populate('user', 'username');
    if (record) res.json(record);
    else res.status(404).json({ message: 'Record not found' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// --- CREATE NEW RECORD ---
const createRecord = async (req, res) => {
  try {
    const { date, mobileModel, customerName, customerPhone, complaint, serviceCharge, paymentStatus, spareParts } = req.body;

    let beforePhoto = null;
    let afterPhoto = null;

    if (req.files?.beforePhoto) {
      const uploaded = await cloudinary.uploader.upload(req.files.beforePhoto[0].path, { folder: 'records' });
      beforePhoto = { url: uploaded.secure_url, public_id: uploaded.public_id };
    }
    if (req.files?.afterPhoto) {
      const uploaded = await cloudinary.uploader.upload(req.files.afterPhoto[0].path, { folder: 'records' });
      afterPhoto = { url: uploaded.secure_url, public_id: uploaded.public_id };
    }

    const record = new Record({
      date,
      mobileModel,
      customerName,
      customerPhone,
      complaint,
      serviceCharge,
      paymentStatus,
      spareParts: JSON.parse(spareParts || '[]'),
      beforePhoto,
      afterPhoto,
      user: req.user._id
    });

    const createdRecord = await record.save();
    res.status(201).json(createdRecord);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// --- UPDATE RECORD ---
const updateRecord = async (req, res) => {
  try {
    const record = await Record.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found' });

    const { date, mobileModel, customerName, customerPhone, complaint, serviceCharge, paymentStatus, spareParts } = req.body;

    record.date = date || record.date;
    record.mobileModel = mobileModel || record.mobileModel;
    record.customerName = customerName || record.customerName;
    record.customerPhone = customerPhone || record.customerPhone;
    record.complaint = complaint || record.complaint;
    record.serviceCharge = serviceCharge || record.serviceCharge;
    record.paymentStatus = paymentStatus || record.paymentStatus;
    record.spareParts = spareParts ? JSON.parse(spareParts) : record.spareParts;

    if (req.files?.beforePhoto) {
      if (record.beforePhoto?.public_id) {
        await cloudinary.uploader.destroy(record.beforePhoto.public_id);
      }
      const uploaded = await cloudinary.uploader.upload(req.files.beforePhoto[0].path, { folder: 'records' });
      record.beforePhoto = { url: uploaded.secure_url, public_id: uploaded.public_id };
    }
    if (req.files?.afterPhoto) {
      if (record.afterPhoto?.public_id) {
        await cloudinary.uploader.destroy(record.afterPhoto.public_id);
      }
      const uploaded = await cloudinary.uploader.upload(req.files.afterPhoto[0].path, { folder: 'records' });
      record.afterPhoto = { url: uploaded.secure_url, public_id: uploaded.public_id };
    }

    const updatedRecord = await record.save();
    res.json(updatedRecord);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// --- DELETE RECORD ---
const deleteRecord = async (req, res) => {
  try {
    const record = await Record.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found' });

    if (record.beforePhoto?.public_id) await cloudinary.uploader.destroy(record.beforePhoto.public_id);
    if (record.afterPhoto?.public_id) await cloudinary.uploader.destroy(record.afterPhoto.public_id);

    await record.deleteOne();
    res.json({ message: 'Record removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// --- EXPORT EXCEL ---
const exportExcel = async (req, res) => {
  try {
    const records = await Record.find().populate('user', 'username');
    const data = records.map(r => ({
      Date: r.date.toISOString().split('T')[0],
      MobileModel: r.mobileModel,
      Customer: r.customerName,
      Phone: r.customerPhone || '',
      Complaint: r.complaint,
      ServiceCharge: r.serviceCharge,
      TotalPrice: r.totalPrice,
      PaymentStatus: r.paymentStatus,
    }));

    const worksheet = xlsx.utils.json_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Records');
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=records.xlsx');
    res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// --- EXPORT PDF ---
const exportPdf = async (req, res) => {
  try {
    const records = await Record.find().populate('user', 'username');
    const doc = new PDFDocument();
    res.setHeader('Content-Disposition', 'attachment; filename=records.pdf');
    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);

    doc.fontSize(18).text('Repair Records', { align: 'center' }).moveDown();
    records.forEach(r => {
      doc.fontSize(12).text(`Date: ${r.date.toISOString().split('T')[0]}`);
      doc.text(`Model: ${r.mobileModel}`);
      doc.text(`Customer: ${r.customerName}`);
      if (r.customerPhone) doc.text(`Phone: ${r.customerPhone}`);
      doc.text(`Complaint: ${r.complaint}`);
      doc.text(`Service Charge: ₹${r.serviceCharge}`);
      doc.text(`Total Price: ₹${r.totalPrice}`);
      doc.text(`Status: ${r.paymentStatus}`);
      doc.moveDown();
    });

    doc.end();
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// --- GENERATE INVOICE PDF ---
const generateInvoicePdf = async (req, res) => {
  try {
    const record = await Record.findById(req.params.id).populate('user', 'username');
    if (!record) return res.status(404).json({ message: 'Record not found' });

    const doc = new PDFDocument();
    res.setHeader('Content-Disposition', `attachment; filename=invoice_${record._id}.pdf`);
    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);

    doc.fontSize(20).text('Invoice', { align: 'center' }).moveDown();
    doc.fontSize(12).text(`Date: ${record.date.toISOString().split('T')[0]}`);
    doc.text(`Customer: ${record.customerName}`);
    if (record.customerPhone) doc.text(`Phone: ${record.customerPhone}`);
    doc.text(`Mobile Model: ${record.mobileModel}`);
    doc.text(`Complaint: ${record.complaint}`).moveDown();

    doc.text('Spare Parts:', { underline: true });
    record.spareParts.forEach(p => {
      doc.text(`${p.name} - ₹${p.price}`);
    });
    doc.moveDown();
    doc.text(`Service Charge: ₹${record.serviceCharge}`);
    doc.text(`Total Price: ₹${record.totalPrice}`, { bold: true });
    doc.text(`Payment Status: ${record.paymentStatus}`);

    doc.end();
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// --- EXPORTS ---
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
