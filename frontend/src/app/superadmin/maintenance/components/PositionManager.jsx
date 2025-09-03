"use client";
import { useState, useEffect } from 'react';
import { toast } from "react-toastify";
import axios from 'axios';
import Cookies from "js-cookie";

// Remove the custom api instance and use regular axios with proper headers
const PositionManager = ({ electionTypes }) => {
  const [selectedElectionType, setSelectedElectionType] = useState(null);
  const [positions, setPositions] = useState([]);
  const [newPositionName, setNewPositionName] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editingPosition, setEditingPosition] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedElectionType) {
      fetchPositions(selectedElectionType.id);
    } else {
      setPositions([]);
    }
  }, [selectedElectionType]);

  const fetchPositions = async (electionTypeId) => {
    try {
      setLoading(true);
      const token = Cookies.get("token");
      const response = await axios.get(
        `/api/maintenance/positions?electionTypeId=${electionTypeId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setPositions(response.data.data);
      } else {
        toast.error("Failed to fetch positions");
        tryLocalStorageFallback(electionTypeId);
      }
    } catch (error) {
      console.error("Error fetching positions:", error);
      toast.error("Failed to connect to server. Using local storage fallback.");
      tryLocalStorageFallback(electionTypeId);
    } finally {
      setLoading(false);
    }
  };
  
  const tryLocalStorageFallback = (electionTypeId) => {
    try {
      const positionsData = JSON.parse(localStorage.getItem('electionPositions') || '{}');
      const storedPositions = positionsData[electionTypeId] || [];
      setPositions(storedPositions);
      toast.info("Using local storage as fallback. API connection issue.");
    } catch (localStorageError) {
      console.error("LocalStorage fallback failed:", localStorageError);
    }
  };

  const handleAddPosition = async (e) => {
    e.preventDefault();

    if (!selectedElectionType) {
      toast.error("Please select an election type first");
      return;
    }

    if (!newPositionName.trim()) {
      toast.error("Position name is required");
      return;
    }

    try {
      setLoading(true);
      const token = Cookies.get("token");
      
      if (isEditing) {
        const response = await axios.put(
          `/api/maintenance/positions/${editingPosition.id}`,
          { name: newPositionName },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (response.data.success) {
          setPositions(positions.map(pos => 
            pos.id === editingPosition.id 
              ? response.data.data
              : pos
          ));
          toast.success("Position updated successfully");
        } else {
          toast.error("Failed to update position");
        }
      } else {
        const response = await axios.post(
          '/api/maintenance/positions',
          {
            name: newPositionName,
            electionTypeId: selectedElectionType.id
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (response.data.success) {
          setPositions([...positions, response.data.data]);
          toast.success("Position added successfully");
        } else {
          toast.error("Failed to create position");
        }
      }
      
      setNewPositionName("");
      setIsEditing(false);
      setEditingPosition(null);
    } catch (error) {
      console.error("Error saving position:", error);
      toast.error(error.response?.data?.message || "An error occurred while saving the position");

      handleLocalStorageFallback(isEditing, editingPosition, newPositionName, selectedElectionType);
    } finally {
      setLoading(false);
    }
  };

  const handleLocalStorageFallback = (isEditing, editingPosition, newName, selectedType) => {
    try {
      if (isEditing) {
        const updatedPositions = positions.map(pos => 
          pos.id === editingPosition.id 
            ? { ...pos, name: newName } 
            : pos
        );
        setPositions(updatedPositions);

        const positionsData = JSON.parse(localStorage.getItem('electionPositions') || '{}');
        positionsData[selectedType.id] = updatedPositions;
        localStorage.setItem('electionPositions', JSON.stringify(positionsData));
        
        toast.info("Used local storage as fallback. Position updated locally.");
      } else {
        const newPosition = {
          name: newName,
          id: Date.now().toString(),
          election_type_id: selectedType.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const updatedPositions = [...positions, newPosition];
        setPositions(updatedPositions);

        const positionsData = JSON.parse(localStorage.getItem('electionPositions') || '{}');
        positionsData[selectedType.id] = updatedPositions;
        localStorage.setItem('electionPositions', JSON.stringify(positionsData));
        
        toast.info("Used local storage as fallback. Position added locally.");
      }
      
      setNewPositionName("");
      setIsEditing(false);
      setEditingPosition(null);
    } catch (localStorageError) {
      console.error("LocalStorage fallback failed:", localStorageError);
    }
  };

  const handleEditPosition = (position) => {
    setNewPositionName(position.name);
    setIsEditing(true);
    setEditingPosition(position);
  };

  const handleDeletePosition = async (positionId) => {
    if (!window.confirm("Are you sure you want to delete this position?")) return;
    
    try {
      setLoading(true);
      const token = Cookies.get("token");
      const response = await axios.delete(
        `/api/maintenance/positions/${positionId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setPositions(positions.filter(p => p.id !== positionId));
        toast.success("Position deleted successfully");
      } else {
        toast.error("Failed to delete position");
      }
    } catch (error) {
      console.error("Error deleting position:", error);
      toast.error(error.response?.data?.message || "An error occurred while deleting the position");
      
      // Fallback to localStorage if API fails
      try {
        const updatedPositions = positions.filter(p => p.id !== positionId);
        setPositions(updatedPositions);
        
        // Save to localStorage as fallback
        const positionsData = JSON.parse(localStorage.getItem('electionPositions') || '{}');
        positionsData[selectedElectionType.id] = updatedPositions;
        localStorage.setItem('electionPositions', JSON.stringify(positionsData));
        
        toast.info("Used local storage as fallback. Position deleted locally.");
      } catch (localStorageError) {
        console.error("LocalStorage fallback failed:", localStorageError);
      }
    } finally {
      setLoading(false);
    }
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
                    disabled={loading}
                    required
                  />
                </div>
                
                <div className="flex justify-end space-x-2 mt-4">
                  {isEditing && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-black"
                      disabled={loading}
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    disabled={loading}
                  >
                    {loading ? "Processing..." : (isEditing ? "Update Position" : "Add Position")}
                  </button>
                </div>
              </form>
            </div>
            
      
            <div>
              <h3 className="text-lg font-semibold text-black mb-3">
                Positions for {selectedElectionType.name}
              </h3>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : positions.length === 0 ? (
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
                                disabled={loading}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeletePosition(position.id)}
                                className="w-20 h-8 bg-red-500 text-white rounded hover:bg-red-600 font-medium text-xs inline-flex items-center justify-center"
                                disabled={loading}
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