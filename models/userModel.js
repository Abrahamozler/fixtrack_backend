const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Username is now the unique identifier
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['Admin', 'Staff'], default: 'Staff' }
}, { timestamps: true });

// ... (The password hashing functions remain exactly the same) ...

const User = mongoose.model('User', userSchema);
module.exports = User;
