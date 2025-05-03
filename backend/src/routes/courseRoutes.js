const express = require("express");
const router = express.Router();
const { verifyToken, isSuperAdmin } = require("../middlewares/authMiddleware");
const pool = require("../config/db");
const { getPrograms } = require("../models/maintenanceModel");

router.get("/", verifyToken, async (req, res) => {
  try {
    const dbResult = await pool.query(
      "SELECT id, course_name FROM courses ORDER BY course_name ASC"
    );
    
    const programsResult = await getPrograms();
    const programNames = programsResult.map(program => program.name);
    
    const existingCourseNames = new Set(dbResult.rows.map(course => course.course_name));
    
    const courses = [...dbResult.rows];
    
    let needsSync = false;
    for (const programName of programNames) {
      if (!existingCourseNames.has(programName)) {
        needsSync = true;
        courses.push({
          id: null,
          course_name: programName,
          not_in_db: true
        });
        
        // Also try to insert it into the courses table to keep things in sync
        try {
          const insertResult = await pool.query(
            "INSERT INTO courses (course_name) VALUES ($1) RETURNING id, course_name",
            [programName]
          );
          
          if (insertResult.rows.length > 0) {
            // Update the entry with the new ID
            courses[courses.length - 1] = {
              id: insertResult.rows[0].id,
              course_name: insertResult.rows[0].course_name
            };
          }
        } catch (insertError) {
          console.error(`Failed to add ${programName} to courses:`, insertError);
          // Keep the entry in the response with null ID
        }
      }
    }
    
    res.status(200).json({
      success: true,
      courses: courses,
      synced: needsSync
    });
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch courses",
      error: error.message
    });
  }
});

// Route to manually sync courses from maintenance API
router.post("/sync", verifyToken, isSuperAdmin, async (req, res) => {
  try {
    const { syncCourses } = require('../scripts/syncCourses');
    
    // Run the sync function
    await syncCourses();
    
    // Get updated list of courses
    const updatedCoursesResult = await pool.query(
      "SELECT id, course_name FROM courses ORDER BY course_name ASC"
    );
    
    res.status(200).json({
      success: true,
      message: "Courses synchronized successfully",
      courses: updatedCoursesResult.rows
    });
  } catch (error) {
    console.error("Error synchronizing courses:", error);
    res.status(500).json({
      success: false,
      message: "Failed to synchronize courses",
      error: error.message
    });
  }
});

module.exports = router; 