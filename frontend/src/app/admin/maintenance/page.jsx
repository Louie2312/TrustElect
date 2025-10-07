"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Cookies from "js-cookie";
import { toast } from "react-toastify";
import usePermissions from "../../../hooks/usePermissions";
import PartylistForm from "../../superadmin/maintenance/components/PartylistForm";
import PartylistCard from "../../superadmin/maintenance/components/PartylistCard";
import PartylistDetails from "../../superadmin/maintenance/components/PartylistDetails";
import PositionManager from "../../superadmin/maintenance/components/PositionManager";
import LaboratoryPrecinctManager from "./components/LaboratoryPrecinctManager";

const API_ENDPOINTS = {
  programs: "programs",
  electionTypes: "election-types",
  yearLevels: "year-levels",
  genders: "genders",
  semesters: "semesters",
  precincts: "precincts",
  departments: "departments"
};

const AdminMaintenancePage = () => {
  const router = useRouter();
  const { hasPermission, permissionsLoading } = usePermissions();
  const [activeTab, setActiveTab] = useState("programs");
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editName, setEditName] = useState("");
  const [currentSemester, setCurrentSemester] = useState(null);
  const [departmentType, setDepartmentType] = useState("Academic");
  const [partylistList, setPartylistList] = useState([]);
  const [archivedPartylistList, setArchivedPartylistList] = useState([]);
  const [isAddingPartylist, setIsAddingPartylist] = useState(false);
  const [editingPartylist, setEditingPartylist] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [selectedPartylist, setSelectedPartylist] = useState(null);
  const [electionTypesList, setElectionTypesList] = useState([]);
  const [precinctsData, setPrecinctsData] = useState([]);

  const tabs = [
    { id: "programs", label: "Programs" },
    { id: "electionTypes", label: "Election Types" },
    { id: "yearLevels", label: "Year Levels" },
    { id: "genders", label: "Genders" },
    { id: "semesters", label: "Semesters" },
    { id: "precincts", label: "Precincts" },
    { id: "laboratoryPrecincts", label: "Laboratory Precincts" },
    { id: "departments", label: "Departments" },
    { id: "partylists", label: "Partylist" },
    { id: "positions", label: "Positions" },
  ];

  // Check permissions on component mount
  useEffect(() => {
    if (!permissionsLoading && !hasPermission('maintenance', 'view')) {
      toast.error("You don't have permission to access maintenance");
      router.push("/admin");
      return;
    }
  }, [permissionsLoading, hasPermission, router]);

  useEffect(() => {
    if (!permissionsLoading && hasPermission('maintenance', 'view')) {
      fetchItems();
    }
  }, [activeTab, permissionsLoading, hasPermission]);

  useEffect(() => {
    if (activeTab === "partylists") {
      fetchPartylists();
      fetchArchivedPartylists();
    } else if (activeTab === "positions") {
      fetchElectionTypes();
    } else if (activeTab === "laboratoryPrecincts") {
      fetchItems(); // This will fetch precincts when laboratoryPrecincts tab is active
    }
  }, [activeTab]);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const token = Cookies.get("token");
      
      let response;
      if (activeTab === "departments") {
        response = await axios.get(
          "/api/superadmin/departments",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        // Transform the data to match the expected format
        const departments = response.data.departments || response.data || [];
        setItems(departments.map(dept => ({
          id: dept.id,
          name: dept.department_name,
          department_type: dept.department_type
        })));
      } else if (activeTab === "laboratoryPrecincts") {
        // Fetch precincts for laboratory precinct management
        response = await axios.get(
          "/api/maintenance/precincts",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setItems(response.data.data);
      } else {
        const endpoint = API_ENDPOINTS[activeTab];
        response = await axios.get(
          `/api/maintenance/${endpoint}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setItems(response.data.data);
      }
      
      if (activeTab === "semesters") {
        try {
          const currentSemesterResponse = await axios.get(
            "/api/maintenance/current-semester",
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
    } catch (error) {
      toast.error("Failed to fetch items");
      console.error("API Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!hasPermission('maintenance', 'create')) {
      toast.error("You don't have permission to create items");
      return;
    }

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
          "/api/superadmin/departments",
          {
            department_name: newItemName,
            department_type: departmentType
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        const endpoint = API_ENDPOINTS[activeTab];
        await axios.post(
          `/api/maintenance/${endpoint}`,
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
    if (!hasPermission('maintenance', 'edit')) {
      toast.error("You don't have permission to edit items");
      return;
    }

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
          `/api/superadmin/departments/${editingItem.id}`,
          {
            department_name: editName,
            department_type: departmentType
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        const endpoint = API_ENDPOINTS[activeTab];
        await axios.put(
          `/api/maintenance/${endpoint}/${editingItem.id}`,
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
    if (!hasPermission('maintenance', 'delete')) {
      toast.error("You don't have permission to delete items");
      return;
    }

    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return;

    setIsLoading(true);
    try {
      const token = Cookies.get("token");
      
      if (activeTab === "departments") {
        await axios.delete(
          `/api/superadmin/departments/${item.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        const endpoint = API_ENDPOINTS[activeTab];
        await axios.delete(
          `/api/maintenance/${endpoint}/${item.id}`,
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
    if (!hasPermission('maintenance', 'edit')) {
      toast.error("You don't have permission to set current semester");
      return;
    }

    setIsLoading(true);
    try {
      const token = Cookies.get("token");
      
      await axios.post(
        `/api/maintenance/set-current-semester`,
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

  const fetchElectionTypes = async () => {
    try {
      const token = Cookies.get("token");
      const response = await axios.get(
        "/api/maintenance/election-types",
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
        "/api/partylists",
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
        "/api/partylists/archived",
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
    if (!hasPermission('maintenance', 'delete')) {
      toast.error("You don't have permission to archive partylists");
      return;
    }

    if (!confirm("Are you sure you want to archive this partylist?")) return;

    try {
      const token = Cookies.get("token");
      const response = await axios.delete(
        `/api/partylists/${id}`,
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
    if (!hasPermission('maintenance', 'create')) {
      toast.error("You don't have permission to restore partylists");
      return;
    }

    try {
      const token = Cookies.get("token");
      const response = await axios.post(
        `/api/partylists/${id}/restore`,
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
    if (!hasPermission('maintenance', 'delete')) {
      toast.error("You don't have permission to permanently delete partylists");
      return;
    }

    if (!confirm("Are you sure you want to PERMANENTLY delete this partylist? This action cannot be undone!")) return;

    try {
      const token = Cookies.get("token");
      const response = await axios.delete(
        `/api/partylists/${id}/permanent`,
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

  // Don't render if permissions are loading or user doesn't have permission
  if (permissionsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!hasPermission('maintenance', 'view')) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p>You don't have permission to access the maintenance section.</p>
        </div>
      </div>
    );
  }

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
          activeTab === "laboratoryPrecincts" ? (
            <LaboratoryPrecinctManager precincts={items} />
          ) : activeTab === "partylists" ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold text-black">Partylist</h2>
                {hasPermission('maintenance', 'create') && !isAddingPartylist && (
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
                
                {hasPermission('maintenance', 'create') && !isAdding && !editingItem && (
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
                            {hasPermission('maintenance', 'edit') && (
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
                            )}
                            {hasPermission('maintenance', 'delete') && (
                              <button
                                onClick={() => handleDeleteItem(item)}
                                className="text-red-600 hover:text-red-900"
                                disabled={isLoading}
                              >
                                Delete
                              </button>
                            )}
                            {activeTab === "semesters" && currentSemester !== item.id && hasPermission('maintenance', 'edit') && (
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

export default AdminMaintenancePage;