const Department = require("../models/departmentModel");
const pool = require("../config/db");

exports.createDepartment = async (req, res) => {
  try {
    const { department_name, department_type, admin_id } = req.body;
    
    console.log("Creating department with data:", { department_name, department_type, admin_id, created_by: req.user?.id });
    
    if (!department_name || !department_type) {
      return res.status(400).json({ 
        success: false,
        message: "Department name and type are required" 
      });
    }
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "User authentication required"
      });
    }

    const department = await Department.create({
      department_name,
      department_type,
      admin_id: admin_id || null,
      created_by: req.user.id
    });

    res.status(201).json({
      success: true,
      message: "Department created successfully",
      department
    });
  } catch (error) {
    console.error("Error creating department:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      constraint: error.constraint,
      detail: error.detail
    });
    
    // Handle specific error for admin already assigned
    if (error.message && error.message.includes("Admin is already assigned")) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    // Handle foreign key constraint errors
    if (error.code === '23503') {
      return res.status(400).json({
        success: false,
        message: "Invalid admin ID or user ID. Please check the selected admin exists."
      });
    }
    
    // Handle unique constraint errors
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: "Department name already exists. Please choose a different name."
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: "Failed to create department",
      error: process.env.NODE_ENV === 'development' ? error.message : "Internal server error"
    });
  }
};

exports.getAllDepartments = async (req, res) => {
  try {
    console.log("Getting all departments");
    const departments = await Department.findAll();
    console.log("Departments found:", departments.length);
    console.log("First department (if any):", departments[0]);
    
    // Add debug information in the response
    res.json({
      count: departments.length,
      departments: departments
    });
  } catch (error) {
    console.error("Error fetching departments:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch departments",
      error: error.message
    });
  }
};

exports.getDepartmentById = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    
    if (!department) {
      return res.status(404).json({ 
        success: false,
        message: "Department not found" 
      });
    }
    
    res.json(department);
  } catch (error) {
    console.error("Error fetching department:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch department" 
    });
  }
};

exports.updateDepartment = async (req, res) => {
  try {
    const { department_name, department_type, admin_id } = req.body;

    // Check if the admin is already assigned to another department
    if (admin_id) {
      const checkQuery = await pool.query(
        "SELECT id, department_name FROM departments WHERE admin_id = $1 AND id != $2 AND is_active = TRUE",
        [admin_id, req.params.id]
      );

      if (checkQuery.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: `This admin is already assigned to the ${checkQuery.rows[0].department_name} department`
        });
      }
    }

    const department = await Department.update(req.params.id, {
      department_name,
      department_type,
      admin_id: admin_id || null
    });

    if (!department) {
      return res.status(404).json({ 
        success: false,
        message: "Department not found" 
      });
    }

    res.json({
      success: true,
      message: "Department updated successfully",
      department
    });
  } catch (error) {
    console.error("Error updating department:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to update department" 
    });
  }
};

exports.deleteDepartment = async (req, res) => {
  try {
    const department = await Department.delete(req.params.id);
    
    if (!department) {
      return res.status(404).json({ 
        success: false,
        message: "Department not found" 
      });
    }
    
    res.json({
      success: true,
      message: "Department deleted successfully",
      department
    });
  } catch (error) {
    console.error("Error deleting department:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to delete department" 
    });
  }
};

exports.restoreDepartment = async (req, res) => {
  try {
    const department = await Department.restore(req.params.id);
    
    if (!department) {
      return res.status(404).json({ 
        success: false,
        message: "Department not found" 
      });
    }
    
    res.json({
      success: true,
      message: "Department restored successfully",
      department
    });
  } catch (error) {
    console.error("Error restoring department:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to restore department" 
    });
  }
};

exports.getArchivedDepartments = async (req, res) => {
  try {
    const departments = await Department.findArchived();
    res.json(departments);
  } catch (error) {
    console.error("Error fetching archived departments:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch archived departments" 
    });
  }
};

exports.getDepartmentNames = async (req, res) => {
  try {
    const departmentNames = await Department.getAllDepartmentNames();
    res.json(departmentNames);
  } catch (error) {
    console.error("Error fetching department names:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch department names" 
    });
  }
};

exports.getAdminsByDepartment = async (req, res) => {
  try {
    const admins = await Department.getAdminsByDepartment(req.params.id);
    res.json(admins);
  } catch (error) {
    console.error("Error fetching admins by department:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch admins by department" 
    });
  }
};