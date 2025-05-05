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
const { createAuditLog } = require("./middlewares/auditLogMiddleware");
const path = require("path");
const app = express();
const bodyParser = require("body-parser");
const departmentRoutes = require("./routes/departmentRoutes");  
const courseRoutes = require("./routes/courseRoutes");
const fs = require('fs');
const multer = require('multer');
const adminPermissionRoutes = require('./routes/adminPermissionRoutes');
const partylistRoutes = require('./routes/partylistRoutes');
require('./cron/cron');
app.use(cookieParser());
app.use(helmet());


const uploadsDir = path.join(__dirname, '../uploads');
const candidatesDir = path.join(uploadsDir, 'candidates');
const adminsDir = path.join(uploadsDir, 'admins');
const imagesDir = path.join(uploadsDir, 'images');
const videosDir = path.join(uploadsDir, 'videos');

// Ensure all necessary directories exist
[uploadsDir, candidatesDir, adminsDir, imagesDir, videosDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Enhanced CORS configuration
app.use(cors({ 
  origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Student-ID", "X-Vote-Token"],
  credentials: true,
  maxAge: 86400 // cache preflight requests for 1 day
}));
app.options('*', cors());

// Increase request size limits for file uploads
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Disable cache for API routes to ensure fresh content
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

// Apply audit log middleware to all API routes
app.use('/api', createAuditLog);

// Routes
app.use("/api/superadmin", superAdminRoutes);
app.use("/api/superadmin", adminRoutes); 
app.use("/api/admin", adminRoutes);
app.use("/api/superadmin", studentRoutes);
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/elections", electionRoutes);
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

// Health check endpoint
app.get("/api/healthcheck", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString()
  });
});

// Static file serving with improved content type detection
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  setHeaders: (res, filePath) => {
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Access-Control-Allow-Origin', '*');
    
    // Proper content type based on file extension
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
    
    // No cache for media files to ensure changes are always shown
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
}));
console.log('Static files served from:', path.join(__dirname, '../uploads'));

// Also serve public directory for static assets
app.use('/public', express.static(path.join(__dirname, '../public'), {
  setHeaders: (res, path) => {
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Access-Control-Allow-Origin', '*');
  }
}));

// Error handling for file uploads
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





