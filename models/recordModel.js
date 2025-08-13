// --- File: models/recordModel.js ---

const mongoose = require('mongoose');

const sparePartSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true, default: 0 }
});

const recordSchema = new mongoose.Schema({
  // --- FIX: Renamed 'date' to 'recordDate' for clarity and consistency ---
  recordDate: { type: Date, default: Date.now },
  mobileModel: { type: String, required: true },
  customerName: { type: String, required: true },
  // --- FIX: Customer phone is now optional, matching the frontend ---
  customerPhone: { type: String, required: false },
  complaint: { type: String, required: true },
  spareParts: [sparePartSchema],
  serviceCharge: { type: Number, required: true, default: 0 },
  totalPrice: { type: Number, default: 0 }, // It will be calculated, so it doesn't need to be required here
  paymentStatus: { type: String, enum: ['Paid', 'Pending'], default: 'Pending' },
  beforePhoto: { url: String, public_id: String },
  afterPhoto: { url: String, public_id: String },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// --- ENHANCEMENT: This is excellent logic. No changes needed. ---
// Pre-save middleware to calculate total price automatically.
recordSchema.pre('save', function(next) {
  const sparePartsTotal = this.spareParts.reduce((acc, part) => acc + part.price, 0);
  this.totalPrice = sparePartsTotal + this.serviceCharge;
  next();
});

const Record = mongoose.model('Record', recordSchema);
module.exports = Record;
