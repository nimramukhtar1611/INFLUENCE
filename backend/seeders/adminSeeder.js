// server/seeders/adminSeeder.js
const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');
require('node:dns/promises').setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
require('dotenv').config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const existingAdmin = await Admin.findOne({ email: 'InfluenceX102@gmail.com' });
    if (existingAdmin) {
      console.log('⚠️ Admin already exists');
      process.exit(0);
    }
    const admin = new Admin({
      email: 'InfluenceX102@gmail.com',
      password: 'chsyen382738jsi2',     
      fullName: 'admininfluence',
      role: 'super_admin',
      permissions: [
        'manage_users',
        'manage_campaigns',
        'manage_disputes',
        'manage_payments',
        'manage_settings',
        'view_analytics'
      ],
      isActive: true
    });

    await admin.save();
    console.log(' Admin created successfully!');
    console.log(' Email:', admin.email);
    console.log(' Password: chsyen382738jsi2');

  } catch (error) {
    console.error('❌ Error creating admin:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

createAdmin();