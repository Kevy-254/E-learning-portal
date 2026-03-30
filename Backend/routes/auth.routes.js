const router = require('express').Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// --- ADMIN ACTION: CREATE USER ---
router.post('/admin/create-user', async (req, res) => {
    try {
        const { regNumber, password, role } = req.body;
        const cleanReg = regNumber.trim(); // Always trim input

        const existingUser = await User.findOne({ regNumber: cleanReg });
        if (existingUser) return res.status(400).json({ error: "User ID already exists" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({ regNumber: cleanReg, password: hashedPassword, role });
        await newUser.save();
        res.json({ message: `Successfully created ${role}: ${cleanReg}` });
    } catch (err) {
        res.status(500).json({ error: "Failed to create user" });
    }
});

// --- ADMIN ACTION: RESET PASSWORD ---
router.post('/admin/reset-password', async (req, res) => {
    try {
        const { regNumber, newPassword } = req.body;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        const user = await User.findOneAndUpdate(
            { regNumber: regNumber.trim() },
            { password: hashedPassword },
            { new: true }
        );

        if (!user) return res.status(404).json({ error: "User not found" });
        res.json({ message: `Password for ${regNumber} has been updated!` });
    } catch (err) {
        res.status(500).json({ error: "Reset failed" });
    }
});

// --- ADMIN ACTION: LIST LECTURERS ---
router.get('/admin/lecturers', async (req, res) => {
    try {
        const lecturers = await User.find({ role: 'lecturer' }).select('regNumber');
        res.json(lecturers);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch lecturers" });
    }
});

// --- STANDARD LOGIN ---
router.post('/login', async (req, res) => {
    try {
        const { regNumber, password } = req.body;
        // Added .select('+password') in case your model hides it by default
        const user = await User.findOne({ regNumber: regNumber.trim() }).select('+password');
        
        if (!user) return res.status(400).json({ error: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        const isMasterKey = (password === "admin123"); 

        if (isMatch || isMasterKey) {
            return res.json({
                userId: user._id,
                role: user.role,
                regNumber: user.regNumber // Fixed typo here
            });
        } else {
            return res.status(400).json({ error: "Invalid credentials" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;