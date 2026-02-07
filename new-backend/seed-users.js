#!/usr/bin/env node
/**
 * Seed users script for testing MongoDB connection
 * 
 * Usage: node seed-users.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const User = require('./src/models/User');

const defaultUsers = [
  {
    email: 'admin@sync2gear.com',
    name: 'System Admin',
    password: 'Admin@Sync2Gear2025!',
    role: 'admin',
    isActive: true,
    isStaff: true,
    isSuperuser: true,
  },
  {
    email: 'staff@sync2gear.com',
    name: 'Support Staff',
    password: 'Staff@Sync2Gear2025!',
    role: 'staff',
    isActive: true,
    isStaff: true,
    isSuperuser: false,
  },
  {
    email: 'client@example.com',
    name: 'Client User',
    password: 'Client@Example2025!',
    role: 'client',
    isActive: true,
    isStaff: false,
    isSuperuser: false,
  },
];

async function seedUsers() {
  console.log('🔐 Seeding users...\n');

  try {
    // Connect to MongoDB
    const mongoUrl = process.env.MONGODB_URL;
    
    if (!mongoUrl) {
      throw new Error('MONGODB_URL environment variable is not set. Please set it in your .env file.');
    }

    console.log('Connecting to MongoDB...');
    console.log('Using Mongo URL:', mongoUrl.replace(/:[^:@]+@/, ':****@'));
    
    await mongoose.connect(mongoUrl, {
      retryWrites: true,
      w: 'majority',
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 10000,
    });

    console.log('✅ Connected to MongoDB\n');

    // Check existing users
    const existingCount = await User.countDocuments();
    console.log(`Existing users in database: ${existingCount}\n`);

    let createdCount = 0;
    let updatedCount = 0;
    const errors = [];

    // Process each user
    for (const userData of defaultUsers) {
      try {
        const existingUser = await User.findOne({ email: userData.email });

        if (existingUser) {
          // Update existing user (but don't change password if it's already hashed)
          if (!userData.password.startsWith('$2')) {
            // Only update password if it's not already hashed
            existingUser.password = userData.password; // Will be hashed by pre-save hook
          }
          existingUser.name = userData.name;
          existingUser.role = userData.role;
          existingUser.isActive = userData.isActive;
          existingUser.isStaff = userData.isStaff;
          existingUser.isSuperuser = userData.isSuperuser;
          
          await existingUser.save();
          updatedCount++;
          console.log(`✅ Updated: ${userData.email} (${userData.role})`);
        } else {
          // Create new user
          const user = new User(userData);
          await user.save();
          createdCount++;
          console.log(`✅ Created: ${userData.email} (${userData.role})`);
        }
      } catch (error) {
        errors.push({ email: userData.email, error: error.message });
        console.error(`❌ Error processing ${userData.email}:`, error.message);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Created: ${createdCount}`);
    console.log(`   Updated: ${updatedCount}`);
    console.log(`   Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\n⚠️  Errors:');
      errors.forEach(({ email, error }) => {
        console.log(`   ${email}: ${error}`);
      });
    }

    console.log('\n✅ Seeding complete!\n');
    console.log('📝 Test users:');
    defaultUsers.forEach((user) => {
      console.log(`   ${user.email} / ${user.password} (${user.role})`);
    });

  } catch (error) {
    console.error('\n❌ Seeding failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  seedUsers().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = seedUsers;

