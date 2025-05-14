"use client";
import { useState, useEffect } from 'react';
import { toast } from "react-toastify";

const PartylistDetails = ({ 
  partylist, 
  onClose 
}) => {
  const [isAddingCandidate, setIsAddingCandidate] = useState(false);
  const [candidateForm, setCandidateForm] = useState({
    firstName: "",
    lastName: "",
    course: "",
    studentNumber: ""
  });
  const [candidates, setCandidates] = useState([]);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file){
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  useEffect(() => {
    if (partylist) {
      const candidatesData = getPartylistCandidates(partylist.id);
      setCandidates(candidatesData);
    }
  }, [partylist]);

  const getPartylistCandidates = (partylistId) => {
    const candidatesData = JSON.parse(localStorage.getItem('partylistCandidates') || '{}');
    return candidatesData[partylistId] || [];
  };
  
  const savePartylistCandidates = (partylistId, candidates) => {
    const candidatesData = JSON.parse(localStorage.getItem('partylistCandidates') || '{}');
    candidatesData[partylistId] = candidates;
    localStorage.setItem('partylistCandidates', JSON.stringify(candidatesData));
  };

  const handleAddCandidate = (e) => {
    e.preventDefault();

    if (!candidateForm.firstName || !candidateForm.lastName || !candidateForm.course || !candidateForm.studentNumber) {
      toast.error("Please fill in all candidate fields");
      return;
    }

    if (candidates.some(c => c.studentNumber === candidateForm.studentNumber)) {
      toast.error("A candidate with this student number already exists");
      return;
    }

    const newCandidate = {
      ...candidateForm,
      id: Date.now().toString(), 
      dateAdded: new Date().toISOString()
    };
    
    const updatedCandidates = [...candidates, newCandidate];
 
    setCandidates(updatedCandidates);
    savePartylistCandidates(partylist.id, updatedCandidates);

    setCandidateForm({
      firstName: "",
      lastName: "",
      course: "",
      studentNumber: ""
    });
    setIsAddingCandidate(false);
    
    toast.success("Candidate added successfully");
  };
  
  const handleRemoveCandidate = (candidateId, candidateName) => {
    if (!window.confirm(`Are you sure you want to remove this candidate?`)) return;
    
    const updatedCandidates = candidates.filter(c => c.id !== candidateId);

    setCandidates(updatedCandidates);
    savePartylistCandidates(partylist.id, updatedCandidates);
    
    toast.success("Candidate removed successfully");
  };
  
  const handleCandidateInputChange = (e) => {
    const { name, value } = e.target;
    setCandidateForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-black">Partylist: {partylist.name}</h2>
        <button
          onClick={onClose}
          className="px-3 py-1 text-sm rounded bg-gray-200 text-gray-800 hover:bg-gray-300"
        >
          Back to List
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
        <div className="md:col-span-3 flex flex-col items-center">
          {partylist.logo_url ? (
            <img 
              src={`http://localhost:5000${partylist.logo_url}`} 
              alt={`${partylist.name} logo`} 
              className="h-40 w-40 object-contain border rounded-md bg-gray-50 p-2 mb-3"
            />
          ) : (
            <div className="h-40 w-40 flex items-center justify-center bg-gray-100 border rounded-md mb-3">
              <span className="text-gray-400">No logo</span>
            </div>
          )}
          <h3 className="text-lg font-bold text-center text-black">Partylist Name: {partylist.name}</h3>
          {partylist.slogan && (
            <p className="text-sm text-black text-center mt-1 italic">Slogan: "{partylist.slogan}"</p>
          )}
        </div>
        
        <div className="md:col-span-9">
          <div className="mb-4">
            <h3 className="text-md font-semibold text-gray-700 mb-2">Advocacy/Platform</h3>
            <div className="bg-gray-50 p-4 rounded border whitespace-pre-wrap text-gray-700">
              {partylist.advocacy || "No advocacy statement provided."}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-md font-semibold text-black">Candidates</h3>
              {!isAddingCandidate && (
                <div className="flex space-x-2">
                  <button 
                    onClick={() => setIsAddingCandidate(true)}
                    className="px-3 py-1 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
                  >
                    + Add Candidate
                  </button>
                  <button 
                  
                    className="px-3 py-1 text-sm rounded bg-green-600 text-white hover:bg-green-700"
                  >
                    Batch Upload
                  </button>
                </div>
              )}
            </div>
            
            {isAddingCandidate && (
              <div className="bg-gray-50 p-4 rounded border mb-4">
                <h4 className="text-md font-semibold mb-3 text-black">Add New Candidate</h4>
                <form onSubmit={handleAddCandidate} className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="text-black border-1 box-sizing: border-box; p-4 pointer">
                  
                    {/*  <input type="file" accept="image/*" onChange={handleImageChange} />*/}
                      
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-black  mb-1">First Name</label>
                      <input
                        type="text"
                        name="firstName"
                        value={candidateForm.firstName}
                        onChange={handleCandidateInputChange}
                        className="w-full p-2 border rounded text-black"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black  mb-1">Last Name</label>
                      <input
                        type="text"
                        name="lastName"
                        value={candidateForm.lastName}
                        onChange={handleCandidateInputChange}
                        className="w-full p-2 border rounded text-black"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black  mb-1">Student Number</label>
                      <input
                        type="text"
                        name="studentNumber"
                        value={candidateForm.studentNumber}
                        onChange={handleCandidateInputChange}
                        className="w-full p-2 border rounded text-black"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black  mb-1">Course</label>
                      <input
                        type="text"
                        name="course"
                        value={candidateForm.course}
                        onChange={handleCandidateInputChange}
                        className="w-full p-2 border rounded text-black"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2 mt-4">
                    <button
                      type="button"
                      onClick={() => setIsAddingCandidate(false)}
                      className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-black"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Add Candidate
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="bg-white border rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Student #</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Course</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {candidates.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-4 py-4 text-center text-sm text-black">
                        No candidates added yet
                      </td>
                    </tr>
                  ) : (
                    candidates.map(candidate => (
                      <tr key={candidate.id}>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {candidate.firstName} {candidate.lastName}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-black">
                          {candidate.studentNumber}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-black">
                          {candidate.course}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={() => handleRemoveCandidate(candidate.id, `${candidate.firstName} ${candidate.lastName}`)}
                            className="w-20 h-8 bg-red-500 text-white rounded hover:bg-red-600 font-medium text-xs inline-flex items-center justify-center"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartylistDetails; 