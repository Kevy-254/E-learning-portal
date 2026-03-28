const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    regNumber: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['student', 'lecturer'], default: 'student' }
});

module.exports = mongoose.model('User', UserSchema);