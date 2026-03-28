const router = require('express').Router();
const Unit = require('../models/Unit');

// 1. GET ALL UNITS (Admin sees all, others filtered by App.js)
router.get('/all', async (req, res) => {
    try {
        const units = await Unit.find();
        res.json(units);
    } catch (err) { res.status(500).json({ error: "Fetch failed" }); }
});

// 2. CREATE UNIT (Admin only)
router.post('/create', async (req, res) => {
    try {
        const { code, name } = req.body;
        const newUnit = new Unit({ code, name });
        await newUnit.save();
        res.json({ message: "Unit created" });
    } catch (err) { res.status(500).json({ error: "Create failed" }); }
});

// 3. ASSIGN LECTURER (Admin only)
router.post('/assign-lecturer', async (req, res) => {
    try {
        const { unitId, lecturerId } = req.body;
        await Unit.findByIdAndUpdate(unitId, { lecturerId: lecturerId });
        res.json({ message: "Lecturer assigned" });
    } catch (err) { res.status(500).json({ error: "Assignment failed" }); }
});

// 4. ENROLL (Student)
router.post('/enroll', async (req, res) => {
    try {
        const { userId, unitId } = req.body;
        await Unit.findByIdAndUpdate(unitId, { $addToSet: { enrolledStudents: userId } });
        res.json({ message: "Enrolled" });
    } catch (err) { res.status(500).json({ error: "Enroll failed" }); }
});

// 5. UNENROLL (Student)
router.post('/unenroll', async (req, res) => {
    try {
        const { userId, unitId } = req.body;
        await Unit.findByIdAndUpdate(unitId, { $pull: { enrolledStudents: userId } });
        res.json({ message: "Unenrolled" });
    } catch (err) { res.status(500).json({ error: "Unenroll failed" }); }
});

// 6. DELETE MATERIAL (Lecturer)
router.post('/delete-material', async (req, res) => {
    try {
        const { unitId, materialId } = req.body;
        await Unit.findByIdAndUpdate(unitId, { $pull: { materials: { _id: materialId } } });
        res.json({ message: "Deleted" });
    } catch (err) { res.status(500).json({ error: "Delete failed" }); }
});

module.exports = router;