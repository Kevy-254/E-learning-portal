const router = require('express').Router();
const multer = require('multer');
const mongoose = require('mongoose');
const Unit = require('../models/Unit');
const path = require('path');

function resolveUnitQuery(unitId) {
    if (!unitId) return null;
    if (mongoose.Types.ObjectId.isValid(unitId)) {
        return { _id: unitId };
    }
    const safe = String(unitId).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return { code: new RegExp(`^${safe}$`, 'i') };
}

// Storage Config
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

router.post('/upload/:unitId', upload.single('file'), async (req, res) => {
    try {
        const { unitId } = req.params;
        const query = resolveUnitQuery(unitId);
        if (!query) return res.status(400).json({ error: "Unit id required" });
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });

        // Force forward slashes and a leading slash for the web
        // This fixes the "uploads\file.docx" issue found in your Compass
        const cleanUrl = `/uploads/${req.file.filename}`.replace(/\\/g, '/');

        const fileData = { 
            name: req.file.originalname, 
            url: cleanUrl,
            uploadedAt: new Date()
        };

        const updated = await Unit.findOneAndUpdate(
            query,
            { $push: { materials: fileData } },
            { new: true }
        );
        if (!updated) return res.status(404).json({ error: "Unit not found" });

        res.json({ message: "File uploaded and linked successfully!" });
    } catch (err) {
        console.error("Upload Error:", err);
        res.status(500).json({ error: "Upload failed" });
    }
});

module.exports = router;
