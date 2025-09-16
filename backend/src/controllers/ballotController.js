const {
  createBallotWithPositions,
  getFullBallot,
  updateBallotDescription,
  deleteBallot,
  createPosition,
  updatePositionById,
  deletePositionById,
  getPositionById,
  getCandidatesByPosition,
  createCandidate, 
  updateCandidateById,  
  deleteCandidateById, 
  getCandidateById,
  addCandidate
} = require("../models/ballotModel");
const crypto = require('crypto');
const pool = require("../config/db");
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const notificationService = require('../services/notificationService');
const { getElectionById } = require('../models/electionModel');

const uploadDir = path.join(__dirname, '../../uploads/candidates');
if (!fs.existsSync(uploadDir)) {
fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
destination: (req, file, cb) => {
  cb(null, uploadDir);
},
filename: (req, file, cb) => {
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  const ext = path.extname(file.originalname);
  cb(null, 'candidate-' + uniqueSuffix + ext);
}
});

const fileFilter = (req, file, cb) => {
console.log('File filter check:', {
  originalname: file.originalname,
  mimetype: file.mimetype,
  fieldname: file.fieldname
});

// Check both file extension and MIME type
const allowedExtensions = /\.(jpg|jpeg|png|gif|webp)$/i;
const allowedMimeTypes = /^image\/(jpeg|jpg|png|gif|webp)$/i;

if (!allowedExtensions.test(file.originalname) && !allowedMimeTypes.test(file.mimetype)) {
  console.log('File rejected:', file.originalname, file.mimetype);
  return cb(new Error('Only image files are allowed!'), false);
}

console.log('File accepted:', file.originalname);
cb(null, true);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Only allow 1 file at a time
  }
});

exports.uploadMiddleware = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          success: false,
          message: "File too large. Maximum size is 10MB."
        });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          success: false,
          message: "Unexpected file field. Please use 'image' field."
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message || "File upload error"
      });
    }
    next();
  });
};

const deleteImageFile = async (imagePath) => {
  if (!imagePath) return;

  try {
    let fullPath;
    if (imagePath.startsWith('/uploads/')) {
      fullPath = path.join(__dirname, '../..', imagePath);
    } else {
      fullPath = imagePath;
    }

    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
    } else {
      console.warn('Image file not found:', fullPath);
    }
  } catch (error) {
    console.error('Error deleting image file:', error);
  }
};

exports.uploadCandidateImage = async (req, res) => {
try {
  console.log('Upload request received:', {
    hasFile: !!req.file,
    fileSize: req.file?.size,
    fileName: req.file?.originalname,
    fileType: req.file?.mimetype,
    body: req.body
  });

  if (!req.file) {
    console.log('No file in request');
    return res.status(400).json({ 
      success: false,
      message: "No file uploaded" 
    });
  }

  // Validate file size (additional check)
  if (req.file.size > 10 * 1024 * 1024) {
    // Delete the uploaded file if it's too large
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '../../uploads/candidates', req.file.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return res.status(413).json({ 
      success: false,
      message: "File too large. Maximum size is 10MB." 
    });
  }

  const filePath = `/uploads/candidates/${req.file.filename}`;

  return res.json({ 
    success: true, 
    filePath,
    fileSize: req.file.size,
    originalName: req.file.originalname
  });
} catch (error) {
  console.error("Error uploading candidate image:", error);
  
  // Handle multer errors specifically
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ 
      success: false,
      message: "File too large. Maximum size is 10MB." 
    });
  }
  
  return res.status(500).json({ 
    success: false,
    message: "Server error", 
    error: error.message 
  });
}
};

