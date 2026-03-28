const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// 1. Connect to your database
mongoose.connect('mongodb://127.0.0.1:27017/university_db')
    .then(async () => {
        console.log("Connected to MongoDB...");

        // 2. Define a simple schema to talk to the users collection
        const User = mongoose.model('User', new mongoose.Schema({
            regNumber: String,
            password: { type: String },
            role: String
        }), 'users');

        // 3. Generate a fresh hash on YOUR machine for 'admin123'
        const myFreshHash = await bcrypt.hash("admin123", 10);
        console.log("New Hash Generated: ", myFreshHash);

        // 4. Update LECTURER01 and ADMIN01
        await User.updateOne({ regNumber: "LECTURER01" }, { $set: { password: myFreshHash } });
        await User.updateOne({ regNumber: "ADMIN01" }, { $set: { password: myFreshHash } });

        console.log("✅ SUCCESS: Database updated with machine-local hashes.");
        process.exit();
    })
    .catch(err => console.error("Database error:", err));