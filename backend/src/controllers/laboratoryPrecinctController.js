const {
  getAllLaboratoryPrecincts,
  getLaboratoryPrecinctById,
  addIPAddress,
  updateIPAddress,
  deleteIPAddress,
  validateStudentVotingIP,
  getStudentLaboratoryAssignment
} = require("../models/laboratoryPrecinctModel");

const handleResponse = (res, promise) => {
  promise
    .then(data => {
      res.status(200).json({ success: true, data });
    })
    .catch(error => {
      console.error("Laboratory precinct error:", error);
      res.status(500).json({ 
        success: false, 
        message: error.message || "Operation failed" 
      });
    });
};

exports.getLaboratoryPrecincts = (req, res) => 
  handleResponse(res, getAllLaboratoryPrecincts());

exports.getLaboratoryPrecinctById = (req, res) => 
  handleResponse(res, getLaboratoryPrecinctById(req.params.id));

exports.addIPAddress = (req, res) => {
  const { id: laboratoryPrecinctId } = req.params;
  const ipData = req.body;
  
  // Validate IP data
  if (!ipData.ip_type) {
    return res.status(400).json({
      success: false,
      message: "IP type is required"
    });
  }
  
  if (ipData.ip_type === 'single' && !ipData.ip_address) {
    return res.status(400).json({
      success: false,
      message: "IP address is required for single IP type"
    });
  }
  
  if (ipData.ip_type === 'range' && (!ipData.ip_range_start || !ipData.ip_range_end)) {
    return res.status(400).json({
      success: false,
      message: "IP range start and end are required for range type"
    });
  }
  
  if (ipData.ip_type === 'subnet' && !ipData.subnet_mask) {
    return res.status(400).json({
      success: false,
      message: "Subnet mask is required for subnet type"
    });
  }
  
  handleResponse(res, addIPAddress(laboratoryPrecinctId, ipData));
};

exports.updateIPAddress = (req, res) => {
  const { ipId } = req.params;
  const ipData = req.body;
  
  handleResponse(res, updateIPAddress(ipId, ipData));
};

exports.deleteIPAddress = (req, res) => {
  const { ipId } = req.params;
  
  handleResponse(res, deleteIPAddress(ipId));
};

exports.validateStudentVotingIP = (req, res) => {
  const { studentId, electionId, clientIP } = req.body;
  
  if (!studentId || !electionId || !clientIP) {
    return res.status(400).json({
      success: false,
      message: "Student ID, Election ID, and Client IP are required"
    });
  }
  
  validateStudentVotingIP(studentId, electionId, clientIP)
    .then(isValid => {
      res.status(200).json({ 
        success: true, 
        data: { isValid },
        message: isValid ? "IP validation successful" : "IP validation failed"
      });
    })
    .catch(error => {
      console.error("IP validation error:", error);
      res.status(500).json({ 
        success: false, 
        message: error.message || "IP validation failed" 
      });
    });
};

exports.getStudentLaboratoryAssignment = (req, res) => {
  const { studentId, electionId } = req.params;
  
  getStudentLaboratoryAssignment(studentId, electionId)
    .then(assignment => {
      res.status(200).json({
        success: true,
        data: assignment,
        message: assignment ? "Laboratory assignment found" : "No laboratory assignment found"
      });
    })
    .catch(error => {
      console.error("Get laboratory assignment error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to get laboratory assignment"
      });
    });
};
