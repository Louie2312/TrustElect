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
  console.error('=== BATCH ROUTE ERROR ===');
  console.error('Error:', err);
  console.error('Stack:', err.stack);
  
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ 
      message: 'File too large. Maximum size is 5MB.',
      error: err.message 
    });
  }
  
  if (err.message === 'Only Excel files are allowed!') {
    return res.status(400).json({ 
      message: 'Invalid file type. Only Excel files (.xlsx, .xls) are allowed.',
      error: err.message 
    });
  }
  
  res.status(500).json({ 
    message: 'Internal server error in batch upload',
    error: err.message 
  });
};

router.post(
  '/students/batch',
  (req, res, next) => {
    console.log('=== MIDDLEWARE DEBUG ===');
    console.log('Route hit, checking token...');
    next();
  },
  verifyToken,
  (req, res, next) => {
    console.log('Token verified, checking superadmin...');
    next();
  },
  isSuperAdmin,
  (req, res, next) => {
    console.log('SuperAdmin verified, processing upload...');
    next();
  },
  upload.single('file'),
  (req, res, next) => {
    console.log('File upload processed:', req.file ? 'File exists' : 'No file');
    console.log('Body after upload:', req.body);
    next();
  },
  [
    check('createdBy', 'Super Admin ID is required').notEmpty()
  ],
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
