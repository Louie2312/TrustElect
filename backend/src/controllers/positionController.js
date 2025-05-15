const {
  getPositionsForElectionType,
  getAllPositions,
  getPositionById,
  createPosition,
  updatePosition,
  deletePosition
} = require("../models/positionModel");

exports.getPositions = async (req, res) => {
  try {
    const { electionTypeId } = req.query;
    
    let positions;
    if (electionTypeId) {
      positions = await getPositionsForElectionType(electionTypeId);
    } else {
      positions = await getAllPositions();
    }
    
    res.status(200).json({
      success: true,
      data: positions
    });
  } catch (error) {
    console.error("Error getting positions:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get positions"
    });
  }
};

exports.getPositionById = async (req, res) => {
  try {
    const { id } = req.params;
    const position = await getPositionById(id);
    
    if (!position) {
      return res.status(404).json({
        success: false,
        message: "Position not found"
      });
    }
    
    res.status(200).json({
      success: true,
      data: position
    });
  } catch (error) {
    console.error("Error getting position:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get position"
    });
  }
};

exports.createPosition = async (req, res) => {
  try {
    const { name, electionTypeId } = req.body;
    
    if (!name || !electionTypeId) {
      return res.status(400).json({
        success: false,
        message: "Position name and election type ID are required"
      });
    }
    
    const newPosition = await createPosition(name, electionTypeId);
    
    res.status(201).json({
      success: true,
      data: newPosition,
      message: "Position created successfully"
    });
  } catch (error) {
    console.error("Error creating position:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to create position"
    });
  }
};

exports.updatePosition = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Position name is required"
      });
    }
    
    const updatedPosition = await updatePosition(id, name);
    
    res.status(200).json({
      success: true,
      data: updatedPosition,
      message: "Position updated successfully"
    });
  } catch (error) {
    console.error("Error updating position:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to update position"
    });
  }
};

exports.deletePosition = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await deletePosition(id);
    
    res.status(200).json({
      success: true,
      data: result,
      message: "Position deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting position:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to delete position"
    });
  }
}; 