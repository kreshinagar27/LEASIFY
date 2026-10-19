const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Configure Cloudinary helper
const checkAndConfigureCloudinary = () => {
  const isConfigured = 
    process.env.CLOUDINARY_CLOUD_NAME && 
    process.env.CLOUDINARY_API_KEY && 
    process.env.CLOUDINARY_API_SECRET;

  if (isConfigured) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
  }
  return !!isConfigured;
};

// Initial config check
checkAndConfigureCloudinary();

/**
 * Uploads a local file (from multer) and returns URL and publicId.
 * If Cloudinary is configured, uploads to Cloudinary and deletes local copy.
 * If not, leaves it in local uploads folder and returns static URL.
 */
const uploadToStorage = async (file, folder = 'leasify') => {
  if (!file) return null;

  if (checkAndConfigureCloudinary()) {
    try {
      // 60-second timeout to allow large images/videos to finish uploading
      const result = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Cloudinary request timed out')), 60000);
        cloudinary.uploader.upload(file.path, {
          folder: folder,
          resource_type: 'auto'
        }, (err, res) => {
          clearTimeout(timer);
          if (err) reject(err);
          else resolve(res);
        });
      });

      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      console.log(`[Storage] Uploaded to Cloudinary [${folder}]: ${result.public_id}`);
      return {
        url: result.secure_url,
        publicId: result.public_id
      };
    } catch (cloudErr) {
      console.warn(`[Storage] Cloudinary upload unavailable (${cloudErr.message}). Using persistent local disk storage.`);
      // Gracefully fall back to local disk storage
    }
  }

  // Persistent Local Disk Storage (served via Express /uploads)
  return {
    url: `/uploads/${file.filename}`,
    publicId: file.filename
  };
};

/**
 * Deletes a file from storage.
 * If Cloudinary is configured, deletes from Cloudinary.
 * If not, deletes from local uploads folder.
 */
const deleteFromStorage = async (publicId, resourceType = 'image') => {
  if (!publicId) return;

  try {
    if (checkAndConfigureCloudinary()) {
      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
      console.log(`[Storage] Deleted from Cloudinary: ${publicId}`);
    } else {
      const localFilePath = path.join(__dirname, '../uploads', publicId);
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
      }
    }
  } catch (error) {
    console.error('File Deletion Error:', error);
  }
};

module.exports = {
  uploadToStorage,
  deleteFromStorage,
  get isCloudinaryConfigured() {
    return checkAndConfigureCloudinary();
  }
};
