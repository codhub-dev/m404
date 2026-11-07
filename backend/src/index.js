require('dotenv').config();
const express = require('express');
const cors = require('cors');
const passport = require('./config/passport');
const connectDB = require('./config/db');

connectDB();

const app = express();

app.set('trust proxy', 1);
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: false,
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());
app.use(passport.initialize());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/protein', require('./routes/protein'));
app.use('/api/packet', require('./routes/packet'));

app.get('/api/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
