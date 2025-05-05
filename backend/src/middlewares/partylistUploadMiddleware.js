const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads/partylists directory if it doesn't exist
const uploadDir = path.join(__dirname, '../../uploads/partylists');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate a unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'partylist-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Filter to only allow image files
const fileFilter = (req, file, cb) => {
  // Accept images only
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
    return cb(new Error('Only image files are allowed!'), false);
  }
  cb(null, true);
};

// Helper function to handle file uploads
const uploadToStorage = async (file) => {
  const filename = 'partylist-' + Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
  const filePath = path.join(uploadDir, filename);
  
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, file.buffer, (err) => {
      if (err) {
        reject(err);
        return;
      }
      
      resolve({
        filename,
        originalFilename: file.originalname,
        path: filePath,
        url: `/uploads/partylists/${filename}`
      });
    });
  });
};

module.exports = {
  upload: multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
  }),
  uploadToStorage
}; 