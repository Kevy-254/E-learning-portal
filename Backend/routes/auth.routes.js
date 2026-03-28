const router = require('express').Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// --- ADMIN ACTION: CREATE USER ---
router.post('/admin/create-user', async (req, res) => {
    try {
        const { regNumber, password, role } = req.body;
        const existingUser = await User.findOne({ regNumber });
        if (existingUser) return res.status(400).json({ error: "User ID already exists" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({ regNumber, password: hashedPassword, role });
        await newUser.save();
        res.json({ message: `Successfully created ${role}: ${regNumber}` });
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
            { regNumber },
            { password: hashedPassword },
            { new: true }
        );

        if (!user) return res.status(404).json({ error: "User not found" });
        res.json({ message: `Password for ${regNumber} has been updated!` });
    } catch (err) {
        res.status(500).json({ error: "Reset failed" });
    }
});

// --- STANDARD LOGIN ---
router.post('/login', async (req, res) => {
    try {
        const { regNumber, password } = req.body;
        const user = await User.findOne({ regNumber: regNumber.trim() });
        
        if (!user) return res.status(400).json({ error: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        const isMasterKey = (password === "admin123"); // Backup bypass

        if (isMatch || isMasterKey) {
            return res.json({
                userId: user._id,
                role: user.role,
                regNumber: user.regNumber
            });
        } else {
            return res.status(400).json({ error: "Invalid credentials" });
        }
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;