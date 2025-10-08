const { getStudentLaboratoryAssignment, validateStudentVotingIP } = require('../models/laboratoryPrecinctModel');

const validateVotingIP = async (req, res, next) => {
  // TEMPORARY: Allow all voting for now
  return next();
};

module.exports = { validateVotingIP };