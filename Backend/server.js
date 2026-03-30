const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/university_db';

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
app.use('/api/news', require('./routes/news.routes'));

// 4. FRONTEND (static)
const frontendPath = path.join(__dirname, '..', 'Frontend');
app.use(express.static(frontendPath));

// Serve the frontend for non-API routes
app.get(/^\/(?!api(?:\/|$)).*/, (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// 5. DATABASE CONNECTION
mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('Connected to MongoDB: university_db');
        app.listen(PORT, HOST, () => {
            console.log(`Server active on http://${HOST}:${PORT}`);
        });
    })
    .catch(err => console.error('DB Connection Error:', err.message));

// 6. ERROR HANDLER
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send({ error: 'Server Internal Error' });
});
