const partylistModel = require('../models/partylistModel');
const { uploadToStorage } = require('../middlewares/partylistUploadMiddleware');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../../uploads/partylists');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const createPartylist = async (req, res) => {
  try {
    console.log('Starting partylist creation...');
    console.log('Request body:', req.body);
    console.log('File data:', req.file);
    
    const { name, slogan, advocacy } = req.body;
    const logoFile = req.file;

    if (!name) {
      console.log('Name validation failed: Name is required');
      return res.status(400).json({
        success: false,
        message: 'Partylist name is required'
      });
    }

    console.log('Creating partylist with data:', {
      name,
      slogan: slogan || '',
      advocacy: advocacy || '',
      logoFile: logoFile ? logoFile.filename : 'none'
    });

    try {

      const partylistData = {
        name,
        slogan: slogan || '',
        advocacy: advocacy || '',
        logo: logoFile 
      };

      console.log('Calling partylistModel.createPartylist with:', {
        name: partylistData.name,
        hasLogo: !!partylistData.logo
      });

      const partylist = await partylistModel.createPartylist(partylistData);
      console.log('Partylist created successfully:', partylist);

      res.status(201).json({
        success: true,
        message: 'Partylist created successfully',
        data: partylist
      });
    } catch (modelError) {
      console.error('Error in partylistModel.createPartylist:', modelError);
      console.error('Error details:', modelError.stack);

      try {
        const pool = require('../config/db');
        const checkTable = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'partylists'
          );
        `);
        console.log('Partylists table exists:', checkTable.rows[0].exists);
        
        if (checkTable.rows[0].exists) {

          const tableInfo = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'partylists'
          `);
          console.log('Partylists table structure:', tableInfo.rows);
        } else {
 
          await pool.query(`
            CREATE TABLE IF NOT EXISTS partylists (
              id SERIAL PRIMARY KEY,
              name VARCHAR(100) NOT NULL,
              slogan TEXT,
              advocacy TEXT,
              logo_url TEXT,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
              is_active BOOLEAN DEFAULT TRUE
            );
          `);
          console.log('Created partylists table');
 
          const result = await pool.query(
            `INSERT INTO partylists (name, slogan, advocacy, logo_url) 
             VALUES ($1, $2, $3, $4) 
             RETURNING *`,
            [
              name,
              slogan || null,
              advocacy || null,
              logoFile ? `/uploads/partylists/${logoFile.filename}` : null
            ]
          );
          
          const partylist = result.rows[0];
          console.log('Direct insert successful:', partylist);
          
          return res.status(201).json({
            success: true,
            message: 'Partylist created successfully using direct insert',
            data: partylist
          });
        }
      } catch (dbError) {
        console.error('Database check/create error:', dbError);
      }
      
      throw modelError; 
    }
  } catch (error) {
    console.error('Error in createPartylist:', error);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Failed to create partylist',
      error: error.message
    });
  }
};

const getAllPartylists = async (req, res) => {
  try {
    const partylists = await partylistModel.getAllPartylists();
    
    res.json({
      success: true,
      data: partylists
    });
  } catch (error) {
    console.error('Error in getAllPartylists:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch partylists',
      error: error.message
    });
  }
};

const getPartylistById = async (req, res) => {
  try {
    const { id } = req.params;
    const partylist = await partylistModel.getPartylistById(id);
    
    if (!partylist) {
      return res.status(404).json({
        success: false,
        message: 'Partylist not found'
      });
    }

    res.json({
      success: true,
      data: partylist
    });
  } catch (error) {
    console.error('Error in getPartylistById:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch partylist',
      error: error.message
    });
  }
};

const updatePartylist = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slogan, advocacy } = req.body;
    const logoFile = req.file;

    const updates = {
      name,
      slogan,
      advocacy,
      logo: logoFile
    };

    const partylist = await partylistModel.updatePartylist(id, updates);

    if (!partylist) {
      return res.status(404).json({
        success: false,
        message: 'Partylist not found'
      });
    }

    res.json({
      success: true,
      message: 'Partylist updated successfully',
      data: partylist
    });
  } catch (error) {
    console.error('Error in updatePartylist:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update partylist',
      error: error.message
    });
  }
};

const archivePartylist = async (req, res) => {
  try {
    const { id } = req.params;
    const partylist = await partylistModel.archivePartylist(id);

    if (!partylist) {
      return res.status(404).json({
        success: false,
        message: 'Partylist not found'
      });
    }

    res.json({
      success: true,
      message: 'Partylist archived successfully'
    });
  } catch (error) {
    console.error('Error in archivePartylist:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to archive partylist',
      error: error.message
    });
  }
};

const restorePartylist = async (req, res) => {
  try {
    const { id } = req.params;
    const partylist = await partylistModel.restorePartylist(id);

    if (!partylist) {
      return res.status(404).json({
        success: false,
        message: 'Archived partylist not found'
      });
    }

    res.json({
      success: true,
      message: 'Partylist restored successfully'
    });
  } catch (error) {
    console.error('Error in restorePartylist:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restore partylist',
      error: error.message
    });
  }
};

const getArchivedPartylists = async (req, res) => {
  try {
    const partylists = await partylistModel.getArchivedPartylists();
    
    res.json({
      success: true,
      data: partylists
    });
  } catch (error) {
    console.error('Error in getArchivedPartylists:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch archived partylists',
      error: error.message
    });
  }
};

const permanentDeletePartylist = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await partylistModel.permanentDeletePartylist(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Partylist not found'
      });
    }

    res.json({
      success: true,
      message: 'Partylist permanently deleted'
    });
  } catch (error) {
    console.error('Error in permanentDeletePartylist:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to permanently delete partylist',
      error: error.message
    });
  }
};

// Rename existing deletePartylist to be clear it's archiving
const deletePartylist = archivePartylist;

const addPartylistCandidate = async (req, res) => {
  try {
    const { partylistId } = req.params;
    const { studentId, position } = req.body;

    if (!studentId || !position) {
      return res.status(400).json({
        success: false,
        message: 'Student ID and position are required'
      });
    }

    const candidate = await partylistModel.addPartylistCandidate(
      partylistId,
      studentId,
      position
    );

    res.status(201).json({
      success: true,
      message: 'Candidate added successfully',
      data: candidate
    });
  } catch (error) {
    console.error('Error in addPartylistCandidate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add candidate',
      error: error.message
    });
  }
};

const removePartylistCandidate = async (req, res) => {
  try {
    const { partylistId, studentId } = req.params;
    const candidate = await partylistModel.removePartylistCandidate(
      partylistId,
      studentId
    );

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found in partylist'
      });
    }

    res.json({
      success: true,
      message: 'Candidate removed successfully'
    });
  } catch (error) {
    console.error('Error in removePartylistCandidate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove candidate',
      error: error.message
    });
  }
};

module.exports = {
  createPartylist,
  getAllPartylists,
  getPartylistById,
  updatePartylist,
  deletePartylist,
  archivePartylist,
  restorePartylist,
  getArchivedPartylists,
  permanentDeletePartylist,
  addPartylistCandidate,
  removePartylistCandidate
}; 