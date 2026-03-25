const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class BackupService {
  constructor() {
    this.backupDir = path.join(__dirname, '../../backups');
    this.ensureBackupDir();
  }

  /**
   * Ensure backup directory exists
   */
  ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Create database backup
   * @param {Object} options - Backup options
   */
  async createBackup(options = {}) {
    const {
      type = 'full', // 'full', 'partial', 'collections'
      collections = [],
      compress = true,
      includeGridFS = true
    } = options;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}`;
    const backupPath = path.join(this.backupDir, filename);
    const jsonPath = `${backupPath}.json`;
    const zipPath = `${backupPath}.zip`;

    console.log(`📦 Starting backup: ${filename}`);

    try {
      // Get all collections
      const db = mongoose.connection.db;
      const allCollections = await db.listCollections().toArray();
      const collectionNames = allCollections.map(c => c.name);

      // Filter collections if partial backup
      let collectionsToBackup = collectionNames;
      if (type === 'partial' && collections.length > 0) {
        collectionsToBackup = collections.filter(c => collectionNames.includes(c));
      }

      // Exclude certain collections for partial
      if (type === 'partial') {
        const excludeCollections = ['sessions', 'logs', 'analytics', 'notifications'];
        collectionsToBackup = collectionsToBackup.filter(c => !excludeCollections.includes(c));
      }

      console.log(`📊 Backing up ${collectionsToBackup.length} collections`);

      // Create backup object
      const backup = {
        metadata: {
          version: '1.0',
          timestamp: new Date().toISOString(),
          type,
          collections: collectionsToBackup,
          database: mongoose.connection.name,
          nodeEnv: process.env.NODE_ENV,
          mongodbVersion: await this.getMongoDBVersion()
        },
        data: {}
      };

      // Backup each collection
      let totalDocuments = 0;
      for (const collectionName of collectionsToBackup) {
        console.log(`  📁 Backing up ${collectionName}...`);
        
        const collection = db.collection(collectionName);
        const documents = await collection.find({}).toArray();
        
        backup.data[collectionName] = {
          count: documents.length,
          documents
        };
        
        totalDocuments += documents.length;
      }

      // Backup GridFS if requested
      if (includeGridFS) {
        const gridFSFiles = await this.backupGridFS(db);
        if (gridFSFiles) {
          backup.gridfs = gridFSFiles;
        }
      }

      // Write to file
      fs.writeFileSync(jsonPath, JSON.stringify(backup, null, 2));
      console.log(`✅ JSON backup created: ${jsonPath}`);

      // Compress if requested
      let finalPath = jsonPath;
      if (compress) {
        finalPath = await this.compressBackup(jsonPath, zipPath);
        console.log(`✅ Compressed backup created: ${finalPath}`);
      }

      // Get file stats
      const stats = fs.statSync(finalPath);

      return {
        success: true,
        filename: path.basename(finalPath),
        path: finalPath,
        size: this.formatBytes(stats.size),
        timestamp: backup.metadata.timestamp,
        collections: collectionsToBackup.length,
        documents: totalDocuments,
        type
      };

    } catch (error) {
      console.error('❌ Backup failed:', error);
      
      // Clean up partial files
      this.cleanupFiles([jsonPath, zipPath]);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Backup GridFS files
   * @param {Object} db - MongoDB database connection
   */
  async backupGridFS(db) {
    try {
      const bucket = new mongoose.mongo.GridFSBucket(db, {
        bucketName: 'uploads'
      });

      const files = await db.collection('uploads.files').find({}).toArray();
      
      if (files.length === 0) return null;

      return {
        count: files.length,
        totalSize: files.reduce((sum, f) => sum + f.length, 0),
        files: files.map(f => ({
          filename: f.filename,
          contentType: f.contentType,
          length: f.length,
          uploadDate: f.uploadDate
        }))
      };
    } catch (error) {
      console.error('❌ GridFS backup failed:', error);
      return null;
    }
  }

  /**
   * Compress backup file
   * @param {string} sourcePath - Source file path
   * @param {string} destPath - Destination zip path
   */
  async compressBackup(sourcePath, destPath) {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(destPath);
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });

      output.on('close', () => {
        // Delete the original JSON file
        fs.unlinkSync(sourcePath);
        resolve(destPath);
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.pipe(output);
      archive.file(sourcePath, { name: path.basename(sourcePath) });
      archive.finalize();
    });
  }

  /**
   * Restore from backup
   * @param {string} backupPath - Path to backup file
   */
  async restoreBackup(backupPath) {
    console.log(`🔄 Restoring from backup: ${backupPath}`);

    try {
      // Check if file exists
      if (!fs.existsSync(backupPath)) {
        throw new Error('Backup file not found');
      }

      // Handle zip files
      let jsonPath = backupPath;
      if (backupPath.endsWith('.zip')) {
        jsonPath = await this.extractBackup(backupPath);
      }

      // Read backup file
      const backupData = fs.readFileSync(jsonPath, 'utf8');
      const backup = JSON.parse(backupData);

      console.log(`📋 Backup metadata:`, backup.metadata);

      // Get database connection
      const db = mongoose.connection.db;

      // Restore each collection
      let restoredCount = 0;
      for (const [collectionName, collectionData] of Object.entries(backup.data)) {
        console.log(`  📁 Restoring ${collectionName}...`);
        
        const collection = db.collection(collectionName);
        
        // Clear existing data
        await collection.deleteMany({});
        
        // Insert backup data
        if (collectionData.documents.length > 0) {
          await collection.insertMany(collectionData.documents);
        }
        
        restoredCount += collectionData.documents.length;
      }

      console.log(`✅ Restore completed: ${restoredCount} documents restored`);

      // Clean up extracted file if needed
      if (backupPath.endsWith('.zip') && jsonPath !== backupPath) {
        fs.unlinkSync(jsonPath);
      }

      return {
        success: true,
        collections: Object.keys(backup.data).length,
        documents: restoredCount,
        metadata: backup.metadata
      };

    } catch (error) {
      console.error('❌ Restore failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Extract zip backup
   * @param {string} zipPath - Path to zip file
   */
  async extractBackup(zipPath) {
    const extractPath = zipPath.replace('.zip', '');
    
    try {
      // Use system unzip command
      await execPromise(`unzip -o "${zipPath}" -d "${path.dirname(zipPath)}"`);
      
      // Find extracted JSON file
      const files = fs.readdirSync(path.dirname(zipPath));
      const jsonFile = files.find(f => f.endsWith('.json') && f.includes(path.basename(extractPath)));
      
      if (!jsonFile) {
        throw new Error('Extracted JSON file not found');
      }
      
      return path.join(path.dirname(zipPath), jsonFile);
    } catch (error) {
      console.error('❌ Extract failed:', error);
      throw error;
    }
  }

  /**
   * List all backups
   */
  async listBackups() {
    try {
      const files = fs.readdirSync(this.backupDir);
      
      const backups = files
        .filter(f => f.endsWith('.zip') || f.endsWith('.json'))
        .map(f => {
          const filePath = path.join(this.backupDir, f);
          const stats = fs.statSync(filePath);
          
          // Try to extract metadata from filename
          const match = f.match(/backup-(.+?)\./);
          const timestamp = match ? match[1].replace(/-/g, ':') : null;
          
          return {
            filename: f,
            path: filePath,
            size: this.formatBytes(stats.size),
            created: stats.mtime,
            isZip: f.endsWith('.zip'),
            timestamp: timestamp ? new Date(timestamp) : stats.mtime
          };
        })
        .sort((a, b) => b.created - a.created);

      return {
        success: true,
        backups,
        total: backups.length,
        totalSize: this.formatBytes(backups.reduce((sum, b) => sum + this.parseBytes(b.size), 0))
      };
    } catch (error) {
      console.error('❌ List backups failed:', error);
      return {
        success: false,
        error: error.message,
        backups: []
      };
    }
  }

  /**
   * Delete old backups
   * @param {number} keepLast - Number of backups to keep
   */
  async cleanupOldBackups(keepLast = 7) {
    try {
      const backups = await this.listBackups();
      
      if (!backups.success || backups.backups.length <= keepLast) {
        return { success: true, deleted: 0 };
      }

      const toDelete = backups.backups.slice(keepLast);
      
      for (const backup of toDelete) {
        fs.unlinkSync(backup.path);
        console.log(`🗑️ Deleted old backup: ${backup.filename}`);
      }

      return {
        success: true,
        deleted: toDelete.length
      };
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get MongoDB version
   */
  async getMongoDBVersion() {
    try {
      const result = await mongoose.connection.db.admin().serverInfo();
      return result.version;
    } catch {
      return 'unknown';
    }
  }

  /**
   * Format bytes to human readable
   * @param {number} bytes - Bytes
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Parse formatted bytes back to number
   * @param {string} formatted - Formatted size string
   */
  parseBytes(formatted) {
    const units = {
      'Bytes': 1,
      'KB': 1024,
      'MB': 1024 * 1024,
      'GB': 1024 * 1024 * 1024,
      'TB': 1024 * 1024 * 1024 * 1024
    };
    
    const match = formatted.match(/([\d.]+)\s*(Bytes|KB|MB|GB|TB)/);
    if (!match) return 0;
    
    const [, value, unit] = match;
    return parseFloat(value) * units[unit];
  }

  /**
   * Clean up files
   * @param {Array} files - Array of file paths
   */
  cleanupFiles(files) {
    for (const file of files) {
      if (file && fs.existsSync(file)) {
        try {
          fs.unlinkSync(file);
        } catch (error) {
          console.error(`❌ Failed to delete ${file}:`, error);
        }
      }
    }
  }

  /**
   * Get backup statistics
   */
  async getStats() {
    const backups = await this.listBackups();
    
    if (!backups.success) {
      return { success: false, error: backups.error };
    }

    const now = new Date();
    const last24h = backups.backups.filter(b => (now - b.created) < 24 * 60 * 60 * 1000);
    const last7d = backups.backups.filter(b => (now - b.created) < 7 * 24 * 60 * 60 * 1000);

    return {
      success: true,
      stats: {
        total: backups.total,
        totalSize: backups.totalSize,
        last24h: last24h.length,
        last7d: last7d.length,
        latest: backups.backups[0] || null,
        directory: this.backupDir
      }
    };
  }
}

module.exports = new BackupService();