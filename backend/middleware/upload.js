// middleware/upload.js - COMPLETE PRODUCTION-READY VERSION
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { AppError } = require('./errorHandler');
const fileType = require('file-type');
const { fromBuffer } = require('file-type');
// ==================== CONFIGURATION ====================

// Allowed MIME types with categories
const ALLOWED_MIME_TYPES = {
  // Images
  'image/jpeg': { ext: '.jpg', category: 'image', maxSize: 10 * 1024 * 1024 }, // 10MB
  'image/jpg': { ext: '.jpg', category: 'image', maxSize: 10 * 1024 * 1024 },
  'image/png': { ext: '.png', category: 'image', maxSize: 10 * 1024 * 1024 },
  'image/gif': { ext: '.gif', category: 'image', maxSize: 10 * 1024 * 1024 },
  'image/webp': { ext: '.webp', category: 'image', maxSize: 10 * 1024 * 1024 },
  'image/svg+xml': { ext: '.svg', category: 'image', maxSize: 2 * 1024 * 1024 }, // 2MB

  // Videos
  'video/mp4': { ext: '.mp4', category: 'video', maxSize: 100 * 1024 * 1024 }, // 100MB
  'video/mpeg': { ext: '.mpeg', category: 'video', maxSize: 100 * 1024 * 1024 },
  'video/quicktime': { ext: '.mov', category: 'video', maxSize: 100 * 1024 * 1024 },
  'video/x-msvideo': { ext: '.avi', category: 'video', maxSize: 100 * 1024 * 1024 },
  'video/webm': { ext: '.webm', category: 'video', maxSize: 100 * 1024 * 1024 },

  // Documents
  'application/pdf': { ext: '.pdf', category: 'document', maxSize: 25 * 1024 * 1024 }, // 25MB
  'application/msword': { ext: '.doc', category: 'document', maxSize: 25 * 1024 * 1024 },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { ext: '.docx', category: 'document', maxSize: 25 * 1024 * 1024 },
  'application/vnd.ms-excel': { ext: '.xls', category: 'document', maxSize: 25 * 1024 * 1024 },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { ext: '.xlsx', category: 'document', maxSize: 25 * 1024 * 1024 },
  'text/plain': { ext: '.txt', category: 'document', maxSize: 5 * 1024 * 1024 }, // 5MB
  'text/csv': { ext: '.csv', category: 'document', maxSize: 5 * 1024 * 1024 },

  // Archives
  'application/zip': { ext: '.zip', category: 'archive', maxSize: 100 * 1024 * 1024 }, // 100MB
  'application/x-rar-compressed': { ext: '.rar', category: 'archive', maxSize: 100 * 1024 * 1024 },
  'application/x-7z-compressed': { ext: '.7z', category: 'archive', maxSize: 100 * 1024 * 1024 },
};

// Upload directories
const UPLOAD_DIR = path.join(__dirname, '../uploads');
const TEMP_DIR = path.join(UPLOAD_DIR, 'temp');
const PROFILE_DIR = path.join(UPLOAD_DIR, 'profiles');
const COVER_DIR = path.join(UPLOAD_DIR, 'covers');
const CAMPAIGN_DIR = path.join(UPLOAD_DIR, 'campaigns');
const DELIVERABLE_DIR = path.join(UPLOAD_DIR, 'deliverables');
const CONTRACT_DIR = path.join(UPLOAD_DIR, 'contracts');

const directories = [UPLOAD_DIR, TEMP_DIR, PROFILE_DIR, COVER_DIR, CAMPAIGN_DIR, DELIVERABLE_DIR, CONTRACT_DIR];

// Ensure directories exist
directories.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// ==================== STORAGE CONFIGURATION ====================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determine destination based on route
    let dest = TEMP_DIR;
    const url = req.originalUrl || req.url;

    if (url.includes('/profile-picture') || url.includes('/profile')) {
      dest = PROFILE_DIR;
    } else if (url.includes('/cover-photo') || url.includes('/cover')) {
      dest = COVER_DIR;
    } else if (url.includes('/campaign')) {
      dest = CAMPAIGN_DIR;
    } else if (url.includes('/deliverable')) {
      dest = DELIVERABLE_DIR;
    } else if (url.includes('/contract')) {
      dest = CONTRACT_DIR;
    }

    cb(null, dest);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    const ext = path.extname(file.originalname) || ALLOWED_MIME_TYPES[file.mimetype]?.ext || '.bin';
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_').substring(0, 50);
    const filename = `${uniqueSuffix}-${sanitizedName}`;
    cb(null, filename);
  },
});

