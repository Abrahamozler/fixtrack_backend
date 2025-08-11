const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const app = express();
app.use(express.json({limit: '10mb'}));
app.use(cors());
app.use(express.static('public'));

// MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
.then(()=>console.log('MongoDB connected'))
.catch(err=>console.error(err));

// Schemas
const userSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  passwordHash: String,
  role: { type: String, default: 'staff' }
});
const User = mongoose.model('User', userSchema);

const repairSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  model: String,
  customerName: String,
  customerPhone: String,
  complaint: String,
  parts: [{ name: String, price: Number }],
  serviceCharge: Number,
  total: Number,
  status: String,
  photos: [String],
  owner: String,
  createdAt: { type: Date, default: Date.now }
});
const Repair = mongoose.model('Repair', repairSchema);

// Auth helpers
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

app.post('/api/auth/register', async (req, res)=>{
  const { email, password } = req.body;
  if(!email||!password) return res.status(400).json({ message: 'Email & password required' });
  const existing = await User.findOne({ email });
  if(existing) return res.status(400).json({ message: 'User exists' });
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  const u = new User({ email, passwordHash: hash });
  await u.save();
  res.json({ message: 'ok' });
});

app.post('/api/auth/login', async (req, res)=>{
  const { email, password } = req.body;
  const u = await User.findOne({ email });
  if(!u) return res.status(400).json({ message: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, u.passwordHash);
  if(!ok) return res.status(400).json({ message: 'Invalid credentials' });
  const token = jwt.sign({ id: u._id, email: u.email, role: u.role }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, email: u.email });
});

// middleware
function auth(req, res, next){
  const authHeader = req.headers.authorization;
  if(!authHeader) return res.status(401).json({ message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  try{
    const data = jwt.verify(token, JWT_SECRET);
    req.user = data; next();
  }catch(e){ return res.status(401).json({ message: 'Invalid token' }) }
}

// Repairs
app.get('/api/repairs', auth, async (req, res)=>{
  const repairs = await Repair.find().sort({ createdAt: -1 });
  res.json(repairs);
});

app.post('/api/repairs', auth, async (req, res)=>{
  const body = req.body;
  const r = new Repair({ ...body, owner: req.user.email });
  await r.save();
  res.json(r);
});

app.put('/api/repairs/:id', auth, async (req, res)=>{
  await Repair.findByIdAndUpdate(req.params.id, req.body);
  res.json({ message: 'updated' });
});

app.delete('/api/repairs/:id', auth, async (req, res)=>{
  await Repair.findByIdAndDelete(req.params.id);
  res.json({ message: 'deleted' });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=> console.log('Server listening on', PORT));
