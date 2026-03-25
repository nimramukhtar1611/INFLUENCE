// services/cloudinaryService.js - COMPLETE FIXED VERSION
const cloudinary = require('../config/cloudinary');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

class CloudinaryService {
  
  // ==================== UPLOAD WITH OPTIMIZATION ====================
  async uploadFile(filePath, options = {}) {
    try {
      const {
        folder = 'influencex',
        resourceType = 'auto',
        publicId = null,
        transformation = [],
        tags = [],
        eager = [],
        eagerAsync = false,
        useFilename = true,
        uniqueFilename = true
      } = options;

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error('File not found');
      }

      // Upload to cloudinary
      const result = await cloudinary.uploader.upload(filePath, {
        folder,
        resource_type: resourceType,
        public_id: publicId,
        transformation,
        tags,
        eager,
        eager_async: eagerAsync,
        use_filename: useFilename,
        unique_filename: uniqueFilename,
        overwrite: true
      });

      // Delete local file after successful upload
      try {
        fs.unlinkSync(filePath);
      } catch (unlinkError) {
        console.warn('Could not delete local file:', unlinkError.message);
      }

      return {
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
        createdAt: result.created_at
      };
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw error;
    }
  }

  // ==================== UPLOAD IMAGE WITH OPTIMIZATION ====================
  async uploadImage(filePath, options = {}) {
    const {
      width = 1200,
      height = null,
      crop = 'limit',
      quality = 'auto',
      format = 'auto',
      effect = null,
      radius = 0,
      border = null,
      background = null,
      ...restOptions
    } = options;

    // Build transformation array
    const transformation = [];

    // Resize
    if (width || height) {
      const resize = {};
      if (width) resize.width = width;
      if (height) resize.height = height;
      if (crop) resize.crop = crop;
      transformation.push(resize);
    }

    // Quality optimization
    if (quality) {
      transformation.push({ quality });
    }

    // Format optimization
    if (format) {
      transformation.push({ fetch_format: format });
    }

    // Effects
    if (effect) {
      transformation.push({ effect });
    }

    // Rounded corners
    if (radius > 0) {
      transformation.push({ radius });
    }

    // Border
    if (border) {
      transformation.push({ border });
    }

    // Background
    if (background) {
      transformation.push({ background });
    }

    return this.uploadFile(filePath, {
      ...restOptions,
      resourceType: 'image',
      transformation
    });
  }

  // ==================== UPLOAD VIDEO WITH OPTIMIZATION ====================
  async uploadVideo(filePath, options = {}) {
    const {
      width = 1280,
      height = 720,
      crop = 'limit',
      quality = 'auto',
      format = 'mp4',
      videoCodec = 'auto',
      audioCodec = 'aac',
      bitRate = null,
      fps = null,
      ...restOptions
    } = options;

    // Build transformation array
    const transformation = [];

    // Video codec
    if (videoCodec) {
      transformation.push({ video_codec: videoCodec });
    }

    // Audio codec
    if (audioCodec) {
      transformation.push({ audio_codec: audioCodec });
    }

    // Resize
    if (width || height) {
      const resize = {};
      if (width) resize.width = width;
      if (height) resize.height = height;
      if (crop) resize.crop = crop;
      transformation.push(resize);
    }

    // Quality
    if (quality) {
      transformation.push({ quality });
    }

    // Bitrate
    if (bitRate) {
      transformation.push({ bit_rate: bitRate });
    }

    // FPS
    if (fps) {
      transformation.push({ fps });
    }

    // Format
    if (format) {
      transformation.push({ fetch_format: format });
    }

    return this.uploadFile(filePath, {
      ...restOptions,
      resourceType: 'video',
      transformation
    });
  }

  // ==================== UPLOAD PROFILE PICTURE ====================
  async uploadProfilePicture(filePath, userId) {
    return this.uploadImage(filePath, {
      folder: 'profiles',
      publicId: `user_${userId}`,
      width: 400,
      height: 400,
      crop: 'fill',
      quality: 'auto:best',
      format: 'jpg',
      radius: 'max',
      tags: ['profile', `user_${userId}`]
    });
  }

  // ==================== UPLOAD COVER PHOTO ====================
  async uploadCoverPhoto(filePath, userId) {
    return this.uploadImage(filePath, {
      folder: 'covers',
      publicId: `cover_${userId}`,
      width: 1500,
      height: 500,
      crop: 'fill',
      quality: 'auto:best',
      format: 'jpg',
      tags: ['cover', `user_${userId}`]
    });
  }

  // ==================== UPLOAD CAMPAIGN ASSET ====================
  async uploadCampaignAsset(filePath, campaignId, assetType = 'image') {
    const options = {
      folder: `campaigns/${campaignId}`,
      tags: ['campaign', `campaign_${campaignId}`, assetType]
    };

    if (assetType === 'image') {
      return this.uploadImage(filePath, {
        ...options,
        width: 1200,
        quality: 'auto:good'
      });
    } else if (assetType === 'video') {
      return this.uploadVideo(filePath, {
        ...options,
        width: 1280,
        quality: 'auto'
      });
    } else {
      return this.uploadFile(filePath, {
        ...options,
        resourceType: 'raw'
      });
    }
  }

  // ==================== UPLOAD DELIVERABLE ====================
  async uploadDeliverable(filePath, dealId, creatorId) {
    const ext = path.extname(filePath).toLowerCase();
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const videoExts = ['.mp4', '.mov', '.avi', '.wmv', '.flv', '.webm'];

    let assetType = 'raw';
    if (imageExts.includes(ext)) assetType = 'image';
    if (videoExts.includes(ext)) assetType = 'video';

    const options = {
      folder: `deliverables/${dealId}`,
      tags: ['deliverable', `deal_${dealId}`, `creator_${creatorId}`]
    };

    if (assetType === 'image') {
      return this.uploadImage(filePath, {
        ...options,
        width: 1200,
        quality: 'auto:good'
      });
    } else if (assetType === 'video') {
      return this.uploadVideo(filePath, {
        ...options,
        width: 1280,
        quality: 'auto'
      });
    } else {
      return this.uploadFile(filePath, {
        ...options,
        resourceType: 'raw'
      });
    }
  }

  // ==================== UPLOAD FROM URL ====================
  async uploadFromUrl(imageUrl, options = {}) {
    try {
      // Download image from URL
      const response = await axios({
        url: imageUrl,
        method: 'GET',
        responseType: 'stream'
      });

      // Create temp file path
      const tempPath = path.join(__dirname, '../uploads/temp', `temp-${Date.now()}.jpg`);
      
      // Save stream to file
      const writer = fs.createWriteStream(tempPath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      // Upload the temp file
      const result = await this.uploadImage(tempPath, options);

      // Clean up temp file
      try {
        fs.unlinkSync(tempPath);
      } catch (error) {
        console.warn('Could not delete temp file:', error.message);
      }

      return result;
    } catch (error) {
      console.error('Upload from URL error:', error);
      throw error;
    }
  }

  // ==================== DELETE FILE ====================
  async deleteFile(publicId, options = {}) {
    try {
      const { resourceType = 'image', invalidate = true } = options;
      
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
        invalidate
      });

      return {
        success: result.result === 'ok',
        result: result.result
      };
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      throw error;
    }
  }

  // ==================== GET FILE INFO ====================
  async getFileInfo(publicId, options = {}) {
    try {
      const { resourceType = 'image' } = options;
      
      const result = await cloudinary.api.resource(publicId, {
        resource_type: resourceType
      });

      return {
        publicId: result.public_id,
        url: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
        createdAt: result.created_at,
        tags: result.tags
      };
    } catch (error) {
      console.error('Cloudinary get info error:', error);
      throw error;
    }
  }

  // ==================== GET OPTIMIZED URL ====================
  getOptimizedUrl(publicId, options = {}) {
    const {
      width = null,
      height = null,
      crop = 'limit',
      quality = 'auto',
      format = 'auto',
      effect = null,
      radius = 0
    } = options;

    let transformation = '';

    if (width || height) {
      transformation += `c_${crop},`;
      if (width) transformation += `w_${width},`;
      if (height) transformation += `h_${height},`;
    }

    if (quality) {
      transformation += `q_${quality},`;
    }

    if (format) {
      transformation += `f_${format},`;
    }

    if (effect) {
      transformation += `e_${effect},`;
    }

    if (radius > 0) {
      transformation += `r_${radius},`;
    }

    // Remove trailing comma
    transformation = transformation.replace(/,$/, '');

    return cloudinary.url(publicId, {
      secure: true,
      transformation: transformation ? [transformation] : []
    });
  }

  // ==================== GET THUMBNAIL URL ====================
  getThumbnailUrl(publicId, size = 200) {
    return this.getOptimizedUrl(publicId, {
      width: size,
      height: size,
      crop: 'fill',
      quality: 'auto',
      format: 'jpg'
    });
  }

  // ==================== ADD TAGS ====================
  async addTags(publicId, tags, options = {}) {
    try {
      const { resourceType = 'image' } = options;
      
      const result = await cloudinary.uploader.add_tag(tags, [publicId], {
        resource_type: resourceType
      });

      return {
        success: true,
        result
      };
    } catch (error) {
      console.error('Cloudinary add tags error:', error);
      throw error;
    }
  }

  // ==================== REMOVE TAGS ====================
  async removeTags(publicId, tags, options = {}) {
    try {
      const { resourceType = 'image' } = options;
      
      const result = await cloudinary.uploader.remove_tag(tags, [publicId], {
        resource_type: resourceType
      });

      return {
        success: true,
        result
      };
    } catch (error) {
      console.error('Cloudinary remove tags error:', error);
      throw error;
    }
  }

  // ==================== RENAME FILE ====================
  async renameFile(oldPublicId, newPublicId, options = {}) {
    try {
      const { resourceType = 'image', overwrite = true } = options;
      
      const result = await cloudinary.uploader.rename(oldPublicId, newPublicId, {
        resource_type: resourceType,
        overwrite
      });

      return {
        success: true,
        publicId: result.public_id,
        url: result.secure_url
      };
    } catch (error) {
      console.error('Cloudinary rename error:', error);
      throw error;
    }
  }

  // ==================== LIST FILES ====================
  async listFiles(options = {}) {
    try {
      const {
        folder = null,
        resourceType = 'image',
        maxResults = 100,
        nextCursor = null
      } = options;

      const params = {
        resource_type: resourceType,
        max_results: maxResults
      };

      if (folder) params.prefix = folder;
      if (nextCursor) params.next_cursor = nextCursor;

      const result = await cloudinary.api.resources(params);

      return {
        resources: result.resources,
        nextCursor: result.next_cursor,
        totalCount: result.total_count
      };
    } catch (error) {
      console.error('Cloudinary list files error:', error);
      throw error;
    }
  }

  // ==================== GET USAGE STATS ====================
  async getUsageStats() {
    try {
      const result = await cloudinary.api.usage();

      return {
        plan: result.plan,
        credits: result.credits,
        objects: result.objects,
        bandwidth: result.bandwidth,
        storage: result.storage,
        requests: result.requests
      };
    } catch (error) {
      console.error('Cloudinary usage stats error:', error);
      throw error;
    }
  }
}

module.exports = new CloudinaryService();