// models/TempOTP.js
const mongoose = require('mongoose');

const tempOTPSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    index: true
  },
  otp: {
    type: String,
    required: true
  },
  expiry: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600 // auto-delete after 10 minutes
  }
});

module.exports = mongoose.model('TempOTP', tempOTPSchema);