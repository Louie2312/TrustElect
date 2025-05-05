"use client";
import { useState, useEffect } from 'react';
import { toast } from "react-toastify";

const PositionManager = ({ electionTypes }) => {
  const [selectedElectionType, setSelectedElectionType] = useState(null);
  const [positions, setPositions] = useState([]);
  const [newPositionName, setNewPositionName] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editingPosition, setEditingPosition] = useState(null);

  useEffect(() => {
    if (selectedElectionType) {
      const storedPositions = getPositionsForElectionType(selectedElectionType.id);
      setPositions(storedPositions);
    } else {
      setPositions([]);
    }
  }, [selectedElectionType]);

  useEffect(() => {
    if (!localStorage.getItem('electionPositions')) {
      localStorage.setItem('electionPositions', JSON.stringify({}));
    }
  }, []);

  const getPositionsForElectionType = (electionTypeId) => {
    const positionsData = JSON.parse(localStorage.getItem('electionPositions') || '{}');
    return positionsData[electionTypeId] || [];
  };

  const savePositionsForElectionType = (electionTypeId, positions) => {
    const positionsData = JSON.parse(localStorage.getItem('electionPositions') || '{}');
    positionsData[electionTypeId] = positions;
    localStorage.setItem('electionPositions', JSON.stringify(positionsData));
  };

  const handleAddPosition = (e) => {
    e.preventDefault();

    if (!selectedElectionType) {
      toast.error("Please select an election type first");
      return;
    }

    if (!newPositionName.trim()) {
      toast.error("Position name is required");
      return;
    }

    if (isEditing) {
      const updatedPositions = positions.map(pos => 
        pos.id === editingPosition.id 
          ? { ...pos, name: newPositionName } 
          : pos
      );
      
      setPositions(updatedPositions);
      savePositionsForElectionType(selectedElectionType.id, updatedPositions);
      toast.success("Position updated successfully");
    } else {
      const positionExists = positions.some(p => 
        p.name.toLowerCase() === newPositionName.toLowerCase()
      );
      
      if (positionExists) {
        toast.error("A position with this name already exists");
        return;
      }

      const newPosition = {
        name: newPositionName,
        id: Date.now().toString(),
        dateAdded: new Date().toISOString()
      };
      
      const updatedPositions = [...positions, newPosition];
      setPositions(updatedPositions);
      savePositionsForElectionType(selectedElectionType.id, updatedPositions);
      toast.success("Position added successfully");
    }

    setNewPositionName("");
    setIsEditing(false);
    setEditingPosition(null);
  };

  const handleEditPosition = (position) => {
    setNewPositionName(position.name);
    setIsEditing(true);
    setEditingPosition(position);
  };

  const handleDeletePosition = (positionId) => {
    if (!window.confirm("Are you sure you want to delete this position?")) return;
    
    const updatedPositions = positions.filter(p => p.id !== positionId);
    setPositions(updatedPositions);
    savePositionsForElectionType(selectedElectionType.id, updatedPositions);
    toast.success("Position deleted successfully");
  };

  const handleCancelEdit = () => {
    setNewPositionName("");
    setIsEditing(false);
    setEditingPosition(null);
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-black mb-4">Positions Management</h2>
       
        <div className="mb-6">
          <label className="block text-base font-medium text-black mb-2">
            Select Election Type
          </label>
          <div className="flex flex-wrap gap-2">
            {electionTypes.length === 0 ? (
              <p className="text-gray-500">No election types available. Please add some in the Election Types tab.</p>
            ) : (
              electionTypes.map(type => (
                <button
                  key={type.id}
                  className={`px-4 py-2 rounded-md ${
                    selectedElectionType?.id === type.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  onClick={() => setSelectedElectionType(type)}
                >
                  {type.name}
                </button>
              ))
            )}
          </div>
        </div>
        
        {selectedElectionType && (
          <>
            {/* Position Form */}
            <div className="bg-gray-50 p-4 rounded-lg border mb-6">
              <h3 className="text-lg font-semibold text-black mb-3">
                {isEditing ? "Edit Position" : "Add New Position"}
              </h3>
              <form onSubmit={handleAddPosition} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Position Name</label>
                  <input
                    type="text"
                    value={newPositionName}
                    onChange={(e) => setNewPositionName(e.target.value)}
                    className="w-150 p-2 border rounded text-black"
                    
                    required
                  />
                </div>
                
                <div className="flex justify-end space-x-2 mt-4">
                  {isEditing && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-black"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    {isEditing ? "Update Position" : "Add Position"}
                  </button>
                </div>
              </form>
            </div>
            
            {/* Positions List */}
            <div>
              <h3 className="text-lg font-semibold text-black mb-3">
                Positions for {selectedElectionType.name}
              </h3>
              {positions.length === 0 ? (
                <p className="text-gray-500 bg-gray-50 p-4 rounded border">
                  No positions created.
                </p>
              ) : (
                <div className="bg-white border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-black uppercase tracking-wider">Position Name</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-black uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {positions.map(position => (
                        <tr key={position.id}>
                          <td className="px-4 py-3 whitespace-nowrap text-base font-medium text-black">
                            {position.name}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEditPosition(position)}
                                className="w-20 h-8 bg-amber-500 text-white rounded hover:bg-amber-600 font-medium text-xs inline-flex items-center justify-center"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeletePosition(position.id)}
                                className="w-20 h-8 bg-red-500 text-white rounded hover:bg-red-600 font-medium text-xs inline-flex items-center justify-center"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PositionManager; 