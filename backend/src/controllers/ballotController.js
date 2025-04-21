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

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads/candidates');
if (!fs.existsSync(uploadDir)) {
fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for image upload
const storage = multer.diskStorage({
destination: (req, file, cb) => {
  cb(null, uploadDir);
},
filename: (req, file, cb) => {
  // Generate unique filename while preserving extension
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  const ext = path.extname(file.originalname);
  cb(null, 'candidate-' + uniqueSuffix + ext);
}
});


// File filter function
const fileFilter = (req, file, cb) => {
// Accept only image files
if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
  return cb(new Error('Only image files are allowed!'), false);
}
cb(null, true);
};

// Configure multer upload
const upload = multer({
storage: storage,
fileFilter: fileFilter,
limits: {
  fileSize: 5 * 1024 * 1024 // 5MB limit
}
});

exports.uploadMiddleware = upload.single('image');

// Helper function to delete image file
const deleteImageFile = async (imagePath) => {
if (!imagePath) return;

try {
  // Handle both relative paths and full paths
  let fullPath;
  if (imagePath.startsWith('/uploads/')) {
    // If it's a URL path, convert to filesystem path
    fullPath = path.join(__dirname, '../..', imagePath);
  } else {
    // If it's already a filesystem path
    fullPath = imagePath;
  }
  
  console.log('Attempting to delete image file:', fullPath);
  
  // Check if file exists before trying to delete
  if (fs.existsSync(fullPath)) {
    await fs.promises.unlink(fullPath);
    console.log('Image file deleted successfully');
  } else {
    console.warn('Image file not found:', fullPath);
  }
} catch (error) {
  console.error('Error deleting image file:', error);
}
};

// Upload candidate image
exports.uploadCandidateImage = async (req, res) => {
try {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  console.log("Candidate image uploaded:", req.file.filename);

  // Return full filePath in response
  const filePath = `/uploads/candidates/${req.file.filename}`;

  return res.json({ success: true, filePath });
} catch (error) {
  console.error("Error uploading candidate image:", error);
  return res.status(500).json({ message: "Server error", error: error.message });
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

    // Start a transaction to ensure both the ballot is created and election is updated
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Create the ballot with positions
      const ballot = await createBallotWithPositions({
        election_id,
        description,
        positions
      }, client);

      // Mark the election as needing approval
      await client.query(
        'UPDATE elections SET needs_approval = TRUE WHERE id = $1',
        [election_id]
      );
      
      await client.query('COMMIT');
      
      // Get election details for notification
      const election = await getElectionById(election_id);
      
      // Send notification to admin about successful ballot creation
      if (election && req.user && req.user.id) {
        try {
          console.log(`Sending ballot creation notifications for election ${election_id}`);
          await notificationService.notifyBallotCreated(req.user.id, election);
          
          // Also notify superadmins that a ballot was created and needs approval
          console.log(`Notifying superadmins about ballot creation for election ${election_id}`);
          const notificationResult = await notificationService.notifyElectionNeedsApproval(election);
          console.log(`Sent ${notificationResult.length} notifications to superadmins`);
        } catch (notifError) {
          console.error('Failed to send ballot creation notifications:', notifError);
          console.error(notifError.stack);
          // Continue without failing the request
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

// Now only updates description
exports.updateBallotdescription = async (req, res) => {
  const { ballotId } = req.params;
  const { description } = req.body;

  try {
    // Start a transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get the election_id from the ballot
      const { rows: [ballotData] } = await client.query(
        'SELECT election_id FROM ballots WHERE id = $1',
        [ballotId]
      );
      
      if (!ballotData) {
        throw new Error('Ballot not found');
      }
      
      // Update the ballot description
      const ballot = await updateBallotDescription(ballotId, description);
      
      // Mark the election as needing approval
      await client.query(
        'UPDATE elections SET needs_approval = TRUE WHERE id = $1',
        [ballotData.election_id]
      );
      
      await client.query('COMMIT');
      
      // Get election details for notification
      const election = await getElectionById(ballotData.election_id);
      
      // Send notification to superadmins about ballot update that needs approval
      if (election) {
        try {
          // Notify superadmins that a ballot was updated and needs approval
          await notificationService.notifyElectionNeedsApproval(election);
          
          // Also notify the admin who made the update
          if (req.user && req.user.id) {
            await notificationService.notifyBallotCreated(req.user.id, election);
          }
        } catch (notifError) {
          console.error('Failed to send ballot update notifications:', notifError);
          // Continue without failing the request
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


// Delete ballot (unchanged)
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
    // Fix the missing comma in the SQL query parameters
    const ballotExists = await pool.query(
      'SELECT id FROM ballots WHERE id = $1', // Added comma here
      [ballotId]
    );

    if(!ballotExists.rows.length){
      return res.status(404).json({ message: "Ballot not found" });
    }

    // Validate input
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

    // Create position using the model function
    const position = await createPosition(ballotId, name, max_choices);
    
    return res.status(201).json({
      message: "Position added successfully",
      position
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Update position
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

    // Validate required fields
    if (!first_name || !last_name) {
      if (imageFile) {
        await deleteImageFile(imageFile.path);
      }
      return res.status(400).json({ message: "First name and last name are required" });
    }

    // Check if position exists
    const position = await getPositionById(positionId);
    if (!position) {
      if (imageFile) {
        await deleteImageFile(imageFile.path);
      }
      return res.status(404).json({ message: "Position not found" });
    }

    // Construct image URL if file was uploaded
    let imageUrl = null;
    if (imageFile) {
      imageUrl = `/uploads/candidates/${imageFile.filename}`;
    }

    // Create candidate
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
  
  // Get existing candidate
  const existingCandidate = await getCandidateById(candidateId);
  if (!existingCandidate) {
    return res.status(404).json({ 
      success: false,
      message: 'Candidate not found' 
    });
  }

  let finalImageUrl = existingCandidate.image_url;
  
  // If a new image file was uploaded, use it
  if (req.file) {
    // Delete old image if exists
    if (existingCandidate.image_url) {
      await deleteImageFile(existingCandidate.image_url);
    }
    finalImageUrl = `/uploads/candidates/${req.file.filename}`;
  } 
  // If an image URL was provided in the request body, use it
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

  // Delete image file if exists
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

    // Create candidate
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