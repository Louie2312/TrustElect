const express = require("express");
const { check } = require("express-validator");
const { registerStudent, getAllStudents, getStudentById, editStudent, deleteStudent, restoreStudent, resetStudentPassword, permanentDeleteStudent, unlockStudentAccount, uploadStudentsBatch, getStudentElections, getStudentProfile, uploadProfilePicture, getAvailableCriteria, getStudentsByCourses, validateStudentByNumber, searchStudents, changePassword, bulkDeleteStudentsByCourse, bulkPermanentDeleteStudentsByCourse, bulkDeleteArchivedStudentsByCourse } = require("../controllers/studentController");
const { verifyToken, isStudent, isSuperAdmin, allowRoles } = require("../middlewares/authMiddleware");
const router = express.Router();
const upload = require('../middlewares/uploadMiddleware');
const profileUpload = require('../middlewares/profileUploadMiddleware');
const path = require('path');
const fs = require('fs');
const { checkPermission } = require('../middlewares/permissionMiddleware');

router.get("/students/validate", validateStudentByNumber);

router.get("/students/search", searchStudents);

router.get("/students/elections", verifyToken, isStudent, getStudentElections);
router.get("/students/profile", verifyToken, isStudent, getStudentProfile);
router.post("/students/upload", verifyToken, isStudent, profileUpload.single('profilePic'), uploadProfilePicture);

// Add a new route to proxy candidate images with proper CORS headers
router.get("/images/candidates/:filename", (req, res) => {
  try {
    const filename = req.params.filename;
    // Sanitize filename to prevent path traversal attacks
    const sanitizedFilename = filename.replace(/\.\./g, '').replace(/\//g, '');
    
    const filePath = path.join(__dirname, '../../uploads/candidates', sanitizedFilename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('Image not found');
    }
    
    // Set proper CORS headers
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    
    // Send the file
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(500).send('Error serving image');
  }
});

// Debug route for token
router.get("/students/debug-token", verifyToken, (req, res) => {
  res.status(200).json({ 
    user: req.user,
    message: "Token debug information",
    hasStudentId: !!req.user.studentId,
  });
});

router.get("/protected", verifyToken, isStudent, (req, res) => {
  res.status(200).json({ message: "Welcome, Student! This is a protected route." });
});


router.get("/students", verifyToken, getAllStudents);


router.get("/students/:id", verifyToken, getStudentById);

router.post(
  "/students",
  verifyToken,
  [
    check("firstName", "First Name is required").not().isEmpty(),
    check("lastName", "Last Name is required").not().isEmpty(),
    check("email", "Valid email is required")
      .isEmail()
      .matches(/^[a-zA-Z0-9._%+-]+@novaliches\.sti\.edu(\.ph)?$/),
    check("studentNumber", "Student Number must be 11 digits and start with '02000'")
      .matches(/^02000[0-9]{6}$/),
    check("courseName", "Course name is required unless Course ID is provided")
      .if((value, { req }) => !req.body.courseId)
      .not()
      .isEmpty(),
    check("courseId", "Course ID must be a number if provided")
      .optional()
      .isInt(),
    check("yearLevel", "Year Level is required").not().isEmpty(),
    check("gender", "Gender must be Male, Female, or Other").isIn(["Male", "Female", "Other"]),
    check("createdBy", "Super Admin ID is required").isInt(),
  ],
  registerStudent
);

router.put("/students/:id", verifyToken, editStudent);
router.delete("/students/:id", verifyToken, deleteStudent);
router.patch("/students/:id/restore", verifyToken, restoreStudent);
router.patch("/students/:id/unlock", verifyToken, isSuperAdmin, unlockStudentAccount);
router.delete("/students/:id/permanent", verifyToken, permanentDeleteStudent);
router.post("/students/reset-password", verifyToken, isSuperAdmin, resetStudentPassword);
// Test endpoint to debug middleware issues
router.post('/students/batch-test', (req, res) => {
  console.log('=== BATCH TEST ENDPOINT HIT ===');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  res.json({ message: 'Test endpoint working', body: req.body, headers: req.headers });
});

// Test endpoint with file upload only
router.post('/students/batch-file-test', upload.single('file'), (req, res) => {
  console.log('=== FILE UPLOAD TEST ===');
  console.log('File:', req.file);
  console.log('Body:', req.body);
  res.json({ 
    message: 'File upload test working', 
    file: req.file ? { filename: req.file.filename, size: req.file.size } : null,
    body: req.body 
  });
});

// Error handling middleware specifically for batch route
const batchErrorHandler = (err, req, res, next) => {
  console.error('=== BATCH ROUTE ERROR HANDLER ===');
  console.error('Error type:', err.constructor.name);
  console.error('Error message:', err.message);
  console.error('Error code:', err.code);
  console.error('Full error:', err);
  console.error('Request info:', {
    method: req.method,
    url: req.url,
    file: req.file ? 'FILE_EXISTS' : 'NO_FILE',
    bodyKeys: Object.keys(req.body || {})
  });
  
  if (err.code === 'LIMIT_FILE_SIZE') {
    console.log('❌ FILE SIZE ERROR');
    return res.status(400).json({ 
      message: 'File too large. Maximum size is 5MB.',
      error: err.message,
      errorType: 'FILE_SIZE_LIMIT'
    });
  }
  
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    console.log('❌ UNEXPECTED FILE FIELD ERROR');
    return res.status(400).json({ 
      message: 'Unexpected file field. Use "file" as the field name.',
      error: err.message,
      errorType: 'UNEXPECTED_FIELD'
    });
  }
  
  if (err.message === 'Only Excel files are allowed!') {
    console.log('❌ INVALID FILE TYPE ERROR');
    return res.status(400).json({ 
      message: 'Invalid file type. Only Excel files (.xlsx, .xls) are allowed.',
      error: err.message,
      errorType: 'INVALID_FILE_TYPE'
    });
  }
  
  // Generic error
  console.log('❌ UNKNOWN ERROR');
  res.status(500).json({ 
    message: 'Internal server error in batch upload',
    error: err.message,
    errorType: 'UNKNOWN_ERROR'
  });
};

