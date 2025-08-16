const Record = require('../models/recordModel.js');
const cloudinary = require('cloudinary').v2;
const PDFDocument = require('pdfkit');
const xlsx = require('xlsx');

// --- GET ALL RECORDS (with sorting, filtering, pagination) ---
const getRecords = async (req, res) => {
  const { search, status, sort, startDate, endDate, page = 1 } = req.query;
  const query = {};
  const limit = 10; // 10 per page
  const skip = (page - 1) * limit;

  if (search) {
    query.$or = [
      { mobileModel: { $regex: search, $options: 'i' } },
      { customerName: { $regex: search, $options: 'i' } },
    ];
  }
  if (status) {
    query.paymentStatus = status;
  }
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
      .populate('user', 'name');

    const totalRecords = await Record.countDocuments(query);

    res.json({
      records,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalRecords / limit),
    });
  } catch (error) {
    console.error('Error fetching records:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// --- GET SINGLE RECORD ---
const getRecordById = async (req, res) => {
  try {
    const record = await Record.findById(req.params.id).populate('user', 'name');
    if (!record) return res.status(404).json({ message: 'Record not found' });
    res.json(record);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// --- CREATE NEW RECORD ---
const createRecord = async (req, res) => {
  try {
    const {
      customerName,
      mobileModel,
      problemDescription,
      totalPrice,
      paymentStatus,
    } = req.body;

    let beforePhotoUrl = null;
    let afterPhotoUrl = null;

    if (req.files?.beforePhoto) {
      const before = await cloudinary.uploader.upload(req.files.beforePhoto[0].path, {
        folder: 'records',
      });
      beforePhotoUrl = before.secure_url;
    }

    if (req.files?.afterPhoto) {
      const after = await cloudinary.uploader.upload(req.files.afterPhoto[0].path, {
        folder: 'records',
      });
      afterPhotoUrl = after.secure_url;
    }

    const newRecord = new Record({
      customerName,
      mobileModel,
      problemDescription,
      totalPrice,
      paymentStatus,
      date: new Date(),
      beforePhoto: beforePhotoUrl,
      afterPhoto: afterPhotoUrl,
      user: req.user?._id,
    });

    const saved = await newRecord.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error('Error creating record:', error);
    res.status(500).json({ message: 'Failed to create record', error: error.message });
  }
};

// --- UPDATE RECORD ---
const updateRecord = async (req, res) => {
  try {
    const record = await Record.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found' });

    const { customerName, mobileModel, problemDescription, totalPrice, paymentStatus } = req.body;

    record.customerName = customerName || record.customerName;
    record.mobileModel = mobileModel || record.mobileModel;
    record.problemDescription = problemDescription || record.problemDescription;
    record.totalPrice = totalPrice || record.totalPrice;
    record.paymentStatus = paymentStatus || record.paymentStatus;

    if (req.files?.beforePhoto) {
      const before = await cloudinary.uploader.upload(req.files.beforePhoto[0].path, {
        folder: 'records',
      });
      record.beforePhoto = before.secure_url;
    }

    if (req.files?.afterPhoto) {
      const after = await cloudinary.uploader.upload(req.files.afterPhoto[0].path, {
        folder: 'records',
      });
      record.afterPhoto = after.secure_url;
    }

    const updated = await record.save();
    res.json(updated);
  } catch (error) {
    console.error('Error updating record:', error);
    res.status(500).json({ message: 'Failed to update record' });
  }
};

// --- DELETE RECORD ---
const deleteRecord = async (req, res) => {
  try {
    const record = await Record.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found' });

    await record.deleteOne();
    res.json({ message: 'Record removed' });
  } catch (error) {
    console.error('Error deleting record:', error);
    res.status(500).json({ message: 'Failed to delete record' });
  }
};

// --- EXPORT EXCEL ---
const exportExcel = async (req, res) => {
  try {
    const records = await Record.find().lean();
    const worksheet = xlsx.utils.json_to_sheet(records);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Records');
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=records.xlsx');
    res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ message: 'Failed to export Excel' });
  }
};

// --- EXPORT PDF ---
const exportPdf = async (req, res) => {
  try {
    const records = await Record.find().lean();
    const doc = new PDFDocument();
    res.setHeader('Content-Disposition', 'attachment; filename=records.pdf');
    res.setHeader('Content-Type', 'application/pdf');

    doc.pipe(res);
    records.forEach((r, i) => {
      doc.text(`${i + 1}. ${r.customerName} - ${r.mobileModel} - ${r.problemDescription} - ₹${r.totalPrice}`);
    });
    doc.end();
  } catch (error) {
    res.status(500).json({ message: 'Failed to export PDF' });
  }
};

// --- INVOICE PDF ---
const generateInvoicePdf = async (req, res) => {
  try {
    const record = await Record.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found' });

    const doc = new PDFDocument();
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${record._id}.pdf`);
    res.setHeader('Content-Type', 'application/pdf');

    doc.pipe(res);
    doc.fontSize(20).text('FixTrack Invoice', { align: 'center' });
    doc.moveDown();
    doc.text(`Customer: ${record.customerName}`);
    doc.text(`Mobile Model: ${record.mobileModel}`);
    doc.text(`Problem: ${record.problemDescription}`);
    doc.text(`Total Price: ₹${record.totalPrice}`);
    doc.text(`Payment Status: ${record.paymentStatus}`);
    doc.end();
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate invoice PDF' });
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
  generateInvoicePdf,
};
