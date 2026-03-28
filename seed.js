const mongoose = require('mongoose');
const Unit = require('./backend/models/Unit'); // Path to your model
require('dotenv').config();

const sampleUnits = [
    { name: "Object Oriented Programming", code: "CS101" },
    { name: "Database Systems", code: "CS202" },
    { name: "Network Security", code: "CS404" },
    { name: "Artificial Intelligence", code: "AI301" }
];

async function seedDatabase() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB for seeding...");

        // Clear existing units to avoid duplicates
        await Unit.deleteMany({});
        
        // Insert new units
        await Unit.insertMany(sampleUnits);
        
        console.log("✅ Database Seeded with 4 Units!");
        process.exit();
    } catch (err) {
        console.error("❌ Seeding failed:", err);
        process.exit(1);
    }
}

seedDatabase();