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


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, imagesUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = 'student-bg-' + uniqueSuffix + path.extname(file.originalname);
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept images only
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
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