exports.createBallot = async (req, res) => {
  const { election_id, description, positions } = req.body;

  try {
    if (!election_id || !positions?.length) {
      return res.status(400).json({ 
        message: "Election ID and at least one position are required" 
      });
    }
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
    
      const ballot = await createBallotWithPositions({
        election_id,
        description,
        positions
      }, client);

      // Only set needs_approval = TRUE if the election was created by an admin (not superadmin)
      await client.query(
        `UPDATE elections 
         SET needs_approval = TRUE 
         WHERE id = $1 
         AND created_by IN (
           SELECT id FROM users WHERE role_id = 2
         )`,
        [election_id]
      );
      
      await client.query('COMMIT');

      const election = await getElectionById(election_id);

      if (election && req.user && req.user.id) {
        try {
          await notificationService.notifyBallotCreated(req.user.id, election);
          
          // Only send approval notifications if the election needs approval
          if (election.needs_approval) {
            const notificationResult = await notificationService.notifyElectionNeedsApproval(election);
          } else {
            // For superadmin-created elections, notify students that ballot is ready
            await notificationService.notifyStudentsAboutElection(election);
          }
        } catch (notifError) {
          console.error('Failed to send ballot creation notifications:', notifError);
          console.error(notifError.stack);

        }
      }
      
      return res.status(201).json({
        message: "Ballot created successfully",
        ballot
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    return res.status(500).json({ 
      message: error.message.includes("unique constraint") 
        ? "A ballot already exists for this election" 
        : error.message 
    });
  }
};

exports.getBallotByElection = async (req, res) => {
  const { electionId } = req.params;
  try {
    const { rows: [ballot] } = await pool.query(
      'SELECT * FROM ballots WHERE election_id = $1', 
      [electionId]
    );
    
    if (!ballot) {
      return res.status(404).json({ message: "No ballot found for this election" });
    }
    
    const fullBallot = await getFullBallot(ballot.id);
    return res.status(200).json(fullBallot);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


exports.getBallot = async (req, res) => {
  try {
    const { ballotId } = req.params;
    const ballot = await getFullBallot(ballotId);
    
    if (!ballot) {
      return res.status(404).json({ 
        message: "Ballot not found",
        positions: [] 
      });
    }

    res.status(200).json({
      ...ballot,
      positions: ballot.positions || [] 
    });
  } catch (error) {
    res.status(500).json({ 
      message: error.message,
      positions: [] 
    });
  }
};

exports.updateBallotdescription = async (req, res) => {
  const { ballotId } = req.params;
  const { description } = req.body;

  try {

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
  
      const { rows: [ballotData] } = await client.query(
        'SELECT election_id FROM ballots WHERE id = $1',
        [ballotId]
      );
      
      if (!ballotData) {
        throw new Error('Ballot not found');
      }

      const ballot = await updateBallotDescription(ballotId, description);

      await client.query(
        'UPDATE elections SET needs_approval = TRUE WHERE id = $1',
        [ballotData.election_id]
      );
      
      await client.query('COMMIT');

      const election = await getElectionById(ballotData.election_id);
      
    
      if (election) {
        try {

          await notificationService.notifyElectionNeedsApproval(election);

          if (req.user && req.user.id) {
            await notificationService.notifyBallotCreated(req.user.id, election);
          }
        } catch (notifError) {
          console.error('Failed to send ballot update notifications:', notifError);

        }
      }
      
      return res.status(200).json({
        message: "Ballot updated successfully",
        ballot
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.getBallotById = async (req, res) => {
  const { ballotId } = req.params;
  
  try {
    const ballot = await getFullBallot(ballotId);
    if (!ballot) {
      return res.status(404).json({ message: "Ballot not found" });
    }
    return res.status(200).json(ballot);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.deleteBallot = async (req, res) => {
  const { ballotId } = req.params;

  try {
    await deleteBallot(ballotId);
    return res.status(200).json({ 
      message: "Ballot and all associated data deleted successfully" 
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.addPosition = async (req, res) => {
  const { ballotId } = req.params;
  const { name, max_choices } = req.body;

  try {

    const ballotExists = await pool.query(
      'SELECT id FROM ballots WHERE id = $1', 
      [ballotId]
    );

    if(!ballotExists.rows.length){
      return res.status(404).json({ message: "Ballot not found" });
    }

    if (!name || !max_choices) {
      return res.status(400).json({ 
        message: "Position name and max choices are required" 
      });
    }

    if (max_choices < 1) {
      return res.status(400).json({ 
        message: "Max choices must be at least 1" 
      });
    }

    const position = await createPosition(ballotId, name, max_choices);
    
    return res.status(201).json({
      message: "Position added successfully",
      position
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.updatePosition = async (req, res) => {
  const { positionId } = req.params;
  const { name, max_choices } = req.body;

  try {
   
    if (!name || !max_choices) {
      return res.status(400).json({ 
        message: "Position name and max choices are required" 
      });
    }

    if (max_choices < 1) {
      return res.status(400).json({ 
        message: "Max choices must be at least 1" 
      });
    }


    const position = await updatePositionById(positionId, name, max_choices);
    
    if (!position) {
      return res.status(404).json({ message: "Position not found" });
    }

    return res.status(200).json({
      message: "Position updated successfully",
      position
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.deletePosition = async (req, res) => {
  const { positionId } = req.params;

  try {
   
    const position = await getPositionById(positionId);
    if (!position) {
      return res.status(404).json({ message: "Position not found" });
    }

    const candidates = await getCandidatesByPosition(positionId);
    if (candidates.length > 0) {
      return res.status(400).json({ 
        message: "Cannot delete position with candidates. Delete candidates first." 
      });
    }

    await deletePositionById(positionId);
    
    return res.status(200).json({
      message: "Position deleted successfully"
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.addCandidate = async (req, res) => {
  try {
    const positionId = parseInt(req.params.positionId, 10);
    if (isNaN(positionId)) {
      return res.status(400).json({ message: "Invalid position ID" });
    }

    const { first_name, last_name, party, slogan, platform } = req.body;
    const imageFile = req.file;

    if (!first_name || !last_name) {
      if (imageFile) {
        await deleteImageFile(imageFile.path);
      }
      return res.status(400).json({ message: "First name and last name are required" });
    }

    const position = await getPositionById(positionId);
    if (!position) {
      if (imageFile) {
        await deleteImageFile(imageFile.path);
      }
      return res.status(404).json({ message: "Position not found" });
    }

    let imageUrl = null;
    if (imageFile) {
      imageUrl = `/uploads/candidates/${imageFile.filename}`;
    }

    const candidate = await addCandidate({
      position_id: positionId,
      first_name,
      last_name,
      party,
      slogan,
      platform,
      image_url: imageUrl
    });

    res.status(201).json({
      success: true,
      message: "Candidate added successfully",
      candidate
    });
  } catch (error) {
    console.error("Error adding candidate:", error);
    if (req.file) {
      await deleteImageFile(req.file.path);
    }
    res.status(500).json({ message: "Error adding candidate", error: error.message });
  }
};

exports.updateCandidate = async (req, res) => {
try {
  const { candidateId } = req.params;
  const { first_name, last_name, party, slogan, platform, image_url } = req.body;

  const existingCandidate = await getCandidateById(candidateId);
  if (!existingCandidate) {
    return res.status(404).json({ 
      success: false,
      message: 'Candidate not found' 
    });
  }

  let finalImageUrl = existingCandidate.image_url;

  if (req.file) {

    if (existingCandidate.image_url) {
      await deleteImageFile(existingCandidate.image_url);
    }
    finalImageUrl = `/uploads/candidates/${req.file.filename}`;
  } 

  else if (image_url) {
    finalImageUrl = image_url;
  }

  const updatedCandidate = await updateCandidateById(
    candidateId,
    first_name,
    last_name,
    party || null,
    slogan || null,
    platform || null,
    finalImageUrl
  );

  res.json({
    success: true,
    message: 'Candidate updated successfully',
    candidate: updatedCandidate
  });
} catch (error) {
  console.error('Error updating candidate:', error);
  if (req.file) {
    await deleteImageFile(req.file.path);
  }
  res.status(500).json({ 
    success: false,
    message: 'Failed to update candidate',
    error: error.message 
  });
}
};

exports.deleteCandidate = async (req, res) => {
const { candidateId } = req.params;

try {
  const candidate = await getCandidateById(candidateId);
  if (!candidate) {
    return res.status(404).json({ 
      success: false,
      message: 'Candidate not found' 
    });
  }

  if (candidate.image_url) {
    await deleteImageFile(candidate.image_url);
  }

  await deleteCandidateById(candidateId);
  
  return res.status(200).json({
    success: true,
    message: 'Candidate deleted successfully'
  });
} catch (error) {
  return res.status(500).json({ 
    success: false,
    message: 'Failed to delete candidate',
    error: error.message 
  });
}
};

exports.createCandidateWithImage = async (req, res) => {
uploadMiddleware(req, res, async (err) => {
  if (err) {
    return res.status(400).json({ 
      success: false,
      message: err instanceof multer.MulterError ? 
        err.message : 'File upload failed' 
    });
  }

  const { positionId } = req.params;
  const { first_name, last_name, party, slogan, platform } = req.body;

  try {
    if (!first_name || !last_name) {
     
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ 
        message: "First name and last name are required" 
      });
    }

    const position = await getPositionById(positionId);
    if (!position) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: "Position not found" });
    }

   
    const imageUrl = req.file ? `/uploads/candidates/${req.file.filename}` : null;

    const candidate = await createCandidate(
      positionId, 
      first_name, 
      last_name, 
      party, 
      slogan, 
      platform,
      imageUrl
    );
    
    return res.status(201).json({
      message: "Candidate added successfully",
      candidate
    });
  } catch (error) {
  
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(500).json({ message: error.message });
  }
});
};