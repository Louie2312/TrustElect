"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, AlertCircle, CheckCircle, InfoIcon } from 'lucide-react';
import { toast } from "react-toastify";
import Cookies from "js-cookie";
import axios from "axios";

export default function EditElectionPage() {
  const router = useRouter();
  const params = useParams();
  const electionId = params.id;

  const [loading, setLoading] = useState({
    initial: true,
    saving: false,
    eligibility: false
  });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [electionData, setElectionData] = useState({
    title: "",
    description: "",
    election_type: "",
    date_from: "",
    date_to: "",
    start_time: "",
    end_time: "",
    status: "",
    eligibleVoters: {
      programs: [],
      yearLevels: [],
      semester: [],
      gender: [],
      precinct: []
    }
  });
  const [maintenanceData, setMaintenanceData] = useState({
    programs: [],
    electionTypes: [],
    yearLevels: [],
    genders: [],
    semesters: [],
    precincts: []
  });
  const [formErrors, setFormErrors] = useState({});
  const [criteriaErrors, setCriteriaErrors] = useState({});
  const [eligibleCount, setEligibleCount] = useState(0);

  // Add helper function to check if all items are selected
  const areAllSelected = (selectedItems, allItems) => {
    if (!selectedItems || !allItems) return false;
    if (selectedItems.length !== allItems.length) return false;
    return selectedItems.length === allItems.length && 
           selectedItems.every(item => allItems.includes(item));
  };

  // Format date to YYYY-MM-DD for date input
  const formatDateForInput = (dateString) => {
    if (!dateString) return "";
    
    try {
      // Make sure we have a valid date string
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      
      // Format to YYYY-MM-DD
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error("Error formatting date:", error, dateString);
      return "";
    }
  };

  // Format time for time input (convert HH:MM:SS or any time format to HH:MM)
  const formatTimeForInput = (timeString) => {
    if (!timeString) return "";
    
    try {
      // Handle both time-only strings and full datetime strings
      if (timeString.includes('T')) {
        // Extract time from datetime
        timeString = timeString.split('T')[1];
      }
      
      // If timeString contains seconds (HH:MM:SS)
      if (timeString.split(':').length > 2) {
        // Return HH:MM format (remove seconds)
        return timeString.substring(0, 5);
      }
      
      // If it's already in HH:MM format
      if (/^\d{2}:\d{2}$/.test(timeString)) {
        return timeString;
      }
      
      // Handle other formats by creating a date object
      const date = new Date(`2000-01-01T${timeString}`);
      if (!isNaN(date.getTime())) {
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
      }
      
      return "";
    } catch (error) {
      console.error("Error formatting time:", error, timeString);
      return "";
    }
  };

  // Fetch election data and form options
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(prev => ({ ...prev, initial: true }));
        
        // Fetch election details
        const token = Cookies.get("token");
        const electionResponse = await axios.get(
          `/api/elections/${electionId}/details`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        if (!electionResponse.data.success) {
          throw new Error(electionResponse.data.message || "Failed to load election");
        }

        const election = electionResponse.data.election;
        
        // Check if election is upcoming - only upcoming elections or those needing approval can be edited
        if (election.status !== 'upcoming' && !election.needs_approval) {
          setError("Only upcoming elections can be edited");
          setLoading(prev => ({ ...prev, initial: false }));
          return;
        }

        // Get eligibility criteria
        let eligibilityResponse;
        try {
          eligibilityResponse = await axios.get(
            `/api/elections/${electionId}/criteria`,
            {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }
          );
        } catch (err) {
          console.error("Error fetching eligibility criteria:", err);
        }

        // Map API response fields to our expected structure
        const criteria = eligibilityResponse?.data?.criteria || {};
        const eligibleVoters = {
          programs: criteria.courses || criteria.programs || [],
          yearLevels: criteria.year_levels || criteria.yearLevels || [],
          gender: criteria.genders || criteria.gender || [],
          semester: criteria.semesters || criteria.semester || [],
          precinct: criteria.precincts || criteria.precinct || []
        };

        // Format dates and times for the form
        const formattedDateFrom = formatDateForInput(election.date_from);
        const formattedDateTo = formatDateForInput(election.date_to);
        const formattedStartTime = formatTimeForInput(election.start_time);
        const formattedEndTime = formatTimeForInput(election.end_time);

        setElectionData({
          title: election.title,
          description: election.description || "",
          election_type: election.election_type,
          date_from: formattedDateFrom,
          date_to: formattedDateTo,
          start_time: formattedStartTime,
          end_time: formattedEndTime,
          status: election.status,
          eligibleVoters
        });

        // Fetch maintenance data (options for dropdowns)
        // Fix: The /api/maintenance/all endpoint doesn't exist
        // Fetch each maintenance type separately
        const endpoints = [
          { key: 'programs', url: 'programs' },
          { key: 'electionTypes', url: 'election-types' },
          { key: 'yearLevels', url: 'year-levels' },
          { key: 'genders', url: 'genders' },
          { key: 'semesters', url: 'semesters' },
          { key: 'precincts', url: 'precincts' }
        ];

        const requests = endpoints.map(endpoint => 
          axios.get(`/api/maintenance/${endpoint.url}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        );

        const responses = await Promise.all(requests);
        
        const maintenanceData = endpoints.reduce((acc, endpoint, index) => {
          acc[endpoint.key] = responses[index].data.data.map(item => item.name);
          return acc;
        }, {});
        
        setMaintenanceData(maintenanceData);

        // Fetch eligible voter count
        fetchEligibleCount(eligibleVoters);
        
      } catch (err) {
        console.error("Error loading election data:", err);
        setError(err.message || "Failed to load election details");
      } finally {
        setLoading(prev => ({ ...prev, initial: false }));
      }
    };

    if (electionId) {
      fetchData();
    }
  }, [electionId]);

  // Update eligible voter count whenever selection changes
  useEffect(() => {
    const hasFilters = Object.values(electionData.eligibleVoters).some(arr => arr.length > 0);
    if (hasFilters) {
      fetchEligibleCount(electionData.eligibleVoters);
    } else {
      setEligibleCount(0);
    }
  }, [electionData.eligibleVoters]);

  // Fetch the eligible voters count based on criteria
  const fetchEligibleCount = async (eligibleVoters) => {
    try {
      setLoading(prev => ({ ...prev, eligibility: true }));
      const token = Cookies.get("token");
      
      // Determine if all options for each category are selected
      const allProgramsSelected = areAllSelected(eligibleVoters.programs, maintenanceData.programs);
      const allYearLevelsSelected = areAllSelected(eligibleVoters.yearLevels, maintenanceData.yearLevels);
      const allGendersSelected = areAllSelected(eligibleVoters.gender, maintenanceData.genders);
      
      // Create a modified eligible voters object to fix the count
      const optimizedEligibleVoters = {
        // If all items are selected, send empty array to backend to indicate "all"
        programs: allProgramsSelected ? [] : eligibleVoters.programs,
        yearLevels: allYearLevelsSelected ? [] : eligibleVoters.yearLevels,
        gender: allGendersSelected ? [] : eligibleVoters.gender,
        semester: eligibleVoters.semester,
        precinct: eligibleVoters.precinct,
      };
      
      const response = await axios.post(
        '/api/elections/preview-voters',
        { eligible_voters: optimizedEligibleVoters },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      setEligibleCount(response.data.count);
    } catch (error) {
      console.error("Error fetching eligible count:", error);
      toast.error("Couldn't update eligible voters count");
    } finally {
      setLoading(prev => ({ ...prev, eligibility: false }));
    }
  };

  // Form validation
  const validateForm = () => {
    const errors = {};
    
    if (!electionData.title) errors.title = "Title is required";
    if (!electionData.date_from) errors.date_from = "Start date is required";
    if (!electionData.date_to) errors.date_to = "End date is required";
    if (new Date(electionData.date_from) > new Date(electionData.date_to)) {
      errors.date_to = "End date must be after start date";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validate voter criteria
  const validateVoterCriteria = () => {
    const newCriteriaErrors = {};
    const { eligibleVoters } = electionData;
    
    if (eligibleVoters.programs.length === 0) newCriteriaErrors.programs = "Select at least one program";
    if (eligibleVoters.yearLevels.length === 0) newCriteriaErrors.yearLevels = "Select at least one year level";
    if (eligibleVoters.gender.length === 0) newCriteriaErrors.gender = "Select at least one gender";
    if (eligibleVoters.semester.length === 0) newCriteriaErrors.semester = "Select a semester";
    
    setCriteriaErrors(newCriteriaErrors);
    return Object.keys(newCriteriaErrors).length === 0;
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setElectionData(prev => ({ ...prev, [name]: value }));
  };

  // Handle checkbox changes for eligibility criteria
  const handleCheckboxChange = (category, value) => {
    setElectionData(prev => {
      // Special handling for semester (radio button behavior)
      if (category === 'semester') {
        return {
          ...prev,
          eligibleVoters: {
            ...prev.eligibleVoters,
            [category]: [value] // Always set as single-item array
          }
        };
      }
      
      // Normal checkbox behavior for other categories
      const currentValues = prev.eligibleVoters[category];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(item => item !== value)
        : [...currentValues, value];
      
      return {
        ...prev,
        eligibleVoters: {
          ...prev.eligibleVoters,
          [category]: newValues
        }
      };
    });

    if (criteriaErrors[category]) {
      setCriteriaErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[category];
        return newErrors;
      });
    }
  };

  // Toggle all checkboxes in a category
  const toggleAll = (category, items) => {
    // Skip semester from the "Select All" functionality
    if (category === 'semester') return;
    
    setElectionData(prev => {
      const isAllSelected = areAllSelected(prev.eligibleVoters[category], items);
      
      return {
        ...prev,
        eligibleVoters: {
          ...prev.eligibleVoters,
          [category]: isAllSelected ? [] : [...items]
        }
      };
    });
    
    if (criteriaErrors[category]) {
      setCriteriaErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[category];
        return newErrors;
      });
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm() || !validateVoterCriteria()) return;

    try {
      setLoading(prev => ({ ...prev, saving: true }));
      setError(null);
      setSuccess(false);
      
      const token = Cookies.get("token");
      
      // First get the current election data to preserve any fields we're not updating
      const currentElectionResponse = await axios.get(
        `/api/elections/${electionId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      const currentElection = currentElectionResponse.data;
      
      // Prepare update payload, only including fields that are part of our form
      // This maintains any other fields that might exist in the database
      const updatePayload = {
        title: electionData.title,
        description: electionData.description,
        election_type: electionData.election_type,
        date_from: electionData.date_from,
        date_to: electionData.date_to,
        start_time: electionData.start_time,
        end_time: electionData.end_time
      };
      
      // Update election basic details
      const updateResponse = await axios.put(
        `/api/elections/${electionId}`,
        updatePayload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      // Get current eligibility criteria to see if it's changed
      const currentCriteriaResponse = await axios.get(
        `/api/elections/${electionId}/criteria`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      const currentCriteria = currentCriteriaResponse.data.criteria || {};
      
      // Check if eligibility criteria has changed
      const hasEligibilityChanged = JSON.stringify({
        programs: electionData.eligibleVoters.programs,
        yearLevels: electionData.eligibleVoters.yearLevels,
        gender: electionData.eligibleVoters.gender,
        semester: electionData.eligibleVoters.semester,
        precinct: electionData.eligibleVoters.precinct
      }) !== JSON.stringify({
        programs: currentCriteria.programs || currentCriteria.courses || [],
        yearLevels: currentCriteria.year_levels || currentCriteria.yearLevels || [],
        gender: currentCriteria.genders || currentCriteria.gender || [],
        semester: currentCriteria.semesters || currentCriteria.semester || [],
        precinct: currentCriteria.precincts || currentCriteria.precinct || []
      });
      
      // Only update eligibility criteria if it's changed
      if (hasEligibilityChanged) {
        // Determine if all options for each category are selected
        const allProgramsSelected = areAllSelected(electionData.eligibleVoters.programs, maintenanceData.programs);
        const allYearLevelsSelected = areAllSelected(electionData.eligibleVoters.yearLevels, maintenanceData.yearLevels);
        const allGendersSelected = areAllSelected(electionData.eligibleVoters.gender, maintenanceData.genders);
        
        // Create the optimized payload
        const optimizedEligibleVoters = {
          programs: allProgramsSelected ? [] : electionData.eligibleVoters.programs,
          yearLevels: allYearLevelsSelected ? [] : electionData.eligibleVoters.yearLevels,
          gender: allGendersSelected ? [] : electionData.eligibleVoters.gender,
          semester: electionData.eligibleVoters.semester,
          precinct: electionData.eligibleVoters.precinct
        };
        
        const eligibilityResponse = await axios.put(
          `/api/elections/${electionId}/criteria`,
          {
            eligibility: optimizedEligibleVoters
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          }
        );
      }
      
      setSuccess(true);
      toast.success('Election updated successfully!');
      
      // Auto redirect after success
      setTimeout(() => {
        router.push(`/admin/election/${electionId}`);
      }, 1500);
      
    } catch (err) {
      console.error("Failed to update election:", err);
      setError(err.response?.data?.message || err.message || "Update failed");
      toast.error(`Failed to update election: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(prev => ({ ...prev, saving: false }));
    }
  };

  if (loading.initial) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white shadow-lg rounded-lg max-w-6xl mx-auto">
      <button 
        onClick={() => router.back()} 
        className="flex items-center text-blue-900 hover:text-blue-700 mb-4"
      >
        <ArrowLeft className="w-6 h-6 mr-2" />
        <span className="font-semibold">Back</span>
      </button>

      <h1 className="text-2xl font-bold mb-6 text-black">Edit Election</h1>
      
      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 flex items-start">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-800">Cannot Edit Election</p>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}
      
      {success && (
        <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 flex items-start">
          <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-green-800">Election Updated</p>
            <p className="text-green-700">Election details have been updated successfully.</p>
          </div>
        </div>
      )}

      {(electionData.status === 'upcoming' || electionData.needs_approval) && !error && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <InfoIcon className="h-5 w-5 text-blue-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  Only changed fields will be updated. All other details will be preserved.
                </p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Election Details */}
            <div className="space-y-4">
              <div>
                <label className="block font-medium text-black mb-1">Election Title*</label>
                <input
                  type="text"
                  name="title"
                  value={electionData.title}
                  onChange={handleChange}
                  className={`border w-full p-2 rounded ${formErrors.title ? 'border-red-500' : 'border-gray-300'} text-black`}
                  placeholder="Student Council Election"
                />
                {formErrors.title && <p className="text-red-500 text-sm mt-1">{formErrors.title}</p>}
              </div>

              <div>
                <label className="block font-medium text-black mb-1">Election Type</label>
                <select
                  name="election_type"
                  value={electionData.election_type}
                  onChange={handleChange}
                  className="border w-full p-2 rounded border-gray-300 text-black"
                >
                  {maintenanceData.electionTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-black mb-1">Description</label>
                <textarea
                  name="description"
                  value={electionData.description}
                  onChange={handleChange}
                  className="border w-full p-2 rounded border-gray-300 text-black"
                  rows={3}
                  placeholder="Election description and purpose"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-black mb-1">Start Date*</label>
                  <input
                    type="date"
                    name="date_from"
                    value={electionData.date_from}
                    onChange={handleChange}
                    className={`border w-full p-2 rounded ${formErrors.date_from ? 'border-red-500' : 'border-gray-300'} text-black`}
                  />
                  {formErrors.date_from && <p className="text-red-500 text-sm mt-1">{formErrors.date_from}</p>}
                </div>
                <div>
                  <label className="block font-medium text-black mb-1">End Date*</label>
                  <input
                    type="date"
                    name="date_to"
                    value={electionData.date_to}
                    onChange={handleChange}
                    min={electionData.date_from || new Date().toISOString().split('T')[0]}
                    className={`border w-full p-2 rounded ${formErrors.date_to ? 'border-red-500' : 'border-gray-300'} text-black`}
                  />
                  {formErrors.date_to && <p className="text-red-500 text-sm mt-1">{formErrors.date_to}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-black mb-1">Start Time</label>
                  <input
                    type="time"
                    name="start_time"
                    value={electionData.start_time}
                    onChange={handleChange}
                    className="border w-full p-2 rounded border-gray-300 text-black"
                  />
                </div>
                <div>
                  <label className="block font-medium text-black mb-1">End Time</label>
                  <input
                    type="time"
                    name="end_time"
                    value={electionData.end_time}
                    onChange={handleChange}
                    className="border w-full p-2 rounded border-gray-300 text-black"
                  />
                </div>
              </div>
            </div>

            {/* Eligible Voters */}
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-black mb-4">Eligible Voters</h2>
                <div className="bg-blue-50 p-3 rounded-lg mb-4">
                  <p className="font-medium text-blue-800">
                    {loading.eligibility ? 'Calculating...' : `${eligibleCount} eligible voters count`}
                  </p>
                </div>

                {[
                  { category: 'programs', label: 'Programs', items: maintenanceData.programs },
                  { category: 'yearLevels', label: 'Year Levels', items: maintenanceData.yearLevels },
                ].map(({ category, label, items }) => (
                  <div key={category} className="border-b pb-4 last:border-b-0">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium text-black">{label}</h3>
                      <button
                        type="button"
                        onClick={() => toggleAll(category, items)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        {electionData.eligibleVoters[category].length === items.length ? 'Deselect all' : 'Select all'}
                      </button>
                    </div>
                    {criteriaErrors[category] && (
                      <p className="text-red-500 text-sm mb-2">{criteriaErrors[category]}</p>
                    )}
                    <div className="flex flex-wrap gap-3">
                      {items.map(item => (
                        <label 
                          key={item} 
                          className={`inline-flex items-center px-3 py-1 rounded-full ${
                            electionData.eligibleVoters[category].includes(item) 
                              ? 'bg-blue-100 border border-blue-300' 
                              : 'border border-gray-200'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={electionData.eligibleVoters[category].includes(item)}
                            onChange={() => handleCheckboxChange(category, item)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                          />
                          <span className="text-black">{item}</span>
                        </label>
                      ))}
                    </div>
                    {electionData.eligibleVoters[category].length > 0 && (
                      <p className="text-sm text-gray-500 mt-2">
                        Selected: {electionData.eligibleVoters[category].join(", ")}
                      </p>
                    )}
                  </div>
                ))}
                
                <div className="border-b pb-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium text-black">Semester</h3>
                  </div>
                  {criteriaErrors['semester'] && (
                    <p className="text-red-500 text-sm mb-2">{criteriaErrors['semester']}</p>
                  )}
                  <div className="flex flex-wrap gap-3">
                    {maintenanceData.semesters.map(item => (
                      <label 
                        key={item} 
                        className={`inline-flex items-center px-3 py-1 rounded-full ${
                          electionData.eligibleVoters.semester.includes(item) 
                            ? 'bg-blue-100 border border-blue-300' 
                            : 'border border-gray-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name="semester"
                          checked={electionData.eligibleVoters.semester.includes(item)}
                          onChange={() => handleCheckboxChange('semester', item)}
                          className="rounded-full border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                        />
                        <span className="text-black">{item}</span>
                      </label>
                    ))}
                  </div>
                  {electionData.eligibleVoters.semester.length > 0 && (
                    <p className="text-sm text-gray-500 mt-2">
                      Selected: {electionData.eligibleVoters.semester.join(", ")}
                    </p>
                  )}
                </div>
                
                {[
                  { category: 'gender', label: 'Gender', items: maintenanceData.genders },
                  { category: 'precinct', label: 'Precinct', items: maintenanceData.precincts },
                ].map(({ category, label, items }) => (
                  <div key={category} className="border-b pb-4 last:border-b-0">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium text-black">{label}</h3>
                      <button
                        type="button"
                        onClick={() => toggleAll(category, items)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        {electionData.eligibleVoters[category].length === items.length ? 'Deselect all' : 'Select all'}
                      </button>
                    </div>
                    {criteriaErrors[category] && (
                      <p className="text-red-500 text-sm mb-2">{criteriaErrors[category]}</p>
                    )}
                    <div className="flex flex-wrap gap-3">
                      {items.map(item => (
                        <label 
                          key={item} 
                          className={`inline-flex items-center px-3 py-1 rounded-full ${
                            electionData.eligibleVoters[category].includes(item) 
                              ? 'bg-blue-100 border border-blue-300' 
                              : 'border border-gray-200'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={electionData.eligibleVoters[category].includes(item)}
                            onChange={() => handleCheckboxChange(category, item)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                          />
                          <span className="text-black">{item}</span>
                        </label>
                      ))}
                    </div>
                    {electionData.eligibleVoters[category].length > 0 && (
                      <p className="text-sm text-gray-500 mt-2">
                        Selected: {electionData.eligibleVoters[category].join(", ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-8">
            <button
              type="submit"
              disabled={loading.saving}
              className={`flex items-center bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors ${
                loading.saving ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading.saving ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}