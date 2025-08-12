const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db'); // Path is likely correct
const path = require('path');

dotenv.config();
connectDB();

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.CLIENT_URL || '*' }));

// API Routes - Corrected Paths (no '/src')
app.use('/api/auth', require('./routes/authRoutes.js'));
app.use('/api/records', require('./routes/recordRoutes.js'));
app.use('/api/summary', require('./routes/summaryRoutes.js'));
app.use('/api/users', require('./routes/userRoutes.js'));
app.use('/api/analysis', require('./routes/analysisRoutes.js'));


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
