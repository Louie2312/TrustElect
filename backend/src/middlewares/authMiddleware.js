const jwt = require("jsonwebtoken");
const pool = require("../config/db");
require("dotenv").config();

const verifyToken = async (req, res, next) => {

  let token = req.header("Authorization")?.replace("Bearer ", "") || req.cookies?.token;

  if (!token) {

    return res.status(401).json({ message: "Unauthorized. Token is missing." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const now = Math.floor(Date.now() / 1000);
    const timeToExpire = decoded.exp - now;
    console.log(`Token expires in ${timeToExpire} seconds (${Math.floor(timeToExpire / 60)} minutes)`);

    req.user = decoded; 
    // Set userId for easy access in controller functions
    req.userId = decoded.id;
    
  
    if (decoded.id) {
      try {
        const { rows } = await pool.query(
          'SELECT role_id, is_first_login FROM users WHERE id = $1',
          [decoded.id]
        );
        
        if (rows.length > 0) {
          // Add role_id to the user object
          req.user.role_id = rows[0].role_id;
          // Add is_first_login flag to the user object
          req.user.is_first_login = rows[0].is_first_login;
      
          
          // Normalize role name for consistent checks
          if (req.user.role_id === 1) {
            req.user.normalizedRole = 'Super Admin';
          } else if (req.user.role_id === 2) {
            req.user.normalizedRole = 'Admin';
          } else if (req.user.role_id === 3) {
            req.user.normalizedRole = 'Student';
          }
          
        } else {
          console.warn(`User with ID ${decoded.id} not found in database`);
        }
      } catch (dbError) {
        console.error('Error fetching user role_id:', dbError);
        // Continue with token info only
      }
    }
    
    next();
  } catch (error) {
    console.error('Token verification failed:', error); // Debug log
    return res.status(403).json({ message: "Unauthorized. Invalid or expired token." });
  }
};


//Generic Role-Based Access Middleware
const allowRoles = (...roles) => {
  return (req, res, next) => {
    console.log('Checking roles:', { 
      required: roles, 
      user: req.user?.role,
      role_id: req.user?.role_id,
      normalizedRole: req.user?.normalizedRole
    });
    
    // Check with multiple methods to ensure reliable role verification
    const roleMatch = roles.some(role => {
      // Method 1: Direct match with token role string
      if (req.user?.role && req.user.role === role) {
        console.log(`Role match by direct string: ${role}`);
        return true;
      }
      
      // Method 2: Match with normalized role
      if (req.user?.normalizedRole && req.user.normalizedRole === role) {
        console.log(`Role match by normalized role: ${role}`);
        return true;
      }
      
      // Method 3: Match by role_id
      if (req.user?.role_id) {
        if (role === 'Super Admin' && req.user.role_id === 1) {
          console.log(`Role match by role_id: Super Admin (1)`);
          return true;
        }
        if (role === 'Admin' && req.user.role_id === 2) {
          console.log(`Role match by role_id: Admin (2)`);
          return true;
        }
        if (role === 'Student' && req.user.role_id === 3) {
          console.log(`Role match by role_id: Student (3)`);
          return true;
        }
      }
      
      return false;
    });
    
    if (!roleMatch) {
      console.log('Access denied for role:', {
        requestedRole: roles,
        userRole: req.user?.role,
        userRoleId: req.user?.role_id
      });
      
      return res.status(403).json({ 
        message: `Access Denied. Only ${roles.join(", ")} allowed.`,
        currentRole: req.user?.normalizedRole || req.user?.role || 'No role'
      });
    }
    
    next();
  };
};


const verifyStudentRecord = async (req, res, next) => {
  try {
    if (req.user.role.toLowerCase() !== 'student') {
     
      return next();
    }


    if (!req.user.studentId) {
  
      const studentResult = await pool.query(
        `SELECT s.id 
         FROM students s 
         JOIN users u ON s.email = u.email 
         WHERE u.id = $1 AND s.is_active = TRUE`,
        [req.user.id]
      );

      if (studentResult.rows.length > 0) {
  
        req.user.studentId = studentResult.rows[0].id;
      } else {
        
        return res.status(403).json({ 
          message: "Student account not properly configured" 
        });
      }
    }

    // Verify student record exists and is active
    const student = await pool.query(
      `SELECT 1 FROM students WHERE id = $1 AND is_active = TRUE`,
      [req.user.studentId]
    );

    if (student.rows.length === 0) {
      return res.status(404).json({ 
        message: "Your student record could not be found" 
      });
    }

    next();
  } catch (error) {
    console.error("Student verification error:", error);
    res.status(500).json({ message: error.message });
  }
};
//Define Role-Based Middlewares
const isSuperAdmin = allowRoles("Super Admin");
const isAdmin = allowRoles("Admin");
const isStudent = allowRoles("Student");

module.exports = { verifyToken, isSuperAdmin, isAdmin, isStudent, verifyStudentRecord };