router.post(
  '/students/batch',
  (req, res, next) => {
    console.log('=== MIDDLEWARE DEBUG START ===');
    console.log('Route hit at:', new Date().toISOString());
    console.log('User-Agent:', req.get('User-Agent'));
    console.log('Content-Type:', req.get('Content-Type'));
    console.log('Content-Length:', req.get('Content-Length'));
    next();
  },
  verifyToken,
  (req, res, next) => {
    console.log('✅ Token verified - User ID:', req.user?.id);
    next();
  },
  isSuperAdmin,
  (req, res, next) => {
    console.log('✅ SuperAdmin verified, processing upload...');
    next();
  },
  (req, res, next) => {
    // Pre-upload diagnostics
    console.log('🔄 Starting file upload processing...');
    console.log('Upload directory exists:', require('fs').existsSync(require('path').join(__dirname, '../uploads')));
    next();
  },
  upload.single('file'),
  (req, res, next) => {
    console.log('📁 File upload middleware completed');
    console.log('File received:', req.file ? {
      filename: req.file.filename,
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      path: req.file.path
    } : 'NO FILE');
    console.log('Form data received:', req.body);
    
    // Detailed validation with specific error messages
    if (!req.file) {
      console.log('❌ VALIDATION FAILED: No file uploaded');
      return res.status(400).json({ 
        message: 'No file uploaded',
        error: 'File is required for batch upload',
        debugInfo: {
          contentType: req.get('Content-Type'),
          bodyKeys: Object.keys(req.body),
          hasFile: !!req.file
        }
      });
    }
    
    if (!req.body.createdBy) {
      console.log('❌ VALIDATION FAILED: Missing createdBy');
      console.log('Available body keys:', Object.keys(req.body));
      return res.status(400).json({ 
        message: 'Missing createdBy field',
        error: 'Super Admin ID is required',
        debugInfo: {
          bodyKeys: Object.keys(req.body),
          bodyValues: req.body
        }
      });
    }
    
    console.log('✅ Pre-validation passed, proceeding to controller...');
    next();
  },
  uploadStudentsBatch,
  batchErrorHandler
);

router.get("/by-courses", verifyToken, getStudentsByCourses);

// Admin student management routes with permission checks
router.get(
  '/admin/students',
  verifyToken,
  isSuperAdmin,
  checkPermission('users', 'view'),
  getAllStudents
);

router.post(
  '/admin/students',
  verifyToken,
  isSuperAdmin,
  checkPermission('users', 'create'),
  registerStudent
);

router.put(
  '/admin/students/:id',
  verifyToken,
  isSuperAdmin,
  checkPermission('users', 'edit'),
  editStudent
);

router.delete(
  '/admin/students/:id',
  verifyToken,
  isSuperAdmin,
  checkPermission('users', 'delete'),
  deleteStudent
);

router.post("/students/change-password", verifyToken, isStudent, changePassword);

// Bulk delete routes
router.post("/students/bulk-delete-by-course", verifyToken, isSuperAdmin, bulkDeleteStudentsByCourse);
router.post("/students/bulk-permanent-delete-by-course", verifyToken, isSuperAdmin, bulkPermanentDeleteStudentsByCourse);
router.post("/students/bulk-delete-archived-by-course", verifyToken, isSuperAdmin, bulkDeleteArchivedStudentsByCourse);

module.exports = router;
