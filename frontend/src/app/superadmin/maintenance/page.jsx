"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Cookies from "js-cookie";
import { toast } from "react-toastify";
import PartylistForm from "./components/PartylistForm";
import PartylistCard from "./components/PartylistCard";
import PartylistDetails from "./components/PartylistDetails";
import PositionManager from "./components/PositionManager";

const API_ENDPOINTS = {
  programs: "programs",
  electionTypes: "election-types",
  yearLevels: "year-levels",
  genders: "genders",
  semesters: "semesters",
  precincts: "precincts",
  departments: "departments"
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
  const [partylistList, setPartylistList] = useState([]);
  const [archivedPartylistList, setArchivedPartylistList] = useState([]);
  const [isAddingPartylist, setIsAddingPartylist] = useState(false);
  const [editingPartylist, setEditingPartylist] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [selectedPartylist, setSelectedPartylist] = useState(null);
  const [electionTypesList, setElectionTypesList] = useState([]);
  const [departmentType, setDepartmentType] = useState("Academic");

  const tabs = [
    { id: "programs", label: "Programs" },
    { id: "electionTypes", label: "Election Types" },
    { id: "yearLevels", label: "Year Levels" },
    { id: "genders", label: "Genders" },
    { id: "semesters", label: "Semesters" },
    { id: "precincts", label: "Precincts" },
    { id: "departments", label: "Departments" },
    { id: "partylists", label: "Partylist" },
    { id: "positions", label: "Positions" },
  ];

  useEffect(() => {
    fetchItems();
  }, [activeTab]);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const token = Cookies.get("token");
      const endpoint = API_ENDPOINTS[activeTab];
      
      if (activeTab !== "partylists") {
        let response;
        if (activeTab === "departments") {
          response = await axios.get(
            "/superadmin/departments",
            { headers: { Authorization: `Bearer ${token}` } }
          );
          // Transform the data to match the expected format
          const departments = response.data.departments || response.data || [];
          setItems(departments.map(dept => ({
            id: dept.id,
            name: dept.department_name,
            department_type: dept.department_type
          })));
        } else {
          response = await axios.get(
            `/maintenance/${endpoint}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setItems(response.data.data);
        }
        
        if (activeTab === "semesters") {
          try {
            const currentSemesterResponse = await axios.get(
              "/maintenance/current-semester",
              { headers: { Authorization: `Bearer ${token}` } }
            );
            
            if (currentSemesterResponse.data.success && currentSemesterResponse.data.data) {
              setCurrentSemester(currentSemesterResponse.data.data.id);
            } else {
              setCurrentSemester(null);
            }
          } catch (error) {
            setCurrentSemester(null);
          }
        }
      }
    } catch (error) {
      toast.error("Failed to fetch items");
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
      
      if (activeTab === "departments") {
        await axios.post(
          "/superadmin/departments",
          {
            department_name: newItemName,
            department_type: departmentType
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        const endpoint = API_ENDPOINTS[activeTab];
        await axios.post(
          `/maintenance/${endpoint}`,
          { name: newItemName },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      
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
      
      if (activeTab === "departments") {
        await axios.put(
          ` /superadmin/departments/${editingItem.id}`,
          {
            department_name: editName,
            department_type: departmentType
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        const endpoint = API_ENDPOINTS[activeTab];
        await axios.put(
          `/maintenance/${endpoint}/${editingItem.id}`,
          { name: editName },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      
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
      
      if (activeTab === "departments") {
        await axios.delete(
          `/superadmin/departments/${item.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        const endpoint = API_ENDPOINTS[activeTab];
        await axios.delete(
          `/maintenance/${endpoint}/${item.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      
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
        `/maintenance/set-current-semester`,
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

  useEffect(() => {
    if (activeTab === "partylists") {
      fetchPartylists();
      fetchArchivedPartylists();
    } else if (activeTab === "positions") {
      fetchElectionTypes();
    }
  }, [activeTab]);

  const fetchElectionTypes = async () => {
    try {
      const token = Cookies.get("token");
      const response = await axios.get(
        "/maintenance/election-types",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.data) {
        setElectionTypesList(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching election types:", error);
      toast.error("Failed to fetch election types");
    }
  };

  const fetchPartylists = async () => {
    try {
      const token = Cookies.get("token");
      const response = await axios.get(
        "/partylists",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setPartylistList(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching partylists:", error);
      toast.error("Failed to fetch partylists");
    }
  };

  const fetchArchivedPartylists = async () => {
    try {
      const token = Cookies.get("token");
      const response = await axios.get(
        "/partylists/archived",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setArchivedPartylistList(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching archived partylists:", error);
      toast.error("Failed to fetch archived partylists");
    }
  };

  const handleEditPartylist = (partylist) => {
    setEditingPartylist(partylist);
    setIsAddingPartylist(true);
  };

  const handleArchivePartylist = async (id) => {
    if (!confirm("Are you sure you want to archive this partylist?")) return;

    try {
      const token = Cookies.get("token");
      const response = await axios.delete(
        `/partylists/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success("Partylist archived successfully");
        fetchPartylists();
        fetchArchivedPartylists();
      }
    } catch (error) {
      console.error("Error archiving partylist:", error);
      toast.error("Failed to archive partylist");
    }
  };

  const handleRestorePartylist = async (id) => {
    try {
      const token = Cookies.get("token");
      const response = await axios.post(
        `/partylists/${id}/restore`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success("Partylist restored successfully");
        fetchPartylists();
        fetchArchivedPartylists();
      }
    } catch (error) {
      console.error("Error restoring partylist:", error);
      toast.error("Failed to restore partylist");
    }
  };

  const handlePermanentDeletePartylist = async (id) => {
    if (!confirm("Are you sure you want to PERMANENTLY delete this partylist? This action cannot be undone!")) return;

    try {
      const token = Cookies.get("token");
      const response = await axios.delete(
        `/artylists/${id}/permanent`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success("Partylist permanently deleted");
        fetchArchivedPartylists();
      }
    } catch (error) {
      console.error("Error permanently deleting partylist:", error);
      toast.error("Failed to permanently delete partylist");
    }
  };

  const handleViewPartylistDetails = (partylist) => {
    setSelectedPartylist(partylist);
  };
  
  const handleClosePartylistDetails = () => {
    setSelectedPartylist(null);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-black">Maintenance</h1>
      
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`px-4 py-2 rounded-md text-base font-medium ${activeTab === tab.id 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow w-full">
        {selectedPartylist ? (
          <PartylistDetails 
            partylist={selectedPartylist} 
            onClose={handleClosePartylistDetails} 
          />
        ) : (
          activeTab === "partylists" ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold text-black">Partylist</h2>
                {!isAddingPartylist && (
                  <button
                    onClick={() => {
                      setEditingPartylist(null);
                      setIsAddingPartylist(true);
                    }}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md"
                  >
                    + Register Partylist
                  </button>
                )}
              </div>
              
              {isAddingPartylist && (
                <PartylistForm 
                  isAddingPartylist={isAddingPartylist}
                  setIsAddingPartylist={setIsAddingPartylist}
                  editingPartylist={editingPartylist}
                  setEditingPartylist={setEditingPartylist}
                  fetchPartylists={fetchPartylists}
                  fetchArchivedPartylists={fetchArchivedPartylists}
                />
              )}
              
              <div className="border rounded-lg overflow-hidden">
                <div className="px-6 py-3 bg-gray-50 border-b flex justify-between items-center">
                  <h3 className="text-xl font-semibold text-black">
                    {showArchived ? "Archived Partylists" : "Registered Partylists"}
                  </h3>
                  <button
                    onClick={() => setShowArchived(!showArchived)}
                    className={`px-3 py-1 text-sm rounded ${
                      showArchived 
                        ? 'bg-blue-600 text-white hover:bg-blue-700'  
                        : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                    }`}
                  >
                    {showArchived ? "Active" : "Archived"}
                  </button>
                </div>
                
                {showArchived ? (
                  archivedPartylistList.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No archived partylists</div>
                  ) : (
                    <div className="p-6 space-y-6 bg-gray-50">
                      {archivedPartylistList.map((pl) => (
                        <PartylistCard 
                          key={pl.id}
                          partylist={pl}
                          isArchived={true}
                          onRestore={handleRestorePartylist}
                          onDelete={handlePermanentDeletePartylist}
                        />
                      ))}
                    </div>
                  )
                ) : (
                  partylistList.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No partylists found</div>
                  ) : (
                    <div className="p-6 space-y-6 bg-gray-50">
                      {partylistList.map((pl) => (
                        <PartylistCard 
                          key={pl.id}
                          partylist={pl}
                          onViewDetails={handleViewPartylistDetails}
                          onEdit={handleEditPartylist}
                          onArchive={handleArchivePartylist}
                        />
                      ))}
                    </div>
                  )
                )}
              </div>
            </>
          ) : activeTab === "positions" ? (
            <PositionManager electionTypes={electionTypesList} />
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold text-black">
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
                    {activeTab === "departments" && (
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-black mb-1">
                          Department Type
                        </label>
                        <select
                          value={departmentType}
                          onChange={(e) => setDepartmentType(e.target.value)}
                          className="w-full p-2 border rounded text-black"
                        >
                          <option value="Academic">Academic</option>
                          <option value="Administrative">Administrative</option>
                          <option value="Organization">Organization</option>
                          <option value="System">System</option>
                        </select>
                      </div>
                    )}
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
                  <table className="min-w-full divide-y divide-gray-200 table-fixed">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider w-3/4">
                          Name
                        </th>
                        {activeTab === "departments" && (
                          <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                        )}
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider w-1/4">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-base font-medium text-black">
                            {item.name}
                            {activeTab === "semesters" && currentSemester === item.id && (
                              <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                                Current
                              </span>
                            )}
                          </td>
                          {activeTab === "departments" && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                item.department_type === 'Academic' 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : item.department_type === 'Administrative'
                                  ? 'bg-green-100 text-green-800'
                                  : item.department_type === 'Organization'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {item.department_type}
                              </span>
                            </td>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap text-base font-medium flex gap-2">
                            <button
                              onClick={() => {
                                startEditing(item);
                                if (activeTab === "departments") {
                                  setDepartmentType(item.department_type);
                                }
                              }}
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
            </>
          )
        )}
      </div>
    </div>
  );
};

export default MaintenancePage;