const path = require('path');
const fs = require('fs');
const contentModel = require('../models/contentModel');
const multer = require('multer');

// Ensure upload directories exist
const uploadDir = {
  images: path.join(__dirname, '../../uploads/images'),
  videos: path.join(__dirname, '../../uploads/videos')
};

// Create directories if they don't exist
Object.values(uploadDir).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Determine directory based on file type
    const isVideo = file.mimetype.startsWith('video/');
    const dir = isVideo ? uploadDir.videos : uploadDir.images;
    console.log(`Storing file in ${dir}`);
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    // Create a sanitized filename
    const originalName = file.originalname;
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    const newFilename = `${timestamp}-${random}-${sanitizedName}`;
    cb(null, newFilename);
  }
});

// File filter for accepted file types
const fileFilter = (req, file, cb) => {
  const acceptedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const acceptedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg'];
  
  if (acceptedImageTypes.includes(file.mimetype) || acceptedVideoTypes.includes(file.mimetype)) {
    console.log(`Accepting file of type: ${file.mimetype}`);
    cb(null, true);
  } else {
    console.log(`Rejecting file of type: ${file.mimetype}`);
    cb(new Error('Invalid file type. Only images and videos are allowed.'), false);
  }
};

// Initialize multer upload
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
    files: 5 // Max 5 files per request
  },
  fileFilter: fileFilter
});

// Helper to normalize file paths for URLs
const normalizeFilePath = (filePath) => {
  // Replace backslashes with forward slashes and ensure path starts with /
  return filePath.replace(/\\/g, '/').replace(/^(?!\/)/, '/');
};

