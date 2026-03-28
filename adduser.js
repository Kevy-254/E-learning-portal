const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./Backend/models/User'); 

async function seedUsers() {
    try {
        // 1. Connect to the correct DB from your .env
        await mongoose.connect('mongodb://127.0.0.1:27017/university_db');
        console.log("Connected to university_db...");

        // 2. Clear all existing users to avoid "Duplicate Key" errors
        await User.deleteMany({});
        console.log("Old users cleared.");

        const salt = await bcrypt.genSalt(10);

        // 3. Create Lecturer
        const lecturerPassword = await bcrypt.hash('password123', salt);
        await User.create({
            regNumber: 'LECTURER01',
            password: lecturerPassword,
            role: 'lecturer',
            name: 'Dr. Smith'
        });

        // 4. Create Student
        const studentPassword = await bcrypt.hash('student123', salt);
        await User.create({
            regNumber: 'STUDENT001',
            password: studentPassword,
            role: 'student',
            name: 'John Doe'
        });

        console.log('---');
        console.log('✅ SUCCESS! Database is ready.');
        console.log('Lecturer: LECTURER01 / password123');
        console.log('Student:  STUDENT001 / student123');
        console.log('---');
        
        process.exit();
    } catch (err) {
        console.error('❌ Error seeding users:', err.message);
        process.exit(1);
    }
}

seedUsers();