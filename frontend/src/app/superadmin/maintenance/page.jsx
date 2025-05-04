"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Cookies from "js-cookie";
import { toast } from "react-toastify";

const API_ENDPOINTS = {
  programs: "programs",
  electionTypes: "election-types",
  yearLevels: "year-levels",
  genders: "genders",
  semesters: "semesters",
  precincts: "precincts"
};

const MaintenancePage = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("programs");
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editName, setEditName] = useState("");
  const [currentSemester, setCurrentSemester] = useState(null);

  const tabs = [
    { id: "programs", label: "Programs" },
    { id: "electionTypes", label: "Election Types" },
    { id: "yearLevels", label: "Year Levels" },
    { id: "genders", label: "Genders" },
    { id: "semesters", label: "Semesters" },
    { id: "precincts", label: "Precincts" },
  ];

  useEffect(() => {
    fetchItems();
  }, [activeTab]);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const token = Cookies.get("token");
      const endpoint = API_ENDPOINTS[activeTab];
      
      const response = await axios.get(
        `http://localhost:5000/api/maintenance/${endpoint}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setItems(response.data.data);
      
      // If we're on the semesters tab, fetch the current semester
      if (activeTab === "semesters") {
        try {
          const currentSemesterResponse = await axios.get(
            "http://localhost:5000/api/maintenance/current-semester",
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          if (currentSemesterResponse.data.success && currentSemesterResponse.data.data) {
            setCurrentSemester(currentSemesterResponse.data.data.id);
          } else {
            setCurrentSemester(null);
          }
        } catch (error) {
          console.error("Error fetching current semester:", error);
          setCurrentSemester(null);
        }
      }
    } catch (error) {
      toast.error("Failed to fetch items");
      console.error("API Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItemName.trim()) {
      toast.error("Please enter a name");
      return;
    }
    
    if (items.some(item => item.name.toLowerCase() === newItemName.toLowerCase())) {
      toast.error("This value already exists");
      return;
    }

    setIsLoading(true);
    try {
      const token = Cookies.get("token");
      const endpoint = API_ENDPOINTS[activeTab];
      
      await axios.post(
        `http://localhost:5000/api/maintenance/${endpoint}`,
        { name: newItemName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success("Item added successfully");
      setNewItemName("");
      setIsAdding(false);
      fetchItems();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add item");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateItem = async () => {
    if (!editName.trim()) {
      toast.error("Please enter a name");
      return;
    }

    if (items.some(item => 
      item.id !== editingItem.id && 
      item.name.toLowerCase() === editName.toLowerCase()
    )) {
      toast.error("This value already exists");
      return;
    }

    setIsLoading(true);
    try {
      const token = Cookies.get("token");
      const endpoint = API_ENDPOINTS[activeTab];
      
      await axios.put(
        `http://localhost:5000/api/maintenance/${endpoint}/${editingItem.id}`,
        { name: editName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success("Item updated successfully");
      setEditingItem(null);
      setEditName("");
      fetchItems();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update item");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteItem = async (item) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return;

    setIsLoading(true);
    try {
      const token = Cookies.get("token");
      const endpoint = API_ENDPOINTS[activeTab];
      
      await axios.delete(
        `http://localhost:5000/api/maintenance/${endpoint}/${item.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success("Item deleted successfully");
      fetchItems();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete item");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const setAsCurrentSemester = async (semesterId) => {
    setIsLoading(true);
    try {
      const token = Cookies.get("token");
      
      await axios.post(
        `http://localhost:5000/api/maintenance/set-current-semester`,
        { semesterId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success("Current semester updated successfully");
      setCurrentSemester(semesterId);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to set current semester");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const startEditing = (item) => {
    setEditingItem(item);
    setEditName(item.name);
  };

  const cancelEditing = () => {
    setEditingItem(null);
    setEditName("");
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-black">Maintenance</h1>
      
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`px-4 py-2 rounded-md ${activeTab === tab.id 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-black">
            {tabs.find(t => t.id === activeTab).label}
          </h2>
          
          {!isAdding && !editingItem && (
            <button
              onClick={() => setIsAdding(true)}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Add New
            </button>
          )}
        </div>
        
        {activeTab === "semesters" && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              Set a semester as current to have it automatically selected when creating elections.
            </p>
          </div>
        )}
        
        {(isAdding || editingItem) && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-sm font-medium text-black mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={editingItem ? editName : newItemName}
                  onChange={(e) => editingItem ? setEditName(e.target.value) : setNewItemName(e.target.value)}
                  className="w-full p-2 border rounded text-black"
                  placeholder={`Enter ${tabs.find(t => t.id === activeTab).label.slice(0, -1)} name`}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={editingItem ? handleUpdateItem : handleAddItem}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? "Saving..." : editingItem ? "Update" : "Add"}
                </button>
                <button
                  onClick={editingItem ? cancelEditing : () => {
                    setIsAdding(false);
                    setNewItemName("");
                  }}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-black"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        
        {isLoading ? (
          <div className="text-center py-8">Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No items found</div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.name}
                      {activeTab === "semesters" && currentSemester === item.id && (
                        <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                          Current
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-2">
                      <button
                        onClick={() => startEditing(item)}
                        className="text-blue-600 hover:text-blue-900"
                        disabled={isLoading}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item)}
                        className="text-red-600 hover:text-red-900"
                        disabled={isLoading}
                      >
                        Delete
                      </button>
                      {activeTab === "semesters" && currentSemester !== item.id && (
                        <button
                          onClick={() => setAsCurrentSemester(item.id)}
                          className="text-green-600 hover:text-green-900"
                          disabled={isLoading}
                        >
                          Set as Current
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MaintenancePage;