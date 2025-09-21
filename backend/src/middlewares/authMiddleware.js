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
 
    req.user = decoded; 
    req.userId = decoded.id;
    
  
    if (decoded.id) {
      try {
        const { rows } = await pool.query(
          'SELECT role_id, is_first_login FROM users WHERE id = $1',
          [decoded.id]
        );
        
        if (rows.length > 0) {
        
          req.user.role_id = rows[0].role_id;

          req.user.is_first_login = rows[0].is_first_login;

          if (req.user.role_id === 1) {
            req.user.normalizedRole = 'Super Admin';
          } else if (req.user.role_id === 2) {
            req.user.normalizedRole = 'Admin';
          } else if (req.user.role_id === 3) {
            req.user.normalizedRole = 'Student';
          }
          
          console.log("Auth middleware - User role set:", {
            id: req.user.id,
            role_id: req.user.role_id,
            normalizedRole: req.user.normalizedRole,
            role: req.user.role
          });
          
        } else {
          console.warn(`User with ID ${decoded.id} not found in database`);
        }
      } catch (dbError) {
        console.error('Error fetching user role_id:', dbError);
       
      }
    }
    
    next();
  } catch (error) {
    console.error('Token verification failed:', error); 
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: "Your session has expired. Please login again." });
    }
    return res.status(403).json({ message: "Unauthorized. Invalid token." });
  }
};

const allowRoles = (...roles) => {
  return (req, res, next) => {

    const roleMatch = roles.some(role => {

      if (req.user?.role && req.user.role === role) {
        return true;
      }

      if (req.user?.normalizedRole && req.user.normalizedRole === role) {
        return true;
      }

      if (req.user?.role_id) {
        if (role === 'Super Admin' && req.user.role_id === 1) {
          return true;
        }
        if (role === 'Admin' && req.user.role_id === 2) {
          return true;
        }
        if (role === 'Student' && req.user.role_id === 3) {
          return true;
        }
      }
      
      return false;
    });
    
    if (!roleMatch) {
     
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

const isSuperAdmin = allowRoles("Super Admin");
const isAdmin = allowRoles("Admin");
const isStudent = allowRoles("Student");

module.exports = { 
  verifyToken, 
  isSuperAdmin, 
  isAdmin, 
  isStudent, 
  verifyStudentRecord,
  allowRoles
};
