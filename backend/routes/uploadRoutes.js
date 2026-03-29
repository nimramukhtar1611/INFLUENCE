// routes/uploadRoutes.js - COMPLETE
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Brand = require('../models/Brand');
const Creator = require('../models/Creator');
const Admin = require('../models/Admin');
const { protect } = require('../middleware/auth');
const { uploadSingle, uploadMultiple ,uploadErrorHandler, uploadProfilePicture } = require('../middleware/upload');
const cloudinary = require('../config/cloudinary');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const UPLOAD_ROOT = path.join(__dirname, '../uploads');

const toUploadUrl = (filePath) => {
  if (!filePath) return null;
  const relativePath = path.relative(UPLOAD_ROOT, filePath).split(path.sep).join('/');
  return `/uploads/${relativePath}`;
};

// Supports both regular User accounts and Admin accounts for profile-picture uploads.
const protectUploadActor = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, error: 'Not authorized, no token' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, error: 'Token expired', expired: true });
      }
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    const accountId = decoded.id || decoded.userId;
    const user = await User.findById(accountId).select('-password -refreshToken');
    if (user) {
      if (user.status === 'suspended' || user.status === 'deleted') {
        return res.status(403).json({ success: false, error: 'Account is not active' });
      }
      req.user = user;
      req.token = token;
      return next();
    }

    const admin = await Admin.findById(accountId).select('-password -twoFactorSecret -twoFactorTempSecret -twoFactorBackupCodes');
    if (admin) {
      req.user = {
        ...admin.toObject(),
        userType: 'admin'
      };
      req.admin = admin;
      req.token = token;
      return next();
    }

    return res.status(401).json({ success: false, error: 'User not found' });
  } catch (error) {
    console.error('Profile upload auth error:', error);
    return res.status(500).json({ success: false, error: 'Authentication error' });
  }
};

// Upload single file
router.post('/single', protect, uploadSingle(), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    let fileUrl = toUploadUrl(req.file.path);
    
    // Upload to cloudinary if configured
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'influencex',
        resource_type: 'auto'
      });
      fileUrl = result.secure_url;
      
      // Delete local file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
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
router.post('/multiple', protect, uploadMultiple(), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }

    const files = await Promise.all(req.files.map(async (file) => {
      let fileUrl = toUploadUrl(file.path);
      
      if (process.env.CLOUDINARY_CLOUD_NAME) {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: 'influencex',
          resource_type: 'auto'
        });
        fileUrl = result.secure_url;
        
        // Delete local file
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
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
router.post('/profile-picture', protectUploadActor, uploadProfilePicture, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    // Get file URL (from local or cloudinary)
    let fileUrl = toUploadUrl(req.file.path);
    if (process.env.CLOUDINARY_CLOUD_NAME && req.file.path) {
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: 'profiles',
        public_id: `user_${req.user._id}`,
        overwrite: true,
        resource_type: 'image',
        transformation: [
          { width: 400, height: 400, crop: 'fill', gravity: 'face' },
          { quality: 'auto:best' },
          { fetch_format: 'auto' }
        ]
      });

      fileUrl = uploadResult.secure_url;

      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    }

    // Update account profile based on actor type.
    let updatedUser;
    const isAdminActor = req.user.userType === 'admin' || ['admin', 'super_admin', 'moderator'].includes(req.user.role);

    if (isAdminActor) {
      const [updatedAdmin, updatedAuthUser] = await Promise.all([
        Admin.findByIdAndUpdate(req.user._id, { profileImage: fileUrl }, { new: true }),
        User.findByIdAndUpdate(req.user._id, { profilePicture: fileUrl }, { new: true })
      ]);
      updatedUser = updatedAdmin || updatedAuthUser;
    } else if (req.user.userType === 'brand') {
      await User.findByIdAndUpdate(req.user._id, { profilePicture: fileUrl });
      updatedUser = await Brand.findByIdAndUpdate(
        req.user._id,
        { logo: fileUrl, profilePicture: fileUrl },
        { new: true }
      );
    } else if (req.user.userType === 'creator') {
      await User.findByIdAndUpdate(req.user._id, { profilePicture: fileUrl });
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
        file: { url: req.file?.path ? toUploadUrl(req.file.path) : null }
      });
    }
    res.status(500).json({ success: false, error: 'Upload failed' });
  }
});
router.use(uploadErrorHandler);

// Upload cover photo
router.post('/cover-photo', protect, uploadSingle('coverPhoto'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    let fileUrl = toUploadUrl(req.file.path);
    
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'covers',
        resource_type: 'image',
        transformation: [
          { width: 1500, height: 500, crop: 'fill' }
        ]
      });
      fileUrl = result.secure_url;
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
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