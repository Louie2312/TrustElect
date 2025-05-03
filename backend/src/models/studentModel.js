const pool = require("../config/db");
const bcrypt = require("bcrypt");


const checkStudentNumberExists = async (studentNumber) => {
  const query = "SELECT COUNT(*) FROM students WHERE student_number = $1";
  const result = await pool.query(query, [studentNumber]);
  return parseInt(result.rows[0].count) > 0;
};

const getStudentByEmail = async (email) => {
  const query = `
    SELECT u.*, s.id as student_id, u.password_hash as password
    FROM users u
    JOIN students s ON u.email = s.email
    WHERE u.email = $1 AND u.role_id = 3 AND s.is_active = TRUE
  `;
  const result = await pool.query(query, [email]);
  return result.rows[0];
};


const registerStudent = async (firstName, lastName, email, username, hashedPassword, studentNumber, courseName, yearLevel, gender, createdBy, courseId) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    console.log("✔ Registering in DB. Created by:", createdBy); 

    const userQuery = `
      INSERT INTO users (first_name, last_name, email, username, password_hash, role_id, created_by, is_email_verified, is_first_login, is_active)
      VALUES ($1, $2, $3, $4, $5, 3, $6, FALSE, TRUE, TRUE) RETURNING id;
    `; 
    const userValues = [firstName, lastName, email, username, hashedPassword, createdBy];
    const userResult = await client.query(userQuery, userValues);
    const userId = userResult.rows[0].id;

    // If courseId is provided but courseName is not, fetch the course name from the database
    if (courseId && !courseName) {
      try {
        const courseResult = await client.query(
          "SELECT course_name FROM courses WHERE id = $1",
          [courseId]
        );
        
        if (courseResult.rows.length > 0) {
          courseName = courseResult.rows[0].course_name;
        } else {
          throw new Error(`Course with ID ${courseId} not found`);
        }
      } catch (error) {
        console.error("Error fetching course name from ID:", error);
        throw new Error(`Failed to get course name for ID ${courseId}: ${error.message}`);
      }
    }
    
    // Make sure we have a valid course name by this point
    if (!courseName) {
      throw new Error('Course name is required for student registration');
    }

    // Ensure the course exists in the database
    try {
      await client.query(
        "INSERT INTO courses (course_name) VALUES ($1) ON CONFLICT (course_name) DO NOTHING",
        [courseName]
      );
    } catch (error) {
      console.error(`Failed to ensure course exists: ${error.message}`);
      // Continue anyway - don't break the registration flow for this
    }

    const studentQuery = `
      INSERT INTO students (user_id, first_name, last_name, email, username, student_number, course_name, year_level, gender, registered_by, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE);
    `;
    const studentValues = [userId, firstName, lastName, email, username, studentNumber, courseName, yearLevel, gender, createdBy];
    await client.query(studentQuery, studentValues);

    
    await client.query("COMMIT");
    return { id: userId, firstName, lastName, email, username, role: "Student", courseName, yearLevel, studentNumber, gender };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Database Error:", error);
    throw error;
  } finally {
    client.release();
  }
};


const getAllStudents = async () => {
  const query = `
    SELECT 
      s.id, 
      s.first_name, 
      s.last_name, 
      s.email, 
      s.student_number, 
      s.course_name, 
      s.year_level, 
      s.gender, 
      s.is_active,
      u.is_locked,
      u.locked_until
    FROM students s
    JOIN users u ON s.user_id = u.id
    ORDER BY last_name ASC;
  `;
  const result = await pool.query(query);
  return result.rows;
};

const getStudentById = async (studentId) => {
  const query = `
    SELECT 
      s.id, 
      s.first_name, 
      s.last_name, 
      s.email, 
      s.student_number, 
      s.course_name, 
      s.year_level, 
      s.gender, 
      s.is_active,
      u.is_locked,
      u.locked_until
    FROM students s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = $1;
  `;
  const result = await pool.query(query, [studentId]);
  return result.rows[0] || null;
};


const unlockStudentAccount = async (studentId) => {
  const query = `
    UPDATE users
    SET 
      is_locked = FALSE,
      login_attempts = 0,
      locked_until = NULL
    WHERE id = (SELECT user_id FROM students WHERE id = $1)
    RETURNING id;
  `;
  const result = await pool.query(query, [studentId]);
  return result.rows[0] || null;
};

const updateStudent = async (studentId, firstName, lastName, courseName, yearLevel, gender) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    // Ensure the course exists before updating
    if (courseName) {
      try {
        await client.query(
          "INSERT INTO courses (course_name) VALUES ($1) ON CONFLICT (course_name) DO NOTHING",
          [courseName]
        );
      } catch (error) {
        console.error(`Failed to ensure course exists during update: ${error.message}`);
        // Continue anyway - don't break the update flow for this
      }
    }
    
    const query = `
      UPDATE students
      SET first_name = $1, last_name = $2, course_name = $3, year_level = $4, gender = $5, updated_at = NOW()
      WHERE id = $6
      RETURNING *;
    `;
    const values = [firstName, lastName, courseName, yearLevel, gender, studentId];
    const result = await client.query(query, values);
    
    await client.query("COMMIT");
    return result.rows[0] || null;
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error updating student:", error);
    throw error;
  } finally {
    client.release();
  }
};


