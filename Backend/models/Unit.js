const mongoose = require('mongoose');

const UnitSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    lecturerId: { type: String, default: null }, // Stores the Staff ID of the lecturer
    enrolledStudents: [String], // Array of Student User IDs
    materials: [{
        name: String,
        url: String
    }]
});

module.exports = mongoose.model('Unit', UnitSchema);