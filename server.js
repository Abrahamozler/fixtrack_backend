const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const path = require('path');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Body parser
app.use(express.json());

// Enable CORS
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173'
}));

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/records', require('./routes/recordRoutes'));
app.use('/api/summary', require('./routes/summaryRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
// ... after app.use('/api/users'...)
app.use('/api/analysis', require('./routes/analysisRoutes.js'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
