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
  // Create dynamic upload fields for feature images
  const uploadFields = [
    { name: 'heroVideo', maxCount: 1 },
    { name: 'heroPoster', maxCount: 1 }
  ];
  
  // Support up to 10 feature cards
  for (let i = 0; i < 10; i++) {
    uploadFields.push({ name: `featureImage${i}`, maxCount: 1 });
  }
  
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
      
      // Helper function to validate color format
      function isValidColorFormat(color) {
        return /^#([0-9A-F]{3}){1,2}$/i.test(color);
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

          contentData.videoUrl = videoUrl;
        } else if (shouldRemoveHeroVideo) {
          console.log('Removing hero video');
          contentData.videoUrl = null;
        }

        const imageFile = req.files.heroPoster?.[0];
        if (imageFile) {
          const imageUrl = normalizeFilePath(`/uploads/images/${imageFile.filename}`);
          console.log('Saving image media:', imageFile.filename);

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

          contentData.posterImage = imageUrl;
        } else if (shouldRemoveHeroPoster) {
          console.log('Removing hero poster image');
          contentData.posterImage = null;
        }

        if (contentData.bgColor && !isValidColorFormat(contentData.bgColor)) {
          contentData.bgColor = "#1e40af"; 
        }
        if (contentData.textColor && !isValidColorFormat(contentData.textColor)) {
          contentData.textColor = "#ffffff"; 
        }
        
      } else if (section === 'features') {

        if (contentData.columns && Array.isArray(contentData.columns)) {
       
          for (let i = 0; i < contentData.columns.length; i++) {
            const imageFile = req.files[`featureImage${i}`]?.[0];
            const shouldRemoveFeatureImage = req.body[`removeFeatureImage${i}`] === 'true';
            
            if (imageFile) {
              const imageUrl = normalizeFilePath(`/uploads/images/${imageFile.filename}`);
            
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

                contentData.columns[i].imageUrl = imageUrl;
              } catch (error) {
                console.error(`Error saving feature image ${i}:`, error);
              }
            } else if (shouldRemoveFeatureImage) {
           
              contentData.columns[i].imageUrl = null;
            }

            if (contentData.columns[i].bgColor && !isValidColorFormat(contentData.columns[i].bgColor)) {
              contentData.columns[i].bgColor = "#ffffff"; 
            }
            if (contentData.columns[i].textColor && !isValidColorFormat(contentData.columns[i].textColor)) {
              contentData.columns[i].textColor = "#000000"; 
            }
          }
        }
      } else if (section === 'callToAction') {

        if (contentData.bgColor && !isValidColorFormat(contentData.bgColor)) {
          contentData.bgColor = "#1e3a8a"; 
        }
        if (contentData.textColor && !isValidColorFormat(contentData.textColor)) {
          contentData.textColor = "#ffffff";
        }
      }

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

    const media = await contentModel.getMediaById(id);
    
    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }

    const deleted = await contentModel.deleteMedia(id);
    
    if (!deleted) {
      return res.status(500).json({ error: 'Failed to delete media from database' });
    }

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

const saveTheme = async (req, res) => {
  try {
    const { name, colors } = req.body;
    
    if (!name || !colors) {
      return res.status(400).json({ error: 'Theme name and colors are required' });
    }

    const validColors = { ...colors };
    for (const [key, value] of Object.entries(validColors)) {
      if (typeof value === 'string' && !/^#([0-9A-F]{3}){1,2}$/i.test(value)) {

        if (key.includes('bg')) {
          validColors[key] = '#ffffff';
        } else {
          validColors[key] = '#000000';
        }
      }
    }
    
    const theme = await contentModel.createTheme(name, validColors);
    
    res.status(201).json({
      message: 'Theme saved successfully',
      theme
    });
  } catch (error) {
    console.error('Error in saveTheme controller:', error);
    res.status(500).json({ error: 'Failed to save theme' });
  }
};

const applyTheme = async (req, res) => {
  try {
    const { themeId } = req.params;
    
    if (!themeId) {
      return res.status(400).json({ error: 'Theme ID is required' });
    }
    

    const theme = await contentModel.getThemeById(themeId);
    
    if (!theme) {
      return res.status(404).json({ error: 'Theme not found' });
    }
    

    const content = await contentModel.getAllContent();

    if (content.hero) {
      content.hero.bgColor = theme.colors.heroBg || '#1e40af';
      content.hero.textColor = theme.colors.heroText || '#ffffff';
    }
    
    if (content.features && content.features.columns) {
      content.features.columns = content.features.columns.map(column => ({
        ...column,
        bgColor: theme.colors.featureBg || '#ffffff',
        textColor: theme.colors.featureText || '#000000'
      }));
    }
    
    if (content.callToAction) {
      content.callToAction.bgColor = theme.colors.ctaBg || '#1e3a8a';
      content.callToAction.textColor = theme.colors.ctaText || '#ffffff';
    }
    

    await contentModel.updateSectionContent('hero', content.hero);
    await contentModel.updateSectionContent('features', content.features);
    await contentModel.updateSectionContent('callToAction', content.callToAction);
    
    res.status(200).json({
      message: 'Theme applied successfully',
      content
    });
  } catch (error) {
    console.error(`Error in applyTheme controller:`, error);
    res.status(500).json({ error: 'Failed to apply theme' });
  }
};

const getThemeById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Theme ID parameter is required' });
    }
    
    const theme = await contentModel.getThemeById(id);
    
    if (!theme) {
      return res.status(404).json({ error: 'Theme not found' });
    }
    
    res.status(200).json(theme);
  } catch (error) {
    console.error(`Error in getThemeById controller for ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to fetch theme' });
  }
};

const updateTheme = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, colors } = req.body;
    
    if (!id) {
      return res.status(400).json({ error: 'Theme ID parameter is required' });
    }
    
    if (!name || !colors) {
      return res.status(400).json({ error: 'Theme name and colors are required' });
    }
    
    const theme = await contentModel.updateTheme(id, name, colors);
    
    if (!theme) {
      return res.status(404).json({ error: 'Theme not found' });
    }
    
    res.status(200).json({
      message: 'Theme updated successfully',
      theme
    });
  } catch (error) {
    console.error(`Error in updateTheme controller for ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to update theme' });
  }
};

const deleteTheme = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Theme ID parameter is required' });
    }
    
    const deleted = await contentModel.deleteTheme(id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Theme not found or could not be deleted' });
    }
    
    res.status(200).json({ message: 'Theme deleted successfully' });
  } catch (error) {
    console.error(`Error in deleteTheme controller for ID ${req.params.id}:`, error);
    res.status(500).json({ error: error.message || 'Failed to delete theme' });
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
  getAllThemes,
  saveTheme,
  applyTheme,
  getThemeById,
  updateTheme,
  deleteTheme
}; 