// ==================== FILE FILTER ====================

const fileFilter = (req, file, cb) => {
  const allowedType = ALLOWED_MIME_TYPES[file.mimetype];
  if (allowedType) {
    file.allowedType = allowedType;
    cb(null, true);
  } else {
    cb(
      new AppError(
        `File type not allowed. Allowed types: ${Object.keys(ALLOWED_MIME_TYPES).join(', ')}`,
        400,
        'INVALID_FILE_TYPE'
      )
    );
  }
};
const validateFileContent = async (req, res, next) => {
  if (!req.file && (!req.files || req.files.length === 0)) return next();
  const files = req.file ? [req.file] : req.files;
  for (const file of files) {
    const buffer = fs.readFileSync(file.path);
    const type = await fileType.fromBuffer(buffer);
    if (!type || type.mime !== file.mimetype) {
      cleanupFiles(files);
      return res.status(400).json({ success: false, error: 'Invalid file content' });
    }
  }
  next();
};
// ==================== MULTER INSTANCE ====================

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB global limit (refined per file type in validation)
    files: 10, // Max 10 files per request
  },
  fileFilter,
});

// ==================== CUSTOM VALIDATION MIDDLEWARE ====================

/**
 * Validate uploaded files (single or multiple)
 * @param {Object} options - Validation options
 * @returns {Function} Express middleware
 */
const validateFileUpload = (options = {}) => {
  const {
    required = false,
    minFiles = 1,
    maxFiles = 10,
    allowedCategories = null, // e.g., ['image', 'video']
    maxSizePerFile = null, // in bytes
    fieldName = 'file',
  } = options;

  return (req, res, next) => {
    const files = req.files || (req.file ? [req.file] : []);

    // Required check
    if (required && files.length === 0) {
      return next(new AppError('No file uploaded', 400, 'NO_FILE'));
    }

    if (files.length < minFiles) {
      return next(new AppError(`At least ${minFiles} file(s) required`, 400, 'MIN_FILES'));
    }

    if (files.length > maxFiles) {
      return next(new AppError(`Maximum ${maxFiles} files allowed`, 400, 'MAX_FILES'));
    }

    // Validate each file
    for (const file of files) {
      const fileInfo = ALLOWED_MIME_TYPES[file.mimetype];
      if (!fileInfo) {
        return next(new AppError(`Invalid file type: ${file.mimetype}`, 400, 'INVALID_TYPE'));
      }

      // Category restriction
      if (allowedCategories && !allowedCategories.includes(fileInfo.category)) {
        return next(
          new AppError(
            `File category not allowed. Allowed: ${allowedCategories.join(', ')}`,
            400,
            'CATEGORY_NOT_ALLOWED'
          )
        );
      }

      // Size restriction
      const maxSize = maxSizePerFile || fileInfo.maxSize;
      if (file.size > maxSize) {
        return next(
          new AppError(
            `File too large. Max size: ${(maxSize / (1024 * 1024)).toFixed(0)}MB`,
            400,
            'FILE_TOO_LARGE'
          )
        );
      }

      // Empty file check
      if (file.size === 0) {
        return next(new AppError('File is empty', 400, 'EMPTY_FILE'));
      }

      // Extension consistency check
      const ext = path.extname(file.originalname).toLowerCase();
      if (fileInfo.ext !== ext && !(fileInfo.ext === '.jpg' && ext === '.jpeg') && !(fileInfo.ext === '.jpeg' && ext === '.jpg')) {
        return next(new AppError('File extension does not match file type', 400, 'EXTENSION_MISMATCH'));
      }
    }

    // Attach file info to request for later use
    req.fileInfo = files.map((f) => ({
      ...f,
      category: ALLOWED_MIME_TYPES[f.mimetype]?.category,
      originalName: f.originalname,
      path: f.path,
      url: `/uploads/${path.relative(UPLOAD_DIR, f.path)}`,
    }));

    next();
  };
};

// ==================== SPECIALIZED UPLOAD MIDDLEWARE ====================

/**
 * Single file upload
 * @param {string} fieldName - Form field name
 * @param {Object} options - Validation options
 */
