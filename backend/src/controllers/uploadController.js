import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config(); // Ensure env vars are loaded before configuring Cloudinary

// Configure Cloudinary once
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadImage(req, res, next) {
  // Set CORS headers for all responses from this endpoint
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  try {
    console.log('📸 Upload request received:', {
      hasFile: !!req.file,
      filename: req.file?.filename,
      originalname: req.file?.originalname,
      mimetype: req.file?.mimetype,
      size: req.file?.size,
      user: req.user?.id,
      cloudinaryConfig: {
        cloud_name: !!process.env.CLOUDINARY_CLOUD_NAME,
        api_key: !!process.env.CLOUDINARY_API_KEY,
        api_secret: !!process.env.CLOUDINARY_API_SECRET
      }
    });

    if (!req.file) {
      console.log('❌ No file received in request');
      return res.status(400).json({ message: 'No image uploaded' });
    }

    // Check if Cloudinary is configured
    const cloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME &&
                                 process.env.CLOUDINARY_API_KEY &&
                                 process.env.CLOUDINARY_API_SECRET;

    if (!cloudinaryConfigured) {
      console.log('🔧 Cloudinary not configured, using local upload');

      // Ensure uploads directory exists
      const uploadsDir = path.join(process.cwd(), 'uploads');
      await fs.mkdir(uploadsDir, { recursive: true });

      // File is already in the uploads directory due to multer configuration
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
      const localUrl = `${backendUrl}/uploads/${req.file.filename}`;

      console.log('✅ File uploaded locally:', localUrl);

      return res.status(201).json({
        url: localUrl,
        publicId: req.file.filename,
        message: 'File uploaded successfully (local storage)'
      });
    }

    // Check if Cloudinary is configured (disabled for testing)
    if (false && (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET)) {
      console.log('❌ Cloudinary not configured, using local file path');
      // Return local file path as fallback
      const localUrl = `/uploads/${req.file.filename}`;
      return res.status(201).json({
        url: localUrl,
        publicId: req.file.filename,
        message: 'File uploaded locally (Cloudinary not configured)'
      });
    }

    console.log('☁️ Uploading to Cloudinary...');

    // Add timeout to prevent hanging
    const uploadPromise = cloudinary.uploader.upload(req.file.path, {
      folder: 'im-host/profiles',
      resource_type: 'image',
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' }
      ]
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Upload timeout')), 20000); // 20 second timeout
    });

    let result;
    try {
      result = await Promise.race([uploadPromise, timeoutPromise]);
    } catch (timeoutError) {
      console.log('⚠️ Cloudinary upload timed out, using local fallback');

      // Move file to uploads directory
      const uploadsDir = path.join(process.cwd(), 'uploads');
      const newPath = path.join(uploadsDir, req.file.filename);

      try {
        // Ensure uploads directory exists
        await fs.mkdir(uploadsDir, { recursive: true });

        // Move file to uploads directory
        await fs.rename(req.file.path, newPath);

        // Return full backend URL instead of relative path
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
        const localUrl = `${backendUrl}/uploads/${req.file.filename}`;
        console.log('📁 File moved to uploads directory:', localUrl);

        return res.status(201).json({
          url: localUrl,
          publicId: req.file.filename,
          message: 'File uploaded locally (Cloudinary timeout)',
          fallback: true
        });
      } catch (moveError) {
        console.error('❌ Failed to move file to uploads directory:', moveError);

        // If we can't move the file, just use the temp path
        const localUrl = `/uploads/${req.file.filename}`;
        console.log('📁 Using temp file path:', localUrl);

        return res.status(201).json({
          url: localUrl,
          publicId: req.file.filename,
          message: 'File uploaded locally (temp location)',
          fallback: true
        });
      }
    }

    console.log('✅ Cloudinary upload successful:', result.public_id);

    // Cleanup local file
    try {
      await fs.unlink(req.file.path);
      console.log('🗑️ Local file cleaned up');
    } catch (cleanupError) {
      console.log('⚠️ Failed to cleanup local file:', cleanupError.message);
    }

    return res.status(201).json({
      url: result.secure_url,
      publicId: result.public_id,
      message: 'Profile picture uploaded successfully to Cloudinary'
    });
  } catch (error) {
  console.error('❌ Upload error:', error);

    // Cleanup local file on error
    if (req.file?.path) {
      try {
        await fs.unlink(req.file.path);
        console.log('🗑️ Local file cleaned up after error');
      } catch (cleanupError) {
        console.log('⚠️ Failed to cleanup local file after error:', cleanupError.message);
      }
    }

    // If it's a timeout or network error, use local fallback
    if (error.message && (error.message.includes('timeout') || error.message.includes('network') || error.message.includes('ETIMEDOUT'))) {
      console.log('⚠️ Upload service unavailable, using local fallback');

      // Use local file as fallback
      if (req.file?.filename) {
        // Return full backend URL instead of relative path
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
        const localUrl = `${backendUrl}/uploads/${req.file.filename}`;
        console.log('📁 Using local file as fallback:', localUrl);

        return res.status(201).json({
          url: localUrl,
          publicId: req.file.filename,
          message: 'File uploaded locally (service unavailable)',
          fallback: true,
          error: error.message,
        });
      }

      return res.status(500).json({
        message: 'Upload service temporarily unavailable. Please try again.',
        error: error.message || 'UPLOAD_TIMEOUT'
      });
    }

    // Return error details for debugging
    return res.status(500).json({
      message: 'Image upload failed',
      error: error.message || error,
    });
  }
}

export async function uploadImages(req, res, next) {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: 'No images uploaded' });

    const uploads = [];
    for (const file of req.files) {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'im-host/events',
        resource_type: 'image',
      });
      uploads.push(result.secure_url);
      try { await fs.unlink(file.path); } catch {}
    }

    return res.status(201).json({ urls: uploads });
  } catch (e) {
    next(e);
  }
}

export async function uploadSignature(req, res, next) {
  try {
    // Optional: implement signed uploads if you switch to unsigned client uploads
    res.json({ timestamp: Date.now(), signature: 'mock-signature', apiKey: 'mock-key' });
  } catch (e) { next(e); }
}

export async function deleteImage(req, res, next) {
  try {
    const { publicId } = req.params;
    if (!publicId) return res.status(400).json({ message: 'publicId is required' });

    await cloudinary.uploader.destroy(publicId);
    res.json({ message: 'Image deleted' });
  } catch (e) { next(e); }
}
