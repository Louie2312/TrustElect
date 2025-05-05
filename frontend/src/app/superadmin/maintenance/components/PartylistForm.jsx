"use client";
import { useState } from 'react';
import { toast } from "react-toastify";
import axios from "axios";
import Cookies from "js-cookie";

const PartylistForm = ({ 
  isAddingPartylist, 
  setIsAddingPartylist, 
  editingPartylist, 
  setEditingPartylist, 
  fetchPartylists, 
  fetchArchivedPartylists 
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [partylistForm, setPartylistForm] = useState({
    name: editingPartylist?.name || "",
    slogan: editingPartylist?.slogan || "",
    advocacy: editingPartylist?.advocacy || "",
    logo: null
  });

  const handlePartylistSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const token = Cookies.get("token");
      const formData = new FormData();
      
      formData.append("name", partylistForm.name);
      formData.append("slogan", partylistForm.slogan);
      formData.append("advocacy", partylistForm.advocacy);
      if (partylistForm.logo) {
        formData.append("logo", partylistForm.logo);
      }

      let response;
      if (editingPartylist) {
        // Update existing partylist
        response = await axios.put(
          `http://localhost:5000/api/partylists/${editingPartylist.id}`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data",
            },
          }
        );
        toast.success("Partylist updated successfully");
      } else {
        // Create new partylist
        response = await axios.post(
          "http://localhost:5000/api/partylists",
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data",
            },
          }
        );
        toast.success("Partylist registered successfully");
      }

      if (response.data.success) {
        setIsAddingPartylist(false);
        setEditingPartylist(null);
        setPartylistForm({
          name: "",
          slogan: "",
          advocacy: "",
          logo: null
        });
        fetchPartylists();
        if (fetchArchivedPartylists) fetchArchivedPartylists();
      }
    } catch (error) {
      console.error(`Error ${editingPartylist ? 'updating' : 'registering'} partylist:`, error);
      toast.error(error.response?.data?.message || `Failed to ${editingPartylist ? 'update' : 'register'} partylist`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPartylistForm(prev => ({
        ...prev,
        logo: file
      }));
    }
  };

  return (
    <div className="mb-6 p-6 bg-gray-50 rounded-lg shadow-inner">
      <h3 className="text-lg font-bold mb-4 text-black">
        {editingPartylist ? "Edit Partylist" : "Partylist Registration"}
      </h3>
      <form onSubmit={handlePartylistSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-black mb-1">Name:</label>
            <input
              type="text"
              name="name"
              value={partylistForm.name}
              onChange={(e) => setPartylistForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full p-2 border rounded text-black"
              placeholder="Enter Partylist Name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-1">Slogan:</label>
            <input
              type="text"
              name="slogan"
              value={partylistForm.slogan}
              onChange={(e) => setPartylistForm(prev => ({ ...prev, slogan: e.target.value }))}
              className="w-full p-2 border rounded text-black"
              placeholder="Enter Partylist Slogan"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-black mb-1">Advocacy/Platform:</label>
            <textarea
              name="advocacy"
              value={partylistForm.advocacy}
              onChange={(e) => setPartylistForm(prev => ({ ...prev, advocacy: e.target.value }))}
              className="w-full p-2 border rounded text-black"
              placeholder="Enter Partylist Advocacy and Platform"
              rows={5}
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-black mb-1">Upload your Logo:</label>
            <div className="flex flex-col space-y-4">
              <input
                type="file"
                name="logo"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full p-2 border rounded text-black bg-white"
              />
              {partylistForm.logo ? (
                <div className="relative w-40 h-40 border rounded overflow-hidden mx-auto">
                  <img 
                    src={URL.createObjectURL(partylistForm.logo)} 
                    alt="Preview" 
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : editingPartylist && editingPartylist.logo_url ? (
                <div className="relative w-40 h-40 border rounded overflow-hidden mx-auto">
                  <img 
                    src={`http://localhost:5000${editingPartylist.logo_url}`} 
                    alt="Current logo" 
                    className="w-full h-full object-contain"
                  />
                  
                </div>
              ) : null}
              
            </div>
          </div>
        </div>
        
        <div className="flex gap-4 mt-6 justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? (editingPartylist ? "Updating..." : "Registering...") : (editingPartylist ? "Update" : "Register")}
          </button>
          <button
            type="button"
            className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50 text-black"
            onClick={() => {
              setIsAddingPartylist(false);
              setEditingPartylist(null);
              setPartylistForm({
                name: "",
                slogan: "",
                advocacy: "",
                logo: null
              });
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default PartylistForm; 