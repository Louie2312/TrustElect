const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Define upload directories
const baseUploadDir = path.join(__dirname, '../../uploads');
const imagesUploadDir = path.join(baseUploadDir, 'images');

// Ensure upload directories exist
[baseUploadDir, imagesUploadDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Log the upload directories for debugging
console.log('Base upload directory:', baseUploadDir);
console.log('Images upload directory:', imagesUploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log('Storing file in directory:', imagesUploadDir);
    cb(null, imagesUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = 'student-bg-' + uniqueSuffix + path.extname(file.originalname);
    console.log('Generated filename:', filename);
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept images only
  if (file.mimetype.startsWith('image/')) {
    console.log('File accepted:', file.originalname, file.mimetype);
    cb(null, true);
  } else {
    console.log('File rejected:', file.originalname, file.mimetype);
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB limit
  }
});

module.exports = upload; 