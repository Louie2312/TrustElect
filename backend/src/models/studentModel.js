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


const registerStudent = async (firstName, middleName, lastName, email, username, hashedPassword, studentNumber, courseName, yearLevel, gender, birthdate, createdBy, courseId) => {
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

    if (!courseName) {
      throw new Error('Course name is required for student registration');
    }

    try {
      await client.query(
        "INSERT INTO courses (course_name) VALUES ($1) ON CONFLICT (course_name) DO NOTHING",
        [courseName]
      );
    } catch (error) {
      console.error(`Failed to ensure course exists: ${error.message}`);
    }

    const studentQuery = `
      INSERT INTO students (user_id, first_name, middle_name, last_name, email, username, student_number, course_name, year_level, gender, birthdate, registered_by, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, TRUE);
    `;
    const studentValues = [userId, firstName, middleName, lastName, email, username, studentNumber, courseName, yearLevel, gender, birthdate, createdBy];
    await client.query(studentQuery, studentValues);

    
    await client.query("COMMIT");
    return { id: userId, firstName, middleName, lastName, email, username, role: "Student", courseName, yearLevel, studentNumber, gender, birthdate };
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
      s.middle_name,
      s.last_name, 
      s.email, 
      s.student_number, 
      s.course_name, 
      s.year_level, 
      s.gender,
      s.birthdate, 
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
      s.middle_name,
      s.last_name, 
      s.email, 
      s.student_number, 
      s.course_name, 
      s.year_level, 
      s.gender,
      s.birthdate, 
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

const updateStudent = async (studentId, firstName, middleName, lastName, courseName, yearLevel, gender, birthdate) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    if (courseName) {
      try {
        await client.query(
          "INSERT INTO courses (course_name) VALUES ($1) ON CONFLICT (course_name) DO NOTHING",
          [courseName]
        );
      } catch (error) {
        console.error(`Failed to ensure course exists during update: ${error.message}`);

      }
    }
    
    const query = `
      UPDATE students
      SET first_name = $1, middle_name = $2, last_name = $3, course_name = $4, year_level = $5, gender = $6, birthdate = $7, updated_at = NOW()
      WHERE id = $8
      RETURNING *;
    `;
    const values = [firstName, middleName, lastName, courseName, yearLevel, gender, birthdate, studentId];
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
        if (!/^02000[0-9]{6}$/.test(student.studentNumber)) {
          throw new Error('Invalid student number format');
        }

        if (await checkStudentNumberExists(student.studentNumber)) {
          throw new Error('Student number already exists');
        }

        let email = student.email;
        if (!email) {
          // Use the normalized last name (remove spaces, special characters)
          const lastSixDigits = student.studentNumber.slice(-6);
          
          let normalizedLastName = student.lastName.toLowerCase().replace(/\s+/g, '');
          
          const charMap = {
            'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
            'ü': 'u', 'ñ': 'n', 'ç': 'c', 'à': 'a', 'è': 'e',
            'ì': 'i', 'ò': 'o', 'ù': 'u'
          };
          
          normalizedLastName = normalizedLastName.replace(/[áéíóúüñçàèìòù]/g, match => charMap[match] || match);
          
          email = `${normalizedLastName}.${lastSixDigits}@novaliches.sti.edu.ph`;
          console.log(`Generated email for ${student.firstName} ${student.lastName}: ${email}`);
        }
        
        // Generate password
        const autoGeneratedPassword = generateStudentPassword(student.lastName, student.studentNumber);
        const hashedPassword = await bcrypt.hash(autoGeneratedPassword, 10);

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

        if (!courseName) {
          throw new Error('Course name is required for student registration');
        }

        try {
     
          await client.query(
            "INSERT INTO courses (course_name) VALUES ($1) ON CONFLICT (course_name) DO NOTHING",
            [courseName]
          );
        } catch (error) {
          console.error(`Error ensuring course exists: ${error.message}`);
          
        }

      
        let middleName = null;
        if (student.middleName !== undefined && student.middleName !== null) {
       
          const middleNameStr = String(student.middleName).trim();
          
          if (middleNameStr.length > 0) {
            middleName = middleNameStr;
          }
        }

        let parsedBirthdate = null;
        if (student.birthdate) {
          try {
           
            if (typeof student.birthdate === 'string') {
        
              parsedBirthdate = new Date(student.birthdate);
            } else if (student.birthdate instanceof Date) {
            
              parsedBirthdate = student.birthdate;
            } else if (typeof student.birthdate === 'number') {
           
              const excelEpoch = new Date(1900, 0, 1);
              parsedBirthdate = new Date(excelEpoch.getTime() + (student.birthdate - 1) * 24 * 60 * 60 * 1000);
            }
            
            if (isNaN(parsedBirthdate.getTime())) {
              throw new Error("Invalid date format");
            }
          } catch (error) {
            console.error(`Error parsing birthdate for student ${student.studentNumber}:`, error);
            throw new Error(`Invalid birthdate format: ${student.birthdate}`);
          }
        }

        // Register student
        await registerStudent(
          student.firstName,
          middleName,
          student.lastName,
          email,
          email, // username same as email
          hashedPassword,
          student.studentNumber,
          courseName,
          student.yearLevel,
          student.gender,
          parsedBirthdate,
          createdBy
        );

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          studentNumber: student.studentNumber || "Unknown",
          firstName: student.firstName || "Unknown",
          middleName: student.middleName || "",
          lastName: student.lastName || "Unknown",
          courseName: student.courseName || "Unknown",
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