const uploadSingle = (fieldName = 'file', options = {}) => {
  return [upload.single(fieldName), validateFileUpload({ ...options, maxFiles: 1, fieldName })];
};

/**
 * Multiple file upload (array)
 * @param {string} fieldName - Form field name
 * @param {Object} options - Validation options
 */
const uploadMultiple = (fieldName = 'files', options = {}) => {
  return [upload.array(fieldName, options.maxFiles || 10), validateFileUpload(options)];
};

/**
 * Multiple fields upload
 * @param {Array} fields - Field definitions [{ name, maxCount }]
 * @param {Object} options - Validation options
 */
const uploadFields = (fields, options = {}) => {
  return [
    upload.fields(fields),
    (req, res, next) => {
      // Validate each field
      for (const field of fields) {
        const files = req.files?.[field.name] || [];
        const fieldOptions = field.options || {};
        if (fieldOptions.required && files.length === 0) {
          return next(new AppError(`Field ${field.name} is required`, 400, 'FIELD_REQUIRED'));
        }
        if (fieldOptions.minFiles && files.length < fieldOptions.minFiles) {
          return next(new AppError(`Field ${field.name} requires at least ${fieldOptions.minFiles} file(s)`, 400, 'MIN_FILES'));
        }
        if (fieldOptions.maxFiles && files.length > fieldOptions.maxFiles) {
          return next(new AppError(`Field ${field.name} cannot have more than ${fieldOptions.maxFiles} files`, 400, 'MAX_FILES'));
        }
      }
      next();
    },
    validateFileUpload(options),
  ];
};

// ==================== SPECIALIZED PRESETS ====================

const uploadProfilePicture = uploadSingle('profilePicture', {
  required: true,
  allowedCategories: ['image'],
  maxSizePerFile: 5 * 1024 * 1024, // 5MB
});

const uploadCoverPhoto = uploadSingle('coverPhoto', {
  required: true,
  allowedCategories: ['image'],
  maxSizePerFile: 10 * 1024 * 1024, // 10MB
});

const uploadCampaignAssets = uploadMultiple('assets', {
  required: false,
  allowedCategories: ['image', 'video', 'document'],
  maxFiles: 20,
  maxSizePerFile: 100 * 1024 * 1024, // 100MB
});

const uploadDeliverables = uploadMultiple('deliverables', {
  required: true,
  allowedCategories: ['image', 'video', 'document'],
  maxFiles: 10,
  maxSizePerFile: 100 * 1024 * 1024,
});

const uploadContract = uploadSingle('contract', {
  required: true,
  allowedCategories: ['document'],
  maxSizePerFile: 25 * 1024 * 1024,
});

// ==================== UTILITY FUNCTIONS ====================

/**
 * Clean up uploaded files (delete from disk)
 * @param {Array|Object} files - Files to delete
 */
const cleanupFiles = (files) => {
  const fileArray = Array.isArray(files) ? files : files ? [files] : [];
  fileArray.forEach((file) => {
    if (file && file.path && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
      } catch (error) {
        console.error('Error cleaning up file:', error);
      }
    }
  });
};

/**
 * Get file info for response
 * @param {Object} file - Multer file object
 * @returns {Object}
 */
const getFileInfo = (file) => {
  if (!file) return null;
  return {
    filename: file.filename,
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    category: ALLOWED_MIME_TYPES[file.mimetype]?.category,
    path: file.path,
    url: `/uploads/${path.relative(UPLOAD_DIR, file.path)}`,
    uploadedAt: new Date(),
  };
};

/**
 * Multer error handler middleware (for 413 errors)
 */
const uploadErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, error: 'File too large', code: 'FILE_TOO_LARGE' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ success: false, error: 'Too many files', code: 'TOO_MANY_FILES' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ success: false, error: 'Unexpected field', code: 'UNEXPECTED_FIELD' });
    }
  }
  next(err);
};

// ==================== EXPORTS ====================
module.exports = {
  upload,
  uploadSingle,
  uploadMultiple,
  uploadFields,
  uploadProfilePicture,
  uploadCoverPhoto,
  uploadCampaignAssets,
  uploadDeliverables,
  uploadContract,
  validateFileUpload,
  cleanupFiles,
  getFileInfo,
  uploadErrorHandler,
  ALLOWED_MIME_TYPES,
};