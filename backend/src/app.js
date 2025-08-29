require("dotenv").config();
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
const votingTimeRoutes = require('./routes/votingTimeRoutes'); // Added voting time routes
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
require('./cron/cron');
app.use(cookieParser());
app.use(helmet());


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

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    "https://trustelectonline.com",
    "https://www.trustelectonline.com"
  ];
  
  // Allow Vercel preview deployments
  const isVercelDomain = origin && origin.includes('.vercel.app');
  
  if (allowedOrigins.includes(origin) || isVercelDomain) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Student-ID, X-Vote-Token');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
});


app.options('*', cors());

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
app.use('/api/students', studentRoutes);
app.use('/api/studentUI', studentUIRoutes);
app.use('/api/department-voter-reports', departmentVoterReportRoutes);


app.get("/api/healthcheck", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString()
  });
});

app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
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
console.log('Static files served from:', path.join(__dirname, '../uploads'));

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


