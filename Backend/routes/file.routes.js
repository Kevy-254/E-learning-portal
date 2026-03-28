const router = require('express').Router();
const multer = require('multer');
const Unit = require('../models/Unit');
const path = require('path');

// Storage Config
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

router.post('/upload/:unitId', upload.single('file'), async (req, res) => {
    try {
        const { unitId } = req.params;

        // Force forward slashes and a leading slash for the web
        // This fixes the "uploads\file.docx" issue found in your Compass
        const cleanUrl = `/uploads/${req.file.filename}`.replace(/\\/g, '/');

        const fileData = { 
            name: req.file.originalname, 
            url: cleanUrl,
            uploadedAt: new Date()
        };

        await Unit.findByIdAndUpdate(unitId, { 
            $push: { materials: fileData } 
        });

        res.json({ message: "File uploaded and linked successfully!" });
    } catch (err) {
        console.error("Upload Error:", err);
        res.status(500).json({ error: "Upload failed" });
    }
});

module.exports = router;