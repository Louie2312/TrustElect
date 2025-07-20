const { addCandidate, getCandidatesByPartylist, removeCandidate, updateCandidate, getStudentPartylist } = require('../models/partylistCandidateModel');
const { validationResult } = require("express-validator");

exports.uploadCandidateImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: "No image file provided" 
      });
    }

    // The file path will be relative to the public directory
    const filePath = `/uploads/candidates/${req.file.filename}`;

    res.status(200).json({
      success: true,
      message: "Image uploaded successfully",
      filePath
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload image",
      error: error.message
    });
  }
};

exports.addPartylistCandidate = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { partylistId } = req.params;
    const { studentId, firstName, lastName, studentNumber, course, position, isRepresentative, imageUrl } = req.body;

    if (!partylistId) {
      return res.status(400).json({ message: "Partylist ID is required" });
    }

    if (!firstName || !lastName || !studentNumber || !course) {
      return res.status(400).json({ message: "First name, last name, student number and course are required" });
    }

    // If isRepresentative is true, position should be null
    const candidateData = {
      studentId,
      firstName,
      lastName,
      studentNumber,
      course,
      position: isRepresentative ? null : position,
      isRepresentative: Boolean(isRepresentative),
      imageUrl
    };

    const candidate = await addCandidate(partylistId, candidateData);

    res.status(201).json({
      success: true,
      message: "Candidate added successfully",
      candidate
    });
  } catch (error) {
    console.error("Error adding candidate:", error);
    res.status(500).json({
      message: "Failed to add candidate",
      error: error.message
    });
  }
};

exports.getPartylistCandidates = async (req, res) => {
  try {
    const { partylistId } = req.params;

    if (!partylistId) {
      return res.status(400).json({ message: "Partylist ID is required" });
    }

    const candidates = await getCandidatesByPartylist(partylistId);

    // Group candidates by position or representative status
    const positionGroups = {};
    const representatives = [];

    candidates.forEach(candidate => {
      if (candidate.is_representative) {
        representatives.push(candidate);
      } else if (candidate.position) {
        if (!positionGroups[candidate.position]) {
          positionGroups[candidate.position] = [];
        }
        positionGroups[candidate.position].push(candidate);
      }
    });

    res.status(200).json({
      success: true,
      candidates,
      positionGroups,
      representatives
    });
  } catch (error) {
    console.error("Error getting candidates:", error);
    res.status(500).json({
      message: "Failed to get candidates",
      error: error.message
    });
  }
};

exports.removePartylistCandidate = async (req, res) => {
  try {
    const { candidateId } = req.params;

    if (!candidateId) {
      return res.status(400).json({ message: "Candidate ID is required" });
    }

    const candidate = await removeCandidate(candidateId);

    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    res.status(200).json({
      success: true,
      message: "Candidate removed successfully",
      candidate
    });
  } catch (error) {
    console.error("Error removing candidate:", error);
    res.status(500).json({
      message: "Failed to remove candidate",
      error: error.message
    });
  }
};

exports.updatePartylistCandidate = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { position, isRepresentative, imageUrl } = req.body;

    if (!candidateId) {
      return res.status(400).json({ message: "Candidate ID is required" });
    }

    // Build candidate data object with only provided fields
    const candidateData = {};
    
    if (position !== undefined) {
      candidateData.position = position;
    }
    
    if (isRepresentative !== undefined) {
      candidateData.isRepresentative = Boolean(isRepresentative);
    }
    
    if (imageUrl !== undefined) {
      candidateData.imageUrl = imageUrl;
    }

    // If no fields to update, return error
    if (Object.keys(candidateData).length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    const candidate = await updateCandidate(candidateId, candidateData);

    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    res.status(200).json({
      success: true,
      message: "Candidate updated successfully",
      candidate
    });
  } catch (error) {
    console.error("Error updating candidate:", error);
    res.status(500).json({
      message: "Failed to update candidate",
      error: error.message
    });
  }
};

exports.getStudentPartylist = async (req, res) => {
  try {
    const { studentNumber } = req.params;

    if (!studentNumber) {
      return res.status(400).json({ 
        success: false,
        message: "Student number is required" 
      });
    }

    const studentPartylist = await getStudentPartylist(studentNumber);

    if (!studentPartylist) {
      return res.status(200).json({
        success: true,
        message: "Student is not registered to any partylist",
        data: null
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: studentPartylist.partylist_id,
        name: studentPartylist.partylist_name,
        slogan: studentPartylist.slogan,
        advocacy: studentPartylist.advocacy,
        logo_url: studentPartylist.logo_url
      }
    });
  } catch (error) {
    console.error("Error getting student partylist:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get student partylist",
      error: error.message
    });
  }
}; 