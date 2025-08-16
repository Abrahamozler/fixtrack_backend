const mongoose = require('mongoose');

const sparePartSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true, default: 0 }
});

const recordSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  mobileModel: { type: String, required: true },
  customerName: { type: String, required: true },
  customerPhone: { type: String }, // ✅ made optional
  complaint: { type: String, required: true },
  spareParts: [sparePartSchema],
  serviceCharge: { type: Number, required: true, default: 0 },
  totalPrice: { type: Number, required: true, default: 0 },
  paymentStatus: { type: String, enum: ['Paid', 'Pending'], default: 'Pending' },
  beforePhoto: { url: String, public_id: String },
  afterPhoto: { url: String, public_id: String },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// Pre-save middleware to calculate total price
recordSchema.pre('save', function(next) {
  const sparePartsTotal = this.spareParts.reduce((acc, part) => acc + part.price, 0);
  this.totalPrice = sparePartsTotal + this.serviceCharge;
  next();
});

const Record = mongoose.model('Record', recordSchema);
module.exports = Record;