/**
 * Get all content sections
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getAllContent = async (req, res) => {
  try {
    const content = await contentModel.getAllContent();
    res.status(200).json(content);
  } catch (error) {
    console.error('Error in getAllContent controller:', error);
    res.status(500).json({ error: 'Failed to fetch content' });
  }
};

/**
 * Get content for a specific section
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getSectionContent = async (req, res) => {
  try {
    const { section } = req.params;
    
    if (!section) {
      return res.status(400).json({ error: 'Section parameter is required' });
    }
    
    const content = await contentModel.getSectionContent(section);
    
    if (!content) {
      return res.status(404).json({ error: 'Section not found' });
    }
    
    res.status(200).json(content);
  } catch (error) {
    console.error(`Error in getSectionContent controller for section ${req.params.section}:`, error);
    res.status(500).json({ error: 'Failed to fetch section content' });
  }
};

/**
 * Update content for a specific section
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const updateSectionContent = async (req, res) => {
  // This middleware handles file uploads for hero and feature sections
  const uploadFields = [
    { name: 'heroVideo', maxCount: 1 },
    { name: 'heroPoster', maxCount: 1 },
    { name: 'featureImage0', maxCount: 1 },
    { name: 'featureImage1', maxCount: 1 },
    { name: 'featureImage2', maxCount: 1 }
  ];
  
  const uploadMiddleware = upload.fields(uploadFields);
  
  uploadMiddleware(req, res, async (err) => {
    if (err) {
      console.error('Error during file upload:', err);
      return res.status(400).json({ error: err.message });
    }
    
    try {
      const { section } = req.params;
      
      if (!section) {
        return res.status(400).json({ error: 'Section parameter is required' });
      }
      
      // Get content data from request body
      let contentData;
      try {
        contentData = JSON.parse(req.body.content);
      } catch (error) {
        return res.status(400).json({ error: 'Invalid content JSON' });
      }
      
      // Handle explicit removal flags
      const shouldRemoveHeroVideo = req.body.removeHeroVideo === 'true';
      const shouldRemoveHeroPoster = req.body.removeHeroPoster === 'true';
      
      // Handle file uploads based on section
      if (section === 'hero') {
        // Process hero video if uploaded or handle removal
        const videoFile = req.files.heroVideo?.[0];
        if (videoFile) {
          const videoUrl = normalizeFilePath(`/uploads/videos/${videoFile.filename}`);
          console.log('Saving video media:', videoFile.filename);
          
          // Save media to database
          const videoMedia = await contentModel.saveMedia({
            filename: videoFile.filename,
            originalFilename: videoFile.originalname,
            fileType: 'video',
            mimeType: videoFile.mimetype,
            fileSize: videoFile.size,
            path: videoFile.path,
            url: videoUrl,
            altText: 'Hero video'
          });
          
          // Update content data with new video URL
          contentData.videoUrl = videoUrl;
        } else if (shouldRemoveHeroVideo) {
          console.log('Removing hero video');
          contentData.videoUrl = null;
        }
        
        // Process hero poster image if uploaded or handle removal
        const imageFile = req.files.heroPoster?.[0];
        if (imageFile) {
          const imageUrl = normalizeFilePath(`/uploads/images/${imageFile.filename}`);
          console.log('Saving image media:', imageFile.filename);
          
          // Save media to database
          const imageMedia = await contentModel.saveMedia({
            filename: imageFile.filename,
            originalFilename: imageFile.originalname,
            fileType: 'image',
            mimeType: imageFile.mimetype,
            fileSize: imageFile.size,
            path: imageFile.path,
            url: imageUrl,
            altText: 'Hero poster image'
          });
          
          // Update content data with new image URL
          contentData.posterImage = imageUrl;
        } else if (shouldRemoveHeroPoster) {
          console.log('Removing hero poster image');
          contentData.posterImage = null;
        }
      } else if (section === 'features') {
        // Process feature images (up to 3)
        for (let i = 0; i < 3; i++) {
          const imageFile = req.files[`featureImage${i}`]?.[0];
          const shouldRemoveFeatureImage = req.body[`removeFeatureImage${i}`] === 'true';
          
          if (imageFile) {
            const imageUrl = normalizeFilePath(`/uploads/images/${imageFile.filename}`);
            console.log(`Saving feature image ${i}:`, imageFile.filename);
            
            // Save media to database
            try {
              const imageMedia = await contentModel.saveMedia({
                filename: imageFile.filename,
                originalFilename: imageFile.originalname,
                fileType: 'image',
                mimeType: imageFile.mimetype,
                fileSize: imageFile.size,
                path: imageFile.path,
                url: imageUrl,
                altText: `Feature image ${i + 1}`
              });
              
              // Update feature column with new image URL
              if (contentData.columns && contentData.columns[i]) {
                contentData.columns[i].imageUrl = imageUrl;
              }
            } catch (error) {
              console.error(`Error saving feature image ${i}:`, error);
            }
          } else if (shouldRemoveFeatureImage) {
            console.log(`Removing feature image ${i}`);
            // Only set to null if the column exists
            if (contentData.columns && contentData.columns[i]) {
              contentData.columns[i].imageUrl = null;
            }
          }
        }
      }
      
      // Update section content in database
      const updatedContent = await contentModel.updateSectionContent(section, contentData);
      
      res.status(200).json({
        message: `${section} content updated successfully`,
        content: updatedContent
      });
    } catch (error) {
      console.error(`Error in updateSectionContent controller for section ${req.params.section}:`, error);
      res.status(500).json({ error: 'Failed to update section content' });
    }
  });
};

/**
 * Get all media files
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getAllMedia = async (req, res) => {
  try {
    const { type } = req.query;
    const media = await contentModel.getAllMedia(type);
    res.status(200).json(media);
  } catch (error) {
    console.error('Error in getAllMedia controller:', error);
    res.status(500).json({ error: 'Failed to fetch media files' });
  }
};

/**
 * Delete a media file
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const deleteMedia = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Media ID parameter is required' });
    }
    
    // Get media file info before deleting
    const media = await contentModel.getMediaById(id);
    
    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }
    
    // Delete record from database
    const deleted = await contentModel.deleteMedia(id);
    
    if (!deleted) {
      return res.status(500).json({ error: 'Failed to delete media from database' });
    }
    
    // Delete file from filesystem
    if (fs.existsSync(media.path)) {
      fs.unlinkSync(media.path);
    }
    
    res.status(200).json({ message: 'Media deleted successfully' });
  } catch (error) {
    console.error(`Error in deleteMedia controller for ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to delete media' });
  }
};

/**
 * Get the active theme
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getActiveTheme = async (req, res) => {
  try {
    const theme = await contentModel.getActiveTheme();
    
    if (!theme) {
      return res.status(404).json({ error: 'No active theme found' });
    }
    
    res.status(200).json(theme);
  } catch (error) {
    console.error('Error in getActiveTheme controller:', error);
    res.status(500).json({ error: 'Failed to fetch active theme' });
  }
};

/**
 * Set a theme as active
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const setActiveTheme = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Theme ID parameter is required' });
    }
    
    const theme = await contentModel.setActiveTheme(id);
    
    if (!theme) {
      return res.status(404).json({ error: 'Theme not found' });
    }
    
    res.status(200).json({
      message: 'Theme activated successfully',
      theme
    });
  } catch (error) {
    console.error(`Error in setActiveTheme controller for ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to activate theme' });
  }
};

/**
 * Create a new theme
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const createTheme = async (req, res) => {
  try {
    const { name, colors, isActive } = req.body;
    
    if (!name || !colors) {
      return res.status(400).json({ error: 'Name and colors are required' });
    }
    
    const theme = await contentModel.createTheme(name, colors, isActive);
    
    res.status(201).json({
      message: 'Theme created successfully',
      theme
    });
  } catch (error) {
    console.error('Error in createTheme controller:', error);
    res.status(500).json({ error: 'Failed to create theme' });
  }
};

/**
 * Get all themes
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getAllThemes = async (req, res) => {
  try {
    const themes = await contentModel.getAllThemes();
    res.status(200).json(themes);
  } catch (error) {
    console.error('Error in getAllThemes controller:', error);
    res.status(500).json({ error: 'Failed to fetch themes' });
  }
};

module.exports = {
  getAllContent,
  getSectionContent,
  updateSectionContent,
  getAllMedia,
  deleteMedia,
  getActiveTheme,
  setActiveTheme,
  createTheme,
  getAllThemes
}; 