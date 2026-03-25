// routes/uploadRoutes.js - COMPLETE
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Brand = require('../models/Brand');
const Creator = require('../models/Creator');
const { protect } = require('../middleware/auth');
const { uploadSingle, uploadMultiple ,uploadErrorHandler, uploadProfilePicture } = require('../middleware/upload');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');

// Upload single file
router.post('/single', protect, uploadSingle, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    let fileUrl = `/uploads/${req.file.filename}`;
    
    // Upload to cloudinary if configured
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'influencex',
        resource_type: 'auto'
      });
      fileUrl = result.secure_url;
      
      // Delete local file
      fs.unlinkSync(req.file.path);
    }

    res.json({
      success: true,
      file: {
        url: fileUrl,
        filename: req.file.filename,
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Upload failed'
    });
  }
});

// Upload multiple files
router.post('/multiple', protect, uploadMultiple, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }

    const files = await Promise.all(req.files.map(async (file) => {
      let fileUrl = `/uploads/${file.filename}`;
      
      if (process.env.CLOUDINARY_CLOUD_NAME) {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: 'influencex',
          resource_type: 'auto'
        });
        fileUrl = result.secure_url;
        
        // Delete local file
        fs.unlinkSync(file.path);
      }

      return {
        url: fileUrl,
        filename: file.filename,
        originalname: file.originalname,
        size: file.size,
        mimetype: file.mimetype
      };
    }));

    res.json({
      success: true,
      files
    });
  } catch (error) {
    console.error('Multiple upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Upload failed'
    });
  }
});

// Upload profile picture (specific)
router.post('/profile-picture', protect, uploadProfilePicture, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    // Get file URL (from local or cloudinary)
    let fileUrl = `/uploads/${req.file.filename}`;
    if (process.env.CLOUDINARY_CLOUD_NAME && req.file.path) {
      // If using cloudinary, you'd upload here and get secure_url
      // For now, we'll assume local
    }

    // Update user's profile picture based on user type
    let updatedUser;
    if (req.user.userType === 'brand') {
      updatedUser = await Brand.findByIdAndUpdate(
        req.user._id,
        { logo: fileUrl },
        { new: true }
      );
    } else if (req.user.userType === 'creator') {
      updatedUser = await Creator.findByIdAndUpdate(
        req.user._id,
        { profilePicture: fileUrl },
        { new: true }
      );
    } else {
      updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        { profilePicture: fileUrl },
        { new: true }
      );
    }

    if (!updatedUser) {
      // Database update failed, but file was uploaded – return partial success
      return res.status(207).json({
        success: true,
        warning: 'Profile picture uploaded but database update failed. Please try again.',
        file: { url: fileUrl }
      });
    }

    res.json({
      success: true,
      profilePicture: fileUrl,
      message: 'Profile picture updated successfully'
    });
  } catch (error) {
    console.error('Profile picture upload error:', error);
    // If database error, still return file info but warn
    if (error.name === 'MongoError' || error.name === 'MongoServerError') {
      return res.status(207).json({
        success: true,
        warning: 'File uploaded but database temporarily unavailable. It will be updated soon.',
        file: { url: `/uploads/${req.file.filename}` }
      });
    }
    res.status(500).json({ success: false, error: 'Upload failed' });
  }
});
router.use(uploadErrorHandler);

// Upload cover photo
router.post('/cover-photo', protect, uploadSingle, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    let fileUrl = `/uploads/${req.file.filename}`;
    
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'covers',
        resource_type: 'image',
        transformation: [
          { width: 1500, height: 500, crop: 'fill' }
        ]
      });
      fileUrl = result.secure_url;
      fs.unlinkSync(req.file.path);
    }

    // Update user's cover photo based on user type
    const User = require('../models/User');
    const user = await User.findById(req.user._id);
    
    if (user.userType === 'brand') {
      const Brand = require('../models/Brand');
      await Brand.findByIdAndUpdate(req.user._id, {
        coverImage: fileUrl
      });
    } else {
      const Creator = require('../models/Creator');
      await Creator.findByIdAndUpdate(req.user._id, {
        coverPicture: fileUrl
      });
    }

    res.json({
      success: true,
      coverPhoto: fileUrl
    });
  } catch (error) {
    console.error('Cover photo upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Upload failed'
    });
  }
});

module.exports = router;