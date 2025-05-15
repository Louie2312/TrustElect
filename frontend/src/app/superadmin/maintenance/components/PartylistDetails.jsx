"use client";
import { useState, useEffect } from 'react';
import { toast } from "react-toastify";
import axios from 'axios';
import Cookies from "js-cookie";

// Configure axios with base URL
const api = axios.create({
  baseURL: 'http://localhost:5000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

const PartylistDetails = ({ 
  partylist, 
  onClose 
}) => {
  const [isAddingCandidate, setIsAddingCandidate] = useState(false);
  const [candidateForm, setCandidateForm] = useState({
    studentNumber: "",
    firstName: "",
    lastName: "",
    course: "",
    position: "",
    isRepresentative: false
  });
  const [candidates, setCandidates] = useState([]);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [studentFound, setStudentFound] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [studentData, setStudentData] = useState(null);
  const [studentSuggestions, setStudentSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allStudents, setAllStudents] = useState([]);
  const [positions, setPositions] = useState([]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file){
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  useEffect(() => {
    fetchAllStudents();
    fetchPositions();
  }, []);

  useEffect(() => {
    if (partylist) {
      fetchPartylistCandidates(partylist.id);
    }
  }, [partylist]);

  const fetchAllStudents = async () => {
    try {
      const token = Cookies.get("token");
      const res = await axios.get("http://localhost:5000/api/superadmin/students", {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      if (res.data && res.data.students) {
        const activeStudents = res.data.students.filter((student) => student.is_active);
        setAllStudents(activeStudents);
      }
    } catch (error) {
      console.error("Error fetching students:", error);
      toast.error("Failed to load students");
    }
  };

  const fetchPartylistCandidates = async (partylistId) => {
    setIsLoading(true);
    try {
      console.log(`Fetching candidates for partylist ID: ${partylistId}`);
      // For now, just use empty array since the API is not working
      setCandidates([]);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching candidates:", error);
      toast.error("Failed to load candidates");
      setIsLoading(false);
    }
  };

  const fetchPositions = async () => {
    try {
      // Instead of assuming ID 1, let's fetch all election types first to find Student Council
      const token = Cookies.get("token");
      
      // First, fetch election types to find Student Council
      const electionTypesResponse = await axios.get("http://localhost:5000/api/maintenance/election-types", {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      
      let studentCouncilElectionTypeId = null;
      
      if (electionTypesResponse.data && electionTypesResponse.data.data) {
        // Find Student Council election type
        const studentCouncilType = electionTypesResponse.data.data.find(
          type => type.name.toLowerCase().includes('student council') || type.name.toLowerCase().includes('student body')
        );
        
        if (studentCouncilType) {
          studentCouncilElectionTypeId = studentCouncilType.id;
          console.log("Found Student Council election type ID:", studentCouncilElectionTypeId);
        }
      }

      if (!studentCouncilElectionTypeId) {

        studentCouncilElectionTypeId = 1;
        console.log("Using fallback Student Council election type ID:", studentCouncilElectionTypeId);
      }
      
   
      const response = await axios.get(`http://localhost:5000/api/direct/positions?electionTypeId=${studentCouncilElectionTypeId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data && response.data.success && response.data.data) {

        setPositions(response.data.data);
      } else {

        tryLocalStorageFallback(studentCouncilElectionTypeId);
      }
    } catch (error) {
      console.error("Error fetching positions:", error);
      // Fallback to localStorage
      tryLocalStorageFallback();
    }
  };
  
  const tryLocalStorageFallback = (electionTypeId = 1) => {
    try {
      console.log("Trying localStorage fallback for positions");
      const positionsData = JSON.parse(localStorage.getItem('electionPositions') || '{}');

      let storedPositions = positionsData[electionTypeId] || [];

      if (storedPositions.length === 0 && electionTypeId !== 1) {
        console.log("No positions found for ID:", electionTypeId, "Trying ID 1 instead");
        storedPositions = positionsData["1"] || [];
      }
      
      if (storedPositions.length > 0) {
        console.log("Found positions in localStorage:", storedPositions);
        setPositions(storedPositions);
      } else {
        console.log("No positions found in localStorage. Using default positions");
        setPositions([
          { id: "1", name: "President" },
          { id: "2", name: "Vice President" },
          { id: "3", name: "Secretary" },
          { id: "4", name: "Treasurer" },
          { id: "5", name: "Auditor" }
        ]);
      }
    } catch (error) {
      console.error("Error using localStorage fallback for positions:", error);

      setPositions([
        { id: "1", name: "President" },
        { id: "2", name: "Vice President" },
        { id: "3", name: "Secretary" },
        { id: "4", name: "Treasurer" },
        { id: "5", name: "Auditor" }
      ]);
    }
  };

  const fetchStudentSuggestions = async (searchTerm) => {
    if (!searchTerm || searchTerm.length < 4) {
      setStudentSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    try {

      const matchingStudents = allStudents.filter(
        student => student.student_number.includes(searchTerm) || 
                  `${student.first_name} ${student.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 10); 
      
      setStudentSuggestions(matchingStudents);
      setShowSuggestions(matchingStudents.length > 0);

      const exactMatch = matchingStudents.find(s => s.student_number === searchTerm);
      if (exactMatch) {
        console.log('Found exact match:', exactMatch.student_number);
 
      }
    } catch (error) {
      console.error("Error filtering student suggestions:", error);
      setStudentSuggestions([]);
    }
  };

  const validateStudentNumber = async (studentNumber) => {
    if (!studentNumber || studentNumber.length < 5) return;
    
    setIsValidating(true);
    try {

      const student = allStudents.find(s => s.student_number === studentNumber);
      
      if (student) {
        setCandidateForm(prev => ({
          ...prev,
          firstName: student.first_name,
          lastName: student.last_name,
          course: student.course_name,
          studentNumber: student.student_number
        }));
        setStudentData(student);
        setStudentFound(true);
        toast.success("Student found!");
        setShowSuggestions(false);
      } else {
        setStudentFound(false);
        setStudentData(null);
      }
    } catch (error) {
      console.error("Error validating student:", error);
      setStudentFound(false);
      setStudentData(null);
    } finally {
      setIsValidating(false);
    }
  };

  const handleAddCandidate = async (e) => {
    e.preventDefault();

    if (!candidateForm.firstName || !candidateForm.lastName || !candidateForm.course || !candidateForm.studentNumber) {
      toast.error("Please fill in all required candidate fields");
      return;
    }

    if (candidates.some(c => c.student_number === candidateForm.studentNumber)) {
      toast.error("A candidate with this student number already exists");
      return;
    }

    setIsLoading(true);
    try {
      const newCandidate = {
        id: Date.now().toString(),
        partylist_id: partylist.id,
        student_id: studentData?.id,
        first_name: candidateForm.firstName,
        last_name: candidateForm.lastName,
        student_number: candidateForm.studentNumber,
        course: candidateForm.course,
        position: candidateForm.position,
        is_representative: candidateForm.isRepresentative
      };
      
      setCandidates(prev => [...prev, newCandidate]);
      toast.success("Candidate added successfully");
      
      setCandidateForm({
        studentNumber: "",
        firstName: "",
        lastName: "",
        course: "",
        position: "",
        isRepresentative: false
      });
      setIsAddingCandidate(false);
      setStudentFound(false);
      setStudentData(null);
    } catch (error) {
      console.error("Error adding candidate:", error);
      toast.error("Failed to add candidate");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRemoveCandidate = async (candidateId, candidateName) => {
    if (!window.confirm(`Are you sure you want to remove this candidate?`)) return;
    
    setIsLoading(true);
    try {

      setCandidates(prev => prev.filter(c => c.id !== candidateId));
      toast.success("Candidate removed successfully");
    } catch (error) {
      console.error("Error removing candidate:", error);
      toast.error("Failed to remove candidate");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCandidateInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    setCandidateForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    if (name === 'studentNumber') {
 
      if (value.length >= 4) {
  
        fetchStudentSuggestions(value);
      } else {
        setShowSuggestions(false);
        setStudentSuggestions([]);
      }

      if (value === '') {
        setCandidateForm(prev => ({
          ...prev,
          firstName: "",
          lastName: "",
          course: ""
        }));
        setStudentFound(false);
        setStudentData(null);
      }
    }
  };

  const selectStudentSuggestion = (student) => {
    setCandidateForm(prev => ({
      ...prev,
      studentNumber: student.student_number,
      firstName: student.first_name,
      lastName: student.last_name,
      course: student.course_name
    }));
    setStudentData(student);
    setStudentFound(true);
    setShowSuggestions(false);
  };

  const getCandidatesByPosition = () => {
    const positionGroups = {};
    const representatives = [];
    
    if (!candidates || candidates.length === 0) {
      return { positionGroups, representatives };
    }
    
    candidates.forEach(candidate => {
      if (candidate.is_representative) {
        representatives.push(candidate);
      } else if (candidate.position) {
        if (!positionGroups[candidate.position]) {
          positionGroups[candidate.position] = [];
        }
        positionGroups[candidate.position].push(candidate);
      }
    });
    
    return { positionGroups, representatives };
  };
  
  const { positionGroups, representatives } = getCandidatesByPosition();

  return (
    <div>
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 rounded-full border-t-transparent"></div>
        </div>
      )}
      
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
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">Student Number </label>
                      <div className="flex relative">
                        <input
                          type="text"
                          name="studentNumber"
                          value={candidateForm.studentNumber}
                          onChange={handleCandidateInputChange}
                          className={`w-full p-2 border rounded text-black ${studentFound ? 'border-green-500' : ''}`}
                          required
                          placeholder="Enter student number"
                          autoComplete="off"
                        />
                        {isValidating && <div className="ml-2 flex items-center">
                          <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                        </div>}
                        
                        {showSuggestions && studentSuggestions.length > 0 && (
                          <div className="absolute z-10 mt-10 w-full bg-white shadow-lg rounded-md border max-h-60 overflow-y-auto">
                            {studentSuggestions.map(student => {
                              const isExactMatch = student.student_number === candidateForm.studentNumber;
                              return (
                                <div 
                                  key={student.id} 
                                  className={`p-2 hover:bg-gray-100 cursor-pointer border-b ${isExactMatch ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}
                                  onClick={() => selectStudentSuggestion(student)}
                                >
                                  <div className="font-medium text-black">{student.student_number}</div>
                                  <div className="text-sm text-gray-600">{student.first_name} {student.last_name} - {student.course_name}</div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">First Name </label>
                      <input
                        type="text"
                        name="firstName"
                        value={candidateForm.firstName}
                        onChange={handleCandidateInputChange}
                        className="w-full p-2 border rounded text-black"
                        required
                        readOnly={studentFound}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">Last Name </label>
                      <input
                        type="text"
                        name="lastName"
                        value={candidateForm.lastName}
                        onChange={handleCandidateInputChange}
                        className="w-full p-2 border rounded text-black"
                        required
                        readOnly={studentFound}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">Course </label>
                      <input
                        type="text"
                        name="course"
                        value={candidateForm.course}
                        onChange={handleCandidateInputChange}
                        className="w-full p-2 border rounded text-black"
                        required
                        readOnly={studentFound}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">Position</label>
                      <select
                        name="position"
                        value={candidateForm.position}
                        onChange={handleCandidateInputChange}
                        className="w-full p-2 border rounded text-black"
                        disabled={candidateForm.isRepresentative}
                      >
                        {positions.map(pos => (
                          <option key={pos.id} value={pos.name}>
                            {pos.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center mt-6">
                      <input
                        type="checkbox"
                        id="isRepresentative"
                        name="isRepresentative"
                        checked={candidateForm.isRepresentative}
                        onChange={handleCandidateInputChange}
                        className="mr-2"
                      />
                      <label htmlFor="isRepresentative" className="text-sm font-medium text-black">
                        Representative Only
                      </label>
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
                      className={`px-4 py-2 ${studentFound ? 'bg-green-600' : 'bg-blue-600'} text-white rounded hover:${studentFound ? 'bg-green-700' : 'bg-blue-700'}`}
                      disabled={isValidating}
                    >
                      Add Candidate
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="bg-white border rounded-lg overflow-hidden">
              {candidates.length === 0 ? (
                <div className="px-4 py-4 text-center text-sm text-black">
                  No candidates added yet
                </div>
              ) : (
                <div>
                  {/* Display candidates by position */}
                  {Object.entries(positionGroups).map(([position, positionCandidates]) => (
                    <div key={position} className="mb-6">
                      <h4 className="px-4 py-2 bg-gray-100 font-medium text-black">{position}</h4>
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
                          {positionCandidates.map(candidate => (
                            <tr key={candidate.id}>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {candidate.first_name} {candidate.last_name}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-black">
                                {candidate.student_number}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-black">
                                {candidate.course}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <button
                                  onClick={() => handleRemoveCandidate(candidate.id, `${candidate.first_name} ${candidate.last_name}`)}
                                  className="w-20 h-8 bg-red-500 text-white rounded hover:bg-red-600 font-medium text-xs inline-flex items-center justify-center"
                                  disabled={isLoading}
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                  
                  {/* Display representatives */}
                  {representatives.length > 0 && (
                    <div className="mb-6">
                      <h4 className="px-4 py-2 bg-gray-100 font-medium text-black">Representatives</h4>
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
                          {representatives.map(candidate => (
                            <tr key={candidate.id}>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {candidate.first_name} {candidate.last_name}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-black">
                                {candidate.student_number}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-black">
                                {candidate.course}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <button
                                  onClick={() => handleRemoveCandidate(candidate.id, `${candidate.first_name} ${candidate.last_name}`)}
                                  className="w-20 h-8 bg-red-500 text-white rounded hover:bg-red-600 font-medium text-xs inline-flex items-center justify-center"
                                  disabled={isLoading}
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartylistDetails; 