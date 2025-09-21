require("dotenv").config();

// Set timezone for the entire application
process.env.TZ = 'Asia/Manila';

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { connectDB } = require("./config/db");
const cookieParser = require("cookie-parser");
const superAdminRoutes = require("./routes/superAdminRoutes");
const electionRoutes = require("./routes/electionRoutes");
const adminRoutes = require("./routes/adminRoutes");
const studentRoutes = require("./routes/studentRoutes");
const ballotRoutes = require("./routes/ballotRoutes");
const maintenanceRoutes = require("./routes/maintenanceRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const contentRoutes = require("./routes/contentRoutes");
const auditLogRoutes = require("./routes/auditLogRoutes");
const roleBasedUserReportRoutes = require('./routes/roleBasedUserReportRoutes');
const failedLoginRoutes = require('./routes/failedLoginRoutes');
const systemLoadRoutes = require('./routes/systemLoadRoutes');
const votingTimeRoutes = require('./routes/votingTimeRoutes'); 
const { createAuditLog } = require("./middlewares/auditLogMiddleware");
const path = require("path");
const app = express();
const bodyParser = require("body-parser");
const departmentRoutes = require("./routes/departmentRoutes");
const departmentVoterReportRoutes = require("./routes/departmentVoterReportRoutes");
const courseRoutes = require("./routes/courseRoutes");
const fs = require('fs');
const multer = require('multer');
const adminPermissionRoutes = require('./routes/adminPermissionRoutes');
const partylistRoutes = require('./routes/partylistRoutes');
const partylistCandidateRoutes = require('./routes/partylistCandidateRoutes');
const studentUIRoutes = require('./routes/studentUIRoutes');
const electionReportRoutes = require('./routes/electionReportRoutes');
const voterParticipationRoutes = require('./routes/voterParticipationRoutes');
const candidateListReportRoutes = require('./routes/candidateListReportRoutes');
const adminActivityRoutes = require('./routes/adminActivityRoutes');
const checkEmailRoutes = require('./routes/checkEmailRoutes');
const superAdminCheckEmailRoutes = require('./routes/superAdminCheckEmailRoutes');
require('./cron/cron');
app.use(cookieParser());
app.use(helmet());

// Trust proxy so req.protocol reflects HTTPS behind reverse proxies (e.g., Nginx)
app.set('trust proxy', 1);


const uploadsDir = path.join(__dirname, '../uploads');
const candidatesDir = path.join(uploadsDir, 'candidates');
const adminsDir = path.join(uploadsDir, 'admins');
const imagesDir = path.join(uploadsDir, 'images');
const videosDir = path.join(uploadsDir, 'videos');

[uploadsDir, candidatesDir, adminsDir, imagesDir, videosDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Environment-aware CORS configuration
const corsOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['https://www.trustelectonline.com', 'https://trustelectonline.com'];

// Add localhost for development
const allowedOrigins = [
  ...corsOrigins,
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

console.log('🚀 CORS Origins loaded:', allowedOrigins);
console.log('🔧 Environment CORS_ORIGIN:', process.env.CORS_ORIGIN);
console.log('🛡️ Railway CORS Override Disabled:', process.env.RAILWAY_DISABLE_CORS_OVERRIDE);

// NUCLEAR CORS Middleware - Override Railway's aggressive interference
app.use((req, res, next) => {
  const origin = req.headers.origin;
  console.log(`🌐 Request from origin: ${origin}`);
  
  // Determine allowed origin
  let allowedOrigin = null;
  if (!origin) {
    allowedOrigin = allowedOrigins[0]; // Default to first allowed origin
  } else if (allowedOrigins.includes(origin)) {
    allowedOrigin = origin;
  } else if (origin && origin.includes('.vercel.app')) {
    allowedOrigin = origin; // Allow Vercel preview deployments
  }
  
  if (allowedOrigin) {
    // Aggressively set CORS headers BEFORE Railway can interfere
    res.header('Access-Control-Allow-Origin', allowedOrigin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Student-ID,X-Vote-Token,Accept,Origin,X-Requested-With');
    res.header('Access-Control-Max-Age', '86400'); // 24 hours
    
    console.log(`✅ CORS headers set for origin: ${allowedOrigin}`);
  } else {
    console.log(`❌ Origin not allowed: ${origin}`);
  }
  
  // Handle preflight OPTIONS requests immediately
  if (req.method === 'OPTIONS') {
    console.log('🔄 Handling preflight OPTIONS request');
    return res.status(200).end();
  }
  
  next();
});

// Standard CORS middleware as backup
app.use(cors({
  origin: function (origin, callback) {
    console.log(`🔍 CORS middleware checking origin: ${origin}`);
    
    if (!origin || allowedOrigins.includes(origin) || (origin && origin.includes(".vercel.app"))) {
      callback(null, true);
    } else {
      console.log(`🚫 CORS rejected origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Student-ID", "X-Vote-Token", "Accept", "Origin", "X-Requested-With"]
}));



app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware - log all incoming requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

app.use('/api', createAuditLog);

app.get('/api/direct/positions', async (req, res) => {
  try {
    const { electionTypeId } = req.query;
    const { getPositionsForElectionType, getAllPositions } = require('./models/positionModel');
    
    let positions;
    if (electionTypeId && electionTypeId !== 'undefined' && !isNaN(parseInt(electionTypeId))) {
      positions = await getPositionsForElectionType(parseInt(electionTypeId));
    } else {
      console.log("Invalid or missing electionTypeId, returning all positions");
      positions = await getAllPositions();
    }
    
    res.status(200).json({
      success: true,
      data: positions
    });
  } catch (error) {
    console.error("Position API error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch positions"
    });
  }
});

app.post('/api/direct/positions', async (req, res) => {
  try {
    const { name, electionTypeId } = req.body;
    
    if (!name || !electionTypeId) {
      return res.status(400).json({
        success: false,
        message: "Position name and election type ID are required"
      });
    }
    
    const { createPosition } = require('./models/positionModel');
    const newPosition = await createPosition(name, electionTypeId);
    
    res.status(201).json({
      success: true,
      data: newPosition,
      message: "Position created successfully"
    });
  } catch (error) {
    console.error("Position API error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to create position"
    });
  }
});

app.put('/api/direct/positions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Position name is required"
      });
    }
    
    const { updatePosition } = require('./models/positionModel');
    const updatedPosition = await updatePosition(id, name);
    
    res.status(200).json({
      success: true,
      data: updatedPosition,
      message: "Position updated successfully"
    });
  } catch (error) {
    console.error("Position API error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to update position"
    });
  }
});

app.delete('/api/direct/positions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { deletePosition } = require('./models/positionModel');
    const result = await deletePosition(id);
    
    res.status(200).json({
      success: true,
      data: result,
      message: "Position deleted successfully"
    });
  } catch (error) {
    console.error("Position API error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to delete position"
    });
  }
});

// Define direct routes for student validation and search
app.get('/api/students/validate', (req, res) => {
  const { validateStudentByNumber } = require('./controllers/studentController');
  validateStudentByNumber(req, res);
});

app.get('/api/students/search', (req, res) => {
  const { searchStudents } = require('./controllers/studentController');
  searchStudents(req, res);
});

// Define direct routes for partylist candidates
app.get('/api/partylists/:partylistId/candidates', (req, res) => {
  const { getPartylistCandidates } = require('./controllers/partylistCandidateController');
  getPartylistCandidates(req, res);
});

app.post('/api/partylists/:partylistId/candidates', (req, res) => {
  const { addPartylistCandidate } = require('./controllers/partylistCandidateController');
  addPartylistCandidate(req, res);
});

app.delete('/api/candidates/:candidateId', (req, res) => {
  const { removePartylistCandidate } = require('./controllers/partylistCandidateController');
  removePartylistCandidate(req, res);
});

app.put('/api/candidates/:candidateId', (req, res) => {
  const { updatePartylistCandidate } = require('./controllers/partylistCandidateController');
  updatePartylistCandidate(req, res);
});

app.use("/api/superadmin", superAdminRoutes);
app.use("/api/superadmin", adminRoutes); 
app.use("/api/admin", adminRoutes);
app.use("/api/admin", checkEmailRoutes);
app.use("/api/admin", departmentRoutes);
app.use("/api/superadmin", superAdminCheckEmailRoutes);
app.use("/api/superadmin", studentRoutes);
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/elections", electionRoutes);
app.use("/api/reports", electionReportRoutes);
app.use("/api/reports/role-based", roleBasedUserReportRoutes);
app.use("/api/reports", failedLoginRoutes);  // Changed from /api/reports/failed-logins
app.use("/api/reports/summary", electionReportRoutes);
app.use("/api/reports/upcoming-elections", electionReportRoutes);
app.use("/api/reports/live-vote-count", electionReportRoutes);
app.use("/api/reports", systemLoadRoutes);  // Changed from /api/reports/system-load
app.use("/api/reports", voterParticipationRoutes);  // Changed from /api/reports/voter-participation
app.use("/api/reports", votingTimeRoutes);  // Added voting time routes
app.use("/api/reports", departmentVoterReportRoutes);  // Added department voter report routes
app.use("/api/reports/candidate-list", candidateListReportRoutes);
app.use("/api/reports/admin-activity", adminActivityRoutes);  // Updated path for admin activity routes
app.use("/api", studentRoutes);
app.use("/api/ballots", ballotRoutes);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/superadmin", departmentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/audit-logs", auditLogRoutes);
app.use('/api/admin-permissions', adminPermissionRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/partylists', partylistRoutes);
app.use('/api/partylist-candidates', partylistCandidateRoutes);
// Serve static files from uploads directory - MUST come before API routes
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  setHeaders: (res, filePath) => {
    console.log('Serving static file:', filePath);
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Access-Control-Allow-Origin', '*');

    if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.set('Content-Type', 'image/jpeg');
    } else if (filePath.endsWith('.png')) {
      res.set('Content-Type', 'image/png');
    } else if (filePath.endsWith('.gif')) {
      res.set('Content-Type', 'image/gif');
    } else if (filePath.endsWith('.webp')) {
      res.set('Content-Type', 'image/webp');
    } else if (filePath.endsWith('.mp4')) {
      res.set('Content-Type', 'video/mp4');
    } else if (filePath.endsWith('.webm')) {
      res.set('Content-Type', 'video/webm');
    }

    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
}));
console.log('Static files served from:', path.join(__dirname, '../uploads'));

// Also expose uploads under /api/uploads for reverse proxy setups that only route /api
app.use('/api/uploads', express.static(path.join(__dirname, '../uploads'), {
  setHeaders: (res, filePath) => {
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Access-Control-Allow-Origin', '*');

    if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.set('Content-Type', 'image/jpeg');
    } else if (filePath.endsWith('.png')) {
      res.set('Content-Type', 'image/png');
    } else if (filePath.endsWith('.gif')) {
      res.set('Content-Type', 'image/gif');
    } else if (filePath.endsWith('.webp')) {
      res.set('Content-Type', 'image/webp');
    } else if (filePath.endsWith('.mp4')) {
      res.set('Content-Type', 'video/mp4');
    } else if (filePath.endsWith('.webm')) {
      res.set('Content-Type', 'video/webm');
    }

    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
}));

app.use('/api/students', studentRoutes);
app.use('/api/studentUI', studentUIRoutes);
app.use('/api/department-voter-reports', departmentVoterReportRoutes);


app.get("/api/healthcheck", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString()
  });
});

// Debug endpoint to check uploaded files
app.get("/api/debug/files", (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, '../uploads');
    const imagesDir = path.join(uploadsDir, 'images');
    
    let files = [];
    if (fs.existsSync(imagesDir)) {
      files = fs.readdirSync(imagesDir).map(file => ({
        name: file,
        path: `/uploads/images/${file}`,
        fullPath: path.join(imagesDir, file)
      }));
    }
    
    res.json({
      uploadsDir,
      imagesDir,
      files,
      exists: fs.existsSync(imagesDir)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Specific route to handle image requests with better error handling
app.get('/uploads/images/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const imagePath = path.join(__dirname, '../uploads/images', filename);
    
    console.log('Requested image:', filename);
    console.log('Full path:', imagePath);
    console.log('File exists:', fs.existsSync(imagePath));
    
    if (!fs.existsSync(imagePath)) {
      console.log('Image not found:', imagePath);
      return res.status(404).json({ error: 'Image not found' });
    }
    
    // Set appropriate content type
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream';
    
    if (ext === '.jpg' || ext === '.jpeg') {
      contentType = 'image/jpeg';
    } else if (ext === '.png') {
      contentType = 'image/png';
    } else if (ext === '.gif') {
      contentType = 'image/gif';
    } else if (ext === '.webp') {
      contentType = 'image/webp';
    }
    
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Access-Control-Allow-Origin', '*');
    
    res.sendFile(imagePath);
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(500).json({ error: 'Error serving image' });
  }
});

// Specific route to handle profile image requests
app.get('/uploads/profiles/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const imagePath = path.join(__dirname, '../uploads/profiles', filename);
    
    console.log('Requested profile image:', filename);
    console.log('Full path:', imagePath);
    console.log('File exists:', fs.existsSync(imagePath));
    
    if (!fs.existsSync(imagePath)) {
      console.log('Profile image not found:', imagePath);
      return res.status(404).json({ error: 'Profile image not found' });
    }
    
    // Set appropriate content type
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream';
    
    if (ext === '.jpg' || ext === '.jpeg') {
      contentType = 'image/jpeg';
    } else if (ext === '.png') {
      contentType = 'image/png';
    } else if (ext === '.gif') {
      contentType = 'image/gif';
    } else if (ext === '.webp') {
      contentType = 'image/webp';
    }
    
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Access-Control-Allow-Origin', '*');
    
    res.sendFile(imagePath);
  } catch (error) {
    console.error('Error serving profile image:', error);
    res.status(500).json({ error: 'Error serving profile image' });
  }
});

// Test endpoint to check if a specific image exists
app.get('/api/test-image/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const imagePath = path.join(__dirname, '../uploads/images', filename);
    
    const exists = fs.existsSync(imagePath);
    const stats = exists ? fs.statSync(imagePath) : null;
    
    res.json({
      filename,
      exists,
      path: imagePath,
      size: stats ? stats.size : 0,
      url: `/uploads/images/${filename}`,
      absoluteUrl: `https://trustelectonline.com/uploads/images/${filename}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.head("/api/healthcheck", (req, res) => {
  res.status(200).end();
});


app.use('/public', express.static(path.join(__dirname, '../public'), {
  setHeaders: (res, path) => {
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Access-Control-Allow-Origin', '*');
  }
}));

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      message: err.code === 'LIMIT_FILE_SIZE' 
        ? 'File too large (max 20MB)' 
        : 'File upload error: ' + err.message
    });
  }
  next(err);
});

app.get("/", (req, res) => {
  res.send("TrustElect API is Running!");
});

module.exports = app;


