const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// 1. MIDDLEWARE
app.use(cors()); 
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// 2. STATIC FOLDERS (For file uploads)
const uploadsPath = path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadsPath));

// 3. ROUTES
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/units', require('./routes/unit.routes'));
app.use('/api/files', require('./routes/file.routes'));

// 4. DATABASE CONNECTION
// Points exactly to university_db as seen in your Compass
const MONGO_URI = 'mongodb://127.0.0.1:27017/university_db';

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log("✅ Connected to MongoDB: university_db");
        const PORT = 5000;
        app.listen(PORT, () => console.log(`🚀 Server active on port ${PORT}`));
    })
    .catch(err => console.error("❌ DB Connection Error:", err.message));

// 5. ERROR HANDLER
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send({ error: 'Server Internal Error' });
});