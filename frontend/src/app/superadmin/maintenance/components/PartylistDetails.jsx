"use client";
import { useState, useEffect } from 'react';
import { toast } from "react-toastify";
import axios from 'axios';
import Cookies from "js-cookie";
import { useDropzone } from 'react-dropzone';
import { X, Upload, Image as ImageIcon } from "lucide-react";

const API_BASE = '/api';
const BASE_URL = '';

function formatNameSimple(lastName, firstName, fallback) {
  const cap = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';
  if ((!lastName && !firstName) && fallback) {
    const words = fallback.trim().split(/\s+/);
    if (words.length === 1) {
      return cap(words[0]);
    } else {
      const last = cap(words[words.length - 1]);
      const first = words.slice(0, -1).map(cap).join(' ');
      return `${last}, ${first}`;
    }
  }
  if (!lastName && !firstName) return 'No Name';
  return `${cap(lastName)}, ${cap(firstName)}`;
}

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
    isRepresentative: false,
    image: null
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
  const [takenPositions, setTakenPositions] = useState([]);
  const [studentValidationError, setStudentValidationError] = useState('');
  const [allPartylistCandidates, setAllPartylistCandidates] = useState([]);
  const [firstNameSuggestions, setFirstNameSuggestions] = useState([]);
  const [lastNameSuggestions, setLastNameSuggestions] = useState([]);
  const [showFirstNameSuggestions, setShowFirstNameSuggestions] = useState(false);
  const [showLastNameSuggestions, setShowLastNameSuggestions] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [batchResults, setBatchResults] = useState(null);
  const [candidateFormPreview, setCandidateFormPreview] = useState(null);
  const [imagePreviews, setImagePreviews] = useState({});
  const [errors, setErrors] = useState({});
  const [pendingImages, setPendingImages] = useState({});
  const [savingImages, setSavingImages] = useState({});

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1,
    onDrop: acceptedFiles => {
      setSelectedFile(acceptedFiles[0]);
      setUploadStatus(null);
      setBatchResults(null);
    }
  });

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setUploadStatus(null);
    setBatchResults(null);
  };

  useEffect(() => {
    if (positions.length > 0) {

      setCandidateForm(prev => ({
        ...prev,
        position: ""
      }));
    }
  }, [positions]);

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
    if (partylist && partylist.id) {
      fetchPartylistCandidates(partylist.id);
    }
  }, [partylist]);

  const fetchAllStudents = async () => {
    try {
      const token = Cookies.get("token");
      const res = await axios.get("/api/superadmin/students", {
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
      const token = Cookies.get("token");
      const response = await axios.get(`/api/partylists/${partylistId}/candidates`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      
      if (response.data && response.data.success) {
        const candidatesData = response.data.candidates || [];
        setCandidates(candidatesData);

        const taken = candidatesData
          .filter(c => !c.is_representative && c.position)
          .map(c => c.position);

        setTakenPositions(taken);
      } else {
        setCandidates([]);
        setTakenPositions([]);
      }
    } catch (error) {
      console.error("Error fetching candidates:", error);
      toast.error("Failed to load candidates");
      setCandidates([]);
      setTakenPositions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPositions = async () => {
    try {
      const token = Cookies.get("token");
    
      const electionTypesResponse = await axios.get("/api/maintenance/election-types", {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      
      let studentCouncilElectionTypeId = null;
      
      if (electionTypesResponse.data && electionTypesResponse.data.data) {

        const studentCouncilType = electionTypesResponse.data.data.find(
          type => type.name.toLowerCase().includes('student council') || type.name.toLowerCase().includes('student body')
        );
        
        if (studentCouncilType) {
          studentCouncilElectionTypeId = studentCouncilType.id;
        }
      }

      if (!studentCouncilElectionTypeId) {
        studentCouncilElectionTypeId = 1;
      }
      
      const response = await axios.get(`/api/direct/positions?electionTypeId=${studentCouncilElectionTypeId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data && response.data.success && response.data.data) {
        const positionsData = response.data.data;
      
        setPositions(positionsData);
      } else {
        tryLocalStorageFallback(studentCouncilElectionTypeId);
      }
    } catch (error) {
      console.error("Error fetching positions:", error);
      tryLocalStorageFallback();
    }
  };
  
  const tryLocalStorageFallback = (electionTypeId = 1) => {
    try {
      console.log("Trying localStorage fallback for positions");
      const positionsData = JSON.parse(localStorage.getItem('electionPositions') || '{}');

      let storedPositions = positionsData[electionTypeId] || [];

      if (storedPositions.length === 0 && electionTypeId !== 1) {
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
        student => student.student_number.includes(searchTerm)
      ).slice(0, 10); 
      
      setStudentSuggestions(matchingStudents);
      setShowSuggestions(matchingStudents.length > 0);

      const exactMatch = matchingStudents.find(s => s.student_number === searchTerm);
      if (exactMatch) {

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

  const validateStudentExists = (firstName, lastName) => {
    const studentExists = allStudents.some(student => 
      student.first_name.toLowerCase() === firstName.toLowerCase() && 
      student.last_name.toLowerCase() === lastName.toLowerCase()
    );
    
    if (!studentExists) {
      setStudentValidationError('This student is not in the student list');
      return false;
    }
    
    setStudentValidationError('');
    return true;
  };

  const handleCandidateChange = async (posId, candId, field, value) => {
    if (field === "party") {
      return;
    }
    
    const updatedPositions = ballot.positions.map(pos => ({
      ...pos,
      candidates: pos.candidates.map(cand => 
        cand.id === candId ? { ...cand, [field]: value } : cand
      )
    }));
    
    setBallot(prev => ({ ...prev, positions: updatedPositions }));

    if (field === 'first_name' || field === 'last_name') {
      const candidate = updatedPositions.find(pos => 
        pos.candidates.some(c => c.id === candId)
      )?.candidates.find(c => c.id === candId);
      
      if (candidate && candidate.first_name && candidate.last_name) {
        validateStudentExists(candidate.first_name, candidate.last_name);
      }
    }
    
    try {
      if (ballot.id && field !== '_pendingImage') {
        await updateCandidate(candId, { [field]: value });
      }
    } catch (error) {
      setApiError(`Failed to update candidate: ${error.message}`);
    }
  };

  const fetchAllPartylistCandidates = async () => {
    try {
      const token = Cookies.get("token");

      const partylistsResponse = await axios.get(
        "/api/partylists",
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );

      if (!partylistsResponse.data || !partylistsResponse.data.success) {
        console.error("Failed to fetch partylists");
        return;
      }

      const allCandidates = [];
      for (const party of partylistsResponse.data.data) {
        try {
          const candidatesResponse = await axios.get(
            `/api/partylists/${party.id}/candidates`,
            {
              headers: { Authorization: `Bearer ${token}` },
              withCredentials: true,
            }
          );

          if (candidatesResponse.data && candidatesResponse.data.success) {
            const candidates = candidatesResponse.data.candidates || [];
            allCandidates.push(...candidates);
          }
        } catch (error) {
          console.error(`Error fetching candidates for partylist ${party.id}:`, error);

          continue;
        }
      }

      setAllPartylistCandidates(allCandidates);
    } catch (error) {
      console.error("Error fetching partylists:", error);
      toast.error("Failed to load partylist candidates. Some data may be incomplete.");

      setAllPartylistCandidates([]);
    }
  };

  useEffect(() => {
    fetchAllPartylistCandidates();
  }, []);

  const isStudentAlreadyCandidate = (studentNumber) => {
    if (!studentNumber) return false;
    
    const existingCandidate = allPartylistCandidates.find(candidate => 
      candidate.student_number === studentNumber && 
      candidate.partylist_id !== partylist.id
    );

    if (existingCandidate) {
      console.log('Found existing candidate:', existingCandidate);
      return true;
    }
    return false;
  };

  const validateStudentForPartylist = async (studentNumber) => {
    if (!studentNumber) return false;

    const isAlreadyCandidate = allPartylistCandidates.some(candidate => 
      candidate.student_number === studentNumber && 
      candidate.partylist_id !== partylist.id
    );

    if (isAlreadyCandidate) {
      return false;
    }

    return true;
  };

  const checkExistingCandidateByName = (firstName, lastName) => {
    if (!firstName || !lastName) return false;
    
    return allPartylistCandidates.some(candidate => 
      candidate.first_name.toLowerCase() === firstName.toLowerCase() && 
      candidate.last_name.toLowerCase() === lastName.toLowerCase() &&
      candidate.partylist_id !== partylist.id
    );
  };

  const fetchNameSuggestions = (searchTerm, type) => {
    if (!searchTerm || searchTerm.length < 2) {
      if (type === 'firstName') {
        setFirstNameSuggestions([]);
        setShowFirstNameSuggestions(false);
      } else {
        setLastNameSuggestions([]);
        setShowLastNameSuggestions(false);
      }
      return;
    }
    
    try {
      const matchingStudents = allStudents.filter(student => {
        if (type === 'firstName') {
          return student.first_name.toLowerCase().includes(searchTerm.toLowerCase());
        } else {
          return student.last_name.toLowerCase().includes(searchTerm.toLowerCase());
        }
      }).slice(0, 10);

      if (type === 'firstName') {
        setFirstNameSuggestions(matchingStudents);
        setShowFirstNameSuggestions(matchingStudents.length > 0);
      } else {
        setLastNameSuggestions(matchingStudents);
        setShowLastNameSuggestions(matchingStudents.length > 0);
      }
    } catch (error) {
      console.error("Error filtering name suggestions:", error);
      if (type === 'firstName') {
        setFirstNameSuggestions([]);
        setShowFirstNameSuggestions(false);
      } else {
        setLastNameSuggestions([]);
        setShowLastNameSuggestions(false);
      }
    }
  };

  const selectNameSuggestion = (student, type) => {
    setCandidateForm(prev => ({
      ...prev,
      studentNumber: student.student_number,
      firstName: student.first_name,
      lastName: student.last_name,
      course: student.course_name,
      position: ""
    }));
    setStudentData(student);
    setStudentFound(true);
    
    if (type === 'firstName') {
      setShowFirstNameSuggestions(false);
    } else {
      setShowLastNameSuggestions(false);
    }
  };

  const handleCandidateInputChange = async (e) => {
    const { name, value, type, checked } = e.target;

    setCandidateForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    if (name === 'studentNumber') {
      if (value.length >= 4) {
        fetchStudentSuggestions(value);
        
        if (isStudentAlreadyCandidate(value)) {
          toast.warning("This student is already registered as a candidate in another partylist");
          return;
        }
      } else {
        setShowSuggestions(false);
        setStudentSuggestions([]);
      }

      if (value === '') {
        setCandidateForm(prev => ({
          ...prev,
          firstName: "",
          lastName: "",
          course: "",
          position: ""
        }));
        setStudentFound(false);
        setStudentData(null);
      }
    } else if (name === 'firstName') {
      fetchNameSuggestions(value, 'firstName');
 
      if (value && candidateForm.lastName) {
        if (checkExistingCandidateByName(value, candidateForm.lastName)) {
          toast.warning("A candidate with this name is already registered in another partylist");
          setStudentValidationError("This student is already registered as a candidate in another partylist");
        } else {
          setStudentValidationError('');
        }
      }
    } else if (name === 'lastName') {
      fetchNameSuggestions(value, 'lastName');
 
      if (value && candidateForm.firstName) {
        if (checkExistingCandidateByName(candidateForm.firstName, value)) {
          toast.warning("A candidate with this name is already registered in another partylist");
          setStudentValidationError("This student is already registered as a candidate in another partylist");
        } else {
          setStudentValidationError('');
        }
      }
    } else if (name === 'isRepresentative') {
      setCandidateForm(prev => ({
        ...prev,
        position: ""
      }));
    }
  };

  const handleCandidateFormImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.match('image.*')) {
        setErrors(prev => ({
          ...prev,
          candidateFormImage: 'Please select a valid image file'
        }));
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        setErrors(prev => ({
          ...prev,
          candidateFormImage: 'Image must be less than 2MB'
        }));
        return;
      }

      setCandidateForm(prev => ({ ...prev, image: file }));
      setCandidateFormPreview(URL.createObjectURL(file));
      
      // Clear any previous errors
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.candidateFormImage;
        return newErrors;
      });
    }
  };

  const handleAddCandidate = async (e) => {
    e.preventDefault();

    if (!candidateForm.firstName || !candidateForm.lastName || !candidateForm.course || !candidateForm.studentNumber) {
      toast.error("Please fill in all required candidate fields");
      return;
    }

    if (!validateStudentExists(candidateForm.firstName, candidateForm.lastName)) {
      toast.error("This student is not in the student list");
      return;
    }

    if (isStudentAlreadyCandidate(candidateForm.studentNumber)) {
      toast.error("This student is already registered as a candidate in another partylist");
      return;
    }

    if (checkExistingCandidateByName(candidateForm.firstName, candidateForm.lastName)) {
      toast.error("A candidate with this name is already registered in another partylist");
      return;
    }

    if (candidates.some(c => c.student_number === candidateForm.studentNumber)) {
      toast.error("A candidate with this student number already exists in this partylist");
      return;
    }

    if (!candidateForm.isRepresentative && takenPositions.includes(candidateForm.position)) {
      toast.error("This position is already taken");
      return;
    }

    setIsLoading(true);
    try {
      const token = Cookies.get("token");
      let imageUrl = null;

      // Upload image if provided
      if (candidateForm.image) {
        const formData = new FormData();
        formData.append('image', candidateForm.image);

        const imageResponse = await axios.post(
          `${API_BASE}/partylist-candidates/upload-image`,
          formData,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            }
          }
        );

        if (imageResponse.data.success) {
          imageUrl = imageResponse.data.filePath;
        }
      }

      const requestData = {
        studentId: studentData?.id,
        firstName: candidateForm.firstName,
        lastName: candidateForm.lastName,
        studentNumber: candidateForm.studentNumber,
        course: candidateForm.course,
        position: candidateForm.position,
        isRepresentative: candidateForm.isRepresentative,
        imageUrl
      };
      
      console.log('Adding candidate with data:', requestData);
      
      const response = await axios.post(
        `/api/partylists/${partylist.id}/candidates`, 
        requestData,
        {
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}` 
          },
          withCredentials: true
        }
      );
      
      if (response.data && response.data.success) {
        toast.success("Candidate added successfully");
        
        // Reset form
        setCandidateForm({
          studentNumber: "",
          firstName: "",
          lastName: "",
          course: "",
          position: "",
          isRepresentative: false,
          image: null
        });
        setCandidateFormPreview(null);
        setIsAddingCandidate(false);
        setStudentFound(false);
        setStudentData(null);
        setStudentValidationError('');

        await Promise.all([
          fetchPartylistCandidates(partylist.id),
          fetchAllPartylistCandidates()
        ]);
      } else {
        toast.error(response.data?.message || "Failed to add candidate");
      }
    } catch (error) {
      console.error("Error adding candidate:", error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to add candidate. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRemoveCandidate = async (candidateId, candidateName) => {
    if (!window.confirm(`Are you sure you want to remove this candidate?`)) return;
    
    setIsLoading(true);
    try {
      const token = Cookies.get("token");
      const response = await axios.delete(`/api/candidates/${candidateId}`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
      
      if (response.data && response.data.success) {
        toast.success("Candidate removed successfully");

        fetchPartylistCandidates(partylist.id);
      } else {
        toast.error(response.data?.message || "Failed to remove candidate");
      }
    } catch (error) {
      console.error("Error removing candidate:", error);
      toast.error(error.response?.data?.message || "Failed to remove candidate");
    } finally {
      setIsLoading(false);
    }
  };

  const selectStudentSuggestion = async (student) => {

    if (isStudentAlreadyCandidate(student.student_number)) {
      toast.error("This student is already registered as a candidate in another partylist");
      return;
    }

    if (checkExistingCandidateByName(student.first_name, student.last_name)) {
      toast.error("A candidate with this name is already registered in another partylist");
      return;
    }

    setCandidateForm(prev => ({
      ...prev,
      studentNumber: student.student_number,
      firstName: student.first_name,
      lastName: student.last_name,
      course: student.course_name,
      position: ""
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

    positions.forEach(position => {
      positionGroups[position.name] = [];
    });
    
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

  const positionOrder = [
    'President',
    'Vice President',
    'Secretary',
    'Treasurer',
    'Auditor',
    'PRO'
  ];

  const handleImageUpload = async (candidateId, file) => {
    try {
      if (!file || !file.type.match('image.*')) {
        setErrors(prev => ({
          ...prev,
          [`candidate_${candidateId}_image`]: 'Please select a valid image file'
        }));
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        setErrors(prev => ({
          ...prev,
          [`candidate_${candidateId}_image`]: 'Image must be less than 2MB'
        }));
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      setImagePreviews(prev => ({
        ...prev,
        [candidateId]: previewUrl
      }));

      // Store the file for later saving
      setPendingImages(prev => ({
        ...prev,
        [candidateId]: file
      }));

      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`candidate_${candidateId}_image`];
        return newErrors;
      });

    } catch (error) {
      console.error('Error handling image upload:', error);
      setErrors(prev => ({
        ...prev,
        [`candidate_${candidateId}_image`]: error.message || 'Failed to handle image'
      }));

      setImagePreviews(prev => {
        const newPreviews = { ...prev };
        delete newPreviews[candidateId];
        return newPreviews;
      });
    }
  };

  const saveCandidateImage = async (candidateId) => {
    const file = pendingImages[candidateId];
    if (!file) return;

    setSavingImages(prev => ({ ...prev, [candidateId]: true }));

    try {
      const formData = new FormData();
      formData.append('image', file);

      const token = Cookies.get('token');
      const imageResponse = await axios.post(
        `${API_BASE}/partylist-candidates/upload-image`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        }
      );

      if (!imageResponse.data.success || !imageResponse.data.filePath) {
        throw new Error('Failed to upload image');
      }

      // Update candidate with new image URL
      await axios.put(
        `${API_BASE}/partylist-candidates/candidates/${candidateId}`,
        { imageUrl: imageResponse.data.filePath },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Update local state
      setCandidates(prev => 
        prev.map(cand => 
          cand.id === candidateId 
            ? { ...cand, image_url: imageResponse.data.filePath }
            : cand
        )
      );

      // Clear pending image and preview
      setPendingImages(prev => {
        const newPending = { ...prev };
        delete newPending[candidateId];
        return newPending;
      });

      setImagePreviews(prev => {
        const newPreviews = { ...prev };
        delete newPreviews[candidateId];
        return newPreviews;
      });

      toast.success("Image saved successfully!");

    } catch (error) {
      console.error('Error saving image:', error);
      setErrors(prev => ({
        ...prev,
        [`candidate_${candidateId}_image`]: error.message || 'Failed to save image'
      }));
      toast.error("Failed to save image. Please try again.");
    } finally {
      setSavingImages(prev => ({ ...prev, [candidateId]: false }));
    }
  };

  const cancelImageUpload = (candidateId) => {
    // Clear pending image and preview
    setPendingImages(prev => {
      const newPending = { ...prev };
      delete newPending[candidateId];
      return newPending;
    });

    setImagePreviews(prev => {
      const newPreviews = { ...prev };
      delete newPreviews[candidateId];
      return newPreviews;
    });

    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[`candidate_${candidateId}_image`];
      return newErrors;
    });
  };

  const renderCandidateRow = (candidate) => (
    <div key={candidate.id} className="px-4 py-3 border-b border-gray-100 hover:bg-gray-50">
      <div className="grid grid-cols-12 gap-4 items-center">
        {/* Photo */}
        <div className="col-span-2">
          <label className="block w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 overflow-hidden cursor-pointer hover:border-blue-500 transition-colors relative group">
            {imagePreviews[candidate.id] ? (
              <div className="w-full h-full relative">
                <img 
                  src={imagePreviews[candidate.id]} 
                  alt="Candidate preview" 
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Upload className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ) : candidate.image_url ? (
              <div className="w-full h-full relative">
                <img 
                  src={`${BASE_URL}${candidate.image_url}`}
                  alt={`${candidate.first_name} ${candidate.last_name}`}
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => {
                    console.error(`Error loading image: ${candidate.image_url}`);
                    e.target.src = '/default-candidate.png';
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Upload className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                <ImageIcon className="w-4 h-4 mb-1" />
                <span className="text-xs">Upload</span>
              </div>
            )}
            <input
              type="file"
              accept="image/jpeg, image/png, image/webp"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleImageUpload(candidate.id, e.target.files[0]);
                }
              }}
            />
          </label>
          {errors[`candidate_${candidate.id}_image`] && (
            <p className="text-red-500 text-xs mt-1">{errors[`candidate_${candidate.id}_image`]}</p>
          )}
        </div>

        {/* Name */}
        <div className="col-span-3">
          <div className="text-sm font-medium text-gray-900">
            {formatNameSimple(candidate.last_name, candidate.first_name)}
          </div>
        </div>

        {/* Student Number */}
        <div className="col-span-2">
          <div className="text-sm text-gray-600">
            {candidate.student_number}
          </div>
        </div>

        {/* Course */}
        <div className="col-span-3">
          <div className="text-sm text-gray-600">
            {candidate.course}
          </div>
        </div>

        {/* Actions */}
        <div className="col-span-2 text-center">
          <div className="flex flex-col space-y-1">
            {/* Save/Cancel buttons for pending images */}
            {pendingImages[candidate.id] && (
              <div className="flex space-x-1">
                <button
                  onClick={() => saveCandidateImage(candidate.id)}
                  disabled={savingImages[candidate.id]}
                  className="w-12 h-6 bg-green-500 text-white rounded hover:bg-green-600 font-medium text-xs inline-flex items-center justify-center disabled:bg-green-300"
                >
                  {savingImages[candidate.id] ? '...' : 'Save'}
                </button>
                <button
                  onClick={() => cancelImageUpload(candidate.id)}
                  disabled={savingImages[candidate.id]}
                  className="w-12 h-6 bg-gray-500 text-white rounded hover:bg-gray-600 font-medium text-xs inline-flex items-center justify-center disabled:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            )}
            
            {/* Remove button */}
            <button
              onClick={() => handleRemoveCandidate(candidate.id, `${candidate.first_name} ${candidate.last_name}`)}
              className="w-16 h-7 bg-red-500 text-white rounded hover:bg-red-600 font-medium text-xs inline-flex items-center justify-center"
              disabled={isLoading || savingImages[candidate.id]}
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {isLoading && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 rounded-full border-t-transparent"></div>
        </div>
      )}
      
      <div className="flex justify-between items-center mb-6">
        {/*
          <h2 className="text-xl font-semibold text-black">Partylist: {partylist.name}</h2>
        */}
        <button
          onClick={onClose}
          className="px-3 py-1 text-sm rounded bg-gray-200 text-gray-800 hover:bg-gray-300"
        >
          Back
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
        <div className="md:col-span-3 flex flex-col items-center">
          {partylist.logo_url ? (
            <img 
              src={`${partylist.logo_url}`} 
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
                    onClick={() => setShowBatchModal(true)}
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
                      <label className="block text-sm font-medium text-black mb-1">First Name</label>
                      <div className="relative">
                        <input
                          type="text"
                          name="firstName"
                          value={candidateForm.firstName}
                          onChange={handleCandidateInputChange}
                          className={`w-full p-2 border rounded text-black ${
                            studentValidationError ? "border-red-500" : "border-gray-300"
                          }`}
                          required
                          readOnly={studentFound}
                        />
                        {showFirstNameSuggestions && firstNameSuggestions.length > 0 && (
                          <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border max-h-60 overflow-y-auto">
                            {firstNameSuggestions.map(student => (
                              <div 
                                key={student.id} 
                                className="p-2 hover:bg-gray-100 cursor-pointer border-b"
                                onClick={() => selectNameSuggestion(student, 'firstName')}
                              >
                                <div className="font-medium text-black">{student.first_name} {student.last_name}</div>
                                <div className="text-sm text-gray-600">{student.student_number} - {student.course_name}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {studentValidationError && (
                        <p className="text-red-500 text-sm mt-1">{studentValidationError}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">Last Name</label>
                      <div className="relative">
                        <input
                          type="text"
                          name="lastName"
                          value={candidateForm.lastName}
                          onChange={handleCandidateInputChange}
                          className={`w-full p-2 border rounded text-black ${
                            studentValidationError ? "border-red-500" : "border-gray-300"
                          }`}
                          required
                          readOnly={studentFound}
                        />
                        {showLastNameSuggestions && lastNameSuggestions.length > 0 && (
                          <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border max-h-60 overflow-y-auto">
                            {lastNameSuggestions.map(student => (
                              <div 
                                key={student.id} 
                                className="p-2 hover:bg-gray-100 cursor-pointer border-b"
                                onClick={() => selectNameSuggestion(student, 'lastName')}
                              >
                                <div className="font-medium text-black">{student.first_name} {student.last_name}</div>
                                <div className="text-sm text-gray-600">{student.student_number} - {student.course_name}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
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
                        required={!candidateForm.isRepresentative}
                      >
                        <option value="">Select Position</option>
                        {positions.map(pos => (
                          <option 
                            key={pos.id} 
                            value={pos.name}
                            disabled={takenPositions.includes(pos.name)}
                          >
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
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-black mb-1">Candidate Photo</label>
                      <div className="flex items-center space-x-4">
                        <label className="block w-32 h-32 rounded-lg border-2 border-dashed border-gray-300 overflow-hidden cursor-pointer hover:border-blue-500 transition-colors relative group">
                          {candidateFormPreview ? (
                            <div className="w-full h-full relative">
                              <img 
                                src={candidateFormPreview} 
                                alt="Candidate preview" 
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Upload className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </div>
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                              <ImageIcon className="w-6 h-6 mb-2" />
                              <span className="text-xs">Upload Photo</span>
                            </div>
                          )}
                          <input
                            type="file"
                            accept="image/jpeg, image/png, image/webp"
                            className="hidden"
                            onChange={handleCandidateFormImageChange}
                          />
                        </label>
                        <div className="flex-1">
                          <p className="text-sm text-gray-600 mb-2">
                            Upload a photo for the candidate (optional)
                          </p>
                          {errors.candidateFormImage && (
                            <p className="text-red-500 text-sm">{errors.candidateFormImage}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-2 mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingCandidate(false);
                        setCandidateForm({
                          studentNumber: "",
                          firstName: "",
                          lastName: "",
                          course: "",
                          position: "",
                          isRepresentative: false,
                          image: null
                        });
                        setCandidateFormPreview(null);
                      }}
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
                  {Object.entries(positionGroups)
                    .filter(([_, candidates]) => candidates.length > 0)
                    .sort(([posA], [posB]) => {
                      const indexA = positionOrder.indexOf(posA);
                      const indexB = positionOrder.indexOf(posB);
                      return indexA - indexB;
                    })
                    .map(([position, positionCandidates]) => (
                      <div key={position} className="mb-6">
                        <h4 className="px-4 py-2 bg-gray-100 font-bold text-black">{position}</h4>
                        
                        {/* Header labels */}
                        <div className="px-4 py-3 bg-gray-50 border-b">
                          <div className="grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-2 text-xs font-medium text-black uppercase tracking-wider">
                              Photo
                            </div>
                            <div className="col-span-3 text-xs font-medium text-black uppercase tracking-wider">
                              Name
                            </div>
                            <div className="col-span-2 text-xs font-medium text-black uppercase tracking-wider">
                              Student Number
                            </div>
                            <div className="col-span-3 text-xs font-medium text-black uppercase tracking-wider">
                              Course
                            </div>
                            <div className="col-span-2 text-xs font-medium text-black uppercase tracking-wider text-center">
                              Actions
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          {positionCandidates.map(candidate => renderCandidateRow(candidate))}
                        </div>
                      </div>
                    ))}
                  
                  {/* Display representatives only if there are any */}
                  {representatives.length > 0 && (
                    <div className="mb-6">
                      <h4 className="px-4 py-2 bg-gray-100 font-bold text-black">Representatives</h4>
                      
                      {/* Header labels for representatives */}
                      <div className="px-4 py-3 bg-gray-50 border-b">
                        <div className="grid grid-cols-12 gap-4 items-center">
                          <div className="col-span-2 text-xs font-medium text-gray-600 uppercase tracking-wider">
                            Photo
                          </div>
                          <div className="col-span-3 text-xs font-medium text-gray-600 uppercase tracking-wider">
                            Name
                          </div>
                          <div className="col-span-2 text-xs font-medium text-gray-600 uppercase tracking-wider">
                            Student #
                          </div>
                          <div className="col-span-3 text-xs font-medium text-gray-600 uppercase tracking-wider">
                            Course
                          </div>
                          <div className="col-span-2 text-xs font-medium text-gray-600 uppercase tracking-wider text-center">
                            Actions
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {representatives.map(candidate => renderCandidateRow(candidate))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showBatchModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl">
            <h2 className="text-xl font-bold mb-4 text-black">Batch Upload Candidates</h2>
            
            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed p-8 text-center cursor-pointer ${
                isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              }`}
            >
              <input {...getInputProps()} />
              {isDragActive ? (
                <p>Drop the Excel file here...</p>
              ) : (
                <p className="text-black">Drag & drop an Excel file here, or click to select a file</p>
              )}
            </div>

            {selectedFile && (
              <div className="mt-4 p-4 bg-gray-50 rounded border">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-black">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <button 
                    onClick={clearSelectedFile}
                    className="text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
                
                {!uploadStatus && (
                  <button
                    className="mt-4 bg-blue-600 text-white px-4 py-2 rounded w-full"
                  >
                    Upload File
                  </button>
                )}
              </div>
            )}

            {uploadStatus === 'uploading' && (
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-center mt-2">Uploading: {uploadProgress}%</p>
              </div>
            )}

            {uploadStatus === 'success' && batchResults && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
                <h3 className="font-bold text-black">Upload Complete!</h3>
                <p className="text-black">Total: {batchResults.total}</p>
                <p className="text-black">Success: {batchResults.success}</p>
                <p className="text-black">Failed: {batchResults.failed}</p>
                
                {batchResults.failed > 0 && (
                  <div className="mt-2">
                    <h4 className="font-bold">Errors:</h4>
                    <div className="max-h-60 overflow-y-auto border border-gray-200 rounded p-2 bg-white">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-2 py-1">Row</th>
                            <th className="px-2 py-1">Candidate</th>
                            <th className="px-2 py-1">Error</th>
                          </tr>
                        </thead>
                        <tbody>
                          {batchResults.errors.map((error, index) => (
                            <tr key={index} className="border-b border-gray-100">
                              <td className="px-2 py-1">{error.row || 'N/A'}</td>
                              <td className="px-2 py-1">
                                {error.lastName}, {error.firstName}
                                <div className="text-xs text-gray-500">{error.studentNumber}</div>
                              </td>
                              <td className="px-2 py-1 text-red-600">{error.error}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                      Note: Rows with errors were skipped, but valid rows were still processed.
                    </p>
                  </div>
                )}
              </div>
            )}

            {uploadStatus === 'error' && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
                <h3 className="font-bold text-red-800">Upload Failed</h3>
                <p className="text-red-700">{batchResults?.message || 'An error occurred during upload'}</p>
                
                {batchResults?.errors && batchResults.errors.length > 0 && (
                  <div className="mt-2">
                    <h4 className="font-bold text-red-800">Error Details:</h4>
                    <div className="max-h-60 overflow-y-auto border border-red-200 rounded p-2 bg-white">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-red-50">
                          <tr>
                            <th className="px-2 py-1">Row</th>
                            <th className="px-2 py-1">Candidate</th>
                            <th className="px-2 py-1">Error</th>
                          </tr>
                        </thead>
                        <tbody>
                          {batchResults.errors.map((error, index) => (
                            <tr key={index} className="border-b border-red-50">
                              <td className="px-2 py-1">{error.row || 'N/A'}</td>
                              <td className="px-2 py-1">
                                {error.lastName}, {error.firstName}
                                <div className="text-xs text-gray-500">{error.studentNumber}</div>
                              </td>
                              <td className="px-2 py-1 text-red-600">{error.error}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="mt-2 text-sm text-red-700">
                      Please fix these errors and try uploading again.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end mt-4 gap-2">
              <button 
                onClick={() => {
                  setShowBatchModal(false);
                  setSelectedFile(null);
                  setUploadStatus(null);
                  setBatchResults(null);
                }} 
                className="bg-gray-500 text-white px-4 py-2 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartylistDetails; 