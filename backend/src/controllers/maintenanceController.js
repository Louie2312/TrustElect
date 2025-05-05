const {
  getPrograms, createProgram, updateProgram, deleteProgram,
  getElectionTypes, createElectionType, updateElectionType, deleteElectionType,
  getYearLevels, createYearLevel, updateYearLevel, deleteYearLevel,
  getGenders, createGender, updateGender, deleteGender,
  getSemesters, createSemester, updateSemester, deleteSemester,
  getPrecincts, createPrecinct, updatePrecinct, deletePrecinct,
  getPartylists, createPartylist, updatePartylist, deletePartylist,
  getCurrentSemester, setCurrentSemester
} = require("../models/maintenanceModel");

const handleResponse = (res, promise) => {
  promise
    .then(data => res.status(200).json({ success: true, data }))
    .catch(error => {
      console.error(error);
      res.status(400).json({ 
        success: false, 
        message: error.message || "Operation failed" 
      });
    });
};

exports.getPrograms = (req, res) => handleResponse(res, getPrograms());
exports.createProgram = (req, res) => handleResponse(res, createProgram(req.body.name));
exports.updateProgram = (req, res) => handleResponse(res, updateProgram(req.params.id, req.body.name));
exports.deleteProgram = (req, res) => handleResponse(res, deleteProgram(req.params.id));


exports.getElectionTypes = (req, res) => handleResponse(res, getElectionTypes());
exports.createElectionType = (req, res) => handleResponse(res, createElectionType(req.body.name));
exports.updateElectionType = (req, res) => handleResponse(res, updateElectionType(req.params.id, req.body.name));
exports.deleteElectionType = (req, res) => handleResponse(res, deleteElectionType(req.params.id));


exports.getYearLevels = (req, res) => handleResponse(res, getYearLevels());
exports.createYearLevel = (req, res) => handleResponse(res, createYearLevel(req.body.name));
exports.updateYearLevel = (req, res) => handleResponse(res, updateYearLevel(req.params.id, req.body.name));
exports.deleteYearLevel = (req, res) => handleResponse(res, deleteYearLevel(req.params.id));


exports.getGenders = (req, res) => handleResponse(res, getGenders());
exports.createGender = (req, res) => handleResponse(res, createGender(req.body.name));
exports.updateGender = (req, res) => handleResponse(res, updateGender(req.params.id, req.body.name));
exports.deleteGender = (req, res) => handleResponse(res, deleteGender(req.params.id));


exports.getSemesters = (req, res) => handleResponse(res, getSemesters());
exports.createSemester = (req, res) => handleResponse(res, createSemester(req.body.name));
exports.updateSemester = (req, res) => handleResponse(res, updateSemester(req.params.id, req.body.name));
exports.deleteSemester = (req, res) => handleResponse(res, deleteSemester(req.params.id));

exports.getPrecincts = (req, res) => handleResponse(res, getPrecincts());
exports.createPrecinct = (req, res) => handleResponse(res, createPrecinct(req.body.name));
exports.updatePrecinct = (req, res) => handleResponse(res, updatePrecinct(req.params.id, req.body.name));
exports.deletePrecinct = (req, res) => handleResponse(res, deletePrecinct(req.params.id));

// Add partylist handlers
exports.getPartylists = (req, res) => handleResponse(res, getPartylists());
exports.createPartylist = (req, res) => handleResponse(res, createPartylist(req.body.name));
exports.updatePartylist = (req, res) => handleResponse(res, updatePartylist(req.params.id, req.body.name));
exports.deletePartylist = (req, res) => handleResponse(res, deletePartylist(req.params.id));

// Get current semester
exports.getCurrentSemester = (req, res) => {
  getCurrentSemester()
    .then(data => {
      if (!data) {
        // Return success but with null data for frontend to handle
        return res.status(200).json({ success: true, data: null });
      }
      res.status(200).json({ success: true, data });
    })
    .catch(error => {
      console.error('Error getting current semester:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch current semester' 
      });
    });
};

// Set current semester
exports.setCurrentSemester = (req, res) => {
  const { semesterId } = req.body;
  
  if (!semesterId) {
    return res.status(400).json({ 
      success: false, 
      message: 'Semester ID is required' 
    });
  }
  
  setCurrentSemester(semesterId)
    .then(data => {
      res.status(200).json({ 
        success: true, 
        data,
        message: 'Current semester updated successfully' 
      });
    })
    .catch(error => {
      console.error('Error setting current semester:', error);
      res.status(400).json({ 
        success: false, 
        message: error.message || 'Failed to set current semester' 
      });
    });
};