const softDeleteStudent = async (studentId) => {
  const query = `
    UPDATE students
    SET is_active = FALSE
    WHERE id = $1
    RETURNING *;
  `;
  const result = await pool.query(query, [studentId]);
  return result.rows[0] || null;
};


const restoreStudent = async (studentId) => {
  const query = `
    UPDATE students
    SET is_active = TRUE
    WHERE id = $1
    RETURNING *;
  `;
  const result = await pool.query(query, [studentId]);
  return result.rows[0] || null;
};


const resetStudentPassword = async (studentId, newPassword) => {
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  const userQuery = "SELECT user_id FROM students WHERE id = $1";
  const userResult = await pool.query(userQuery, [studentId]);

  if (userResult.rowCount === 0) {
    return null; 
  }

  const userId = userResult.rows[0].user_id;

  const query = `
    UPDATE users
    SET password_hash = $1, is_first_login = TRUE, updated_at = NOW()
    WHERE id = $2 AND role_id = 3
    RETURNING id, first_name, last_name, email;
  `;
  const values = [hashedPassword, userId];
  const result = await pool.query(query, values);

  if (result.rowCount === 0) {
    return null; 
  }

  return result.rows[0];
};

const deleteStudentPermanently = async (studentId) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const studentResult = await client.query(
      "SELECT user_id FROM students WHERE id = $1",
      [studentId]
    );

    if (studentResult.rows.length === 0) {
      throw new Error("Student not found");
    }

    const userId = studentResult.rows[0].user_id;

    await client.query("DELETE FROM students WHERE id = $1", [studentId]);

    await client.query("DELETE FROM users WHERE id = $1", [userId]);

    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error deleting student permanently:", error);
    throw error; 
  } finally {
    client.release();
  }
};

const generateStudentPassword = (lastName, studentNumber) => {
  const lastThreeDigits = studentNumber.slice(-3);
  const specialCharacter = "!";
  return `${lastName}${lastThreeDigits}${specialCharacter}`;
}

const processBatchStudents = async (students, createdBy) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (const student of students) {
      try {
        // Validate student number format
        if (!/^02000[0-9]{6}$/.test(student.studentNumber)) {
          throw new Error('Invalid student number format');
        }

        // Check if student number exists
        if (await checkStudentNumberExists(student.studentNumber)) {
          throw new Error('Student number already exists');
        }

        // Generate email and validate
        const lastSixDigits = student.studentNumber.slice(-6);
        const email = `${student.lastName.toLowerCase()}.${lastSixDigits}@novaliches.sti.edu.ph`;
        
        // Generate password
        const autoGeneratedPassword = generateStudentPassword(student.lastName, student.studentNumber);
        const hashedPassword = await bcrypt.hash(autoGeneratedPassword, 10);

        // If missing courseName but we have courseId, look it up
        let courseName = student.courseName;
        if (!courseName && student.courseId) {
          try {
            const courseResult = await client.query(
              "SELECT course_name FROM courses WHERE id = $1",
              [student.courseId]
            );
            
            if (courseResult.rows.length > 0) {
              courseName = courseResult.rows[0].course_name;
            } else {
              throw new Error(`No course found with ID ${student.courseId}`);
            }
          } catch (error) {
            throw new Error(`Error looking up course ID ${student.courseId}: ${error.message}`);
          }
        }

        // If we still don't have a courseName, it's an error
        if (!courseName) {
          throw new Error('Course name is required for student registration');
        }

        // Make sure the course exists in the database
        try {
          // This query will either find the course or insert it
          await client.query(
            "INSERT INTO courses (course_name) VALUES ($1) ON CONFLICT (course_name) DO NOTHING",
            [courseName]
          );
        } catch (error) {
          console.error(`Error ensuring course exists: ${error.message}`);
          // Continue anyway - maybe the course already exists or will be added differently
        }

        // Register student
        await registerStudent(
          student.firstName,
          student.lastName,
          email,
          email, // username same as email
          hashedPassword,
          student.studentNumber,
          courseName,
          student.yearLevel,
          student.gender,
          createdBy
        );

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          studentNumber: student.studentNumber,
          courseName: student.courseName,
          error: error.message
        });
      }
    }

    await client.query('COMMIT');
    return results;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { checkStudentNumberExists, registerStudent, getStudentByEmail, getAllStudents, getStudentById, updateStudent, softDeleteStudent, restoreStudent, resetStudentPassword, deleteStudentPermanently, unlockStudentAccount, processBatchStudents};
