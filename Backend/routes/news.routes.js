const router = require('express').Router();
const mongoose = require('mongoose');

// Simple Schema for News
const News = mongoose.model('News', new mongoose.Schema({
    title: String,
    content: String,
    date: { type: Date, default: Date.now }
}));

// Get all news
router.get('/', async (req, res) => {
    const news = await News.find().sort({ date: -1 });
    res.json(news);
});

// Admin: Post news
router.post('/add', async (req, res) => {
    const { title, content } = req.body;
    const newNews = new News({ title, content });
    await newNews.save();
    res.json({ message: "Announcement posted!" });
});

// Admin: Delete announcement
router.delete('/:id', async (req, res) => {
    try {
        const deleted = await News.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ error: "Announcement not found" });
        res.json({ message: "Announcement deleted" });
    } catch (err) {
        res.status(500).json({ error: "Delete failed" });
    }
});

module.exports = router;
