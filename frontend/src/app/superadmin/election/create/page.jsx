"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "react-toastify";
import Cookies from "js-cookie";
import axios from "axios";

const PreviewModal = ({ 
  electionData, 
  eligibleCount, 
  onConfirm, 
  onCancel 
}) => {

  const formatTime = (time24h) => {
    if (!time24h) return "";
    
    const [hours, minutes] = time24h.split(':');
    const hour = parseInt(hours, 10);
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    
    return `${hour12}:${minutes} ${period}`;
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 text-black">Election Preview</h2>
        
        <div className="mb-6">
          <h3 className="font-semibold mb-2 text-black">Election Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-black">Title:</p>
              <p className="font-medium text-black">{electionData.title}</p>
            </div>
            <div>
              <p className="text-black">Type:</p>
              <p className="font-medium text-black">{electionData.electionType}</p>
            </div>
            <div>
              <p className="text-black">Start Date:</p>
              <p className="font-medium text-black">
                {new Date(electionData.dateFrom).toLocaleDateString()} at {formatTime(electionData.startTime)}
              </p>
            </div>
            <div>
              <p className="text-black">End Date:</p>
              <p className="font-medium text-black">
                {new Date(electionData.dateTo).toLocaleDateString()} at {formatTime(electionData.endTime)}
              </p>
            </div>
            {electionData.description && (
              <div className="col-span-2">
                <p className="text-black">Description:</p>
                <p className="font-medium text-black">{electionData.description}</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="mb-6">
          <h3 className="font-semibold mb-2 text-black">Voter Eligibility Criteria</h3>
          {Object.entries(electionData.eligibleVoters).map(([category, values]) => (
            values.length > 0 && (
              <div key={category} className="mb-2">
                <p className="capitalize font-medium text-black">
                  {category.replace(/([A-Z])/g, ' $1').trim()}:
                </p>
                <p className="text-black">{values.join(", ")}</p>
              </div>
            )
          ))}
          <p className="mt-4 font-medium text-lg text-black">
            Total Eligible Voters: <span className="text-blue-600">{eligibleCount}</span>
          </p>
        </div>
        
        <div className="flex justify-end gap-4 mt-6">
          <button 
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-black"
          >
            Edit
          </button>
          <button 
            onClick={onConfirm}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Confirm & Create Election
          </button>
        </div>
      </div>
    </div>
  );
};

export default function CreateElectionPage() {
  const router = useRouter();
  const [eventData, setEventData] = useState({
    title: "",
    electionType: "",
    description: "",
    dateFrom: "",
    dateTo: "",
    startTime: "08:00",
    endTime: "17:00",
    eligibleVoters: {
      programs: [],
      yearLevels: [],
      semester: [],
      gender: [],
      precinct: [],
    },
  });
  const [maintenanceData, setMaintenanceData] = useState({
    programs: [],
    electionTypes: [],
    yearLevels: [],
    genders: [],
    semesters: [],
    precincts: []
  });
  const [loading, setLoading] = useState({
    options: true,
    form: false
  });
  const [errors, setErrors] = useState({});
  const [criteriaErrors, setCriteriaErrors] = useState({});
  const [eligibleCount, setEligibleCount] = useState(0);
  const [apiError, setApiError] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  // Fetch maintenance data on component mount
  useEffect(() => {
    const fetchMaintenanceData = async () => {
      try {
        const token = Cookies.get("token");
        const endpoints = [
          { key: 'programs', url: 'programs' },
          { key: 'electionTypes', url: 'election-types' },
          { key: 'yearLevels', url: 'year-levels' },
          { key: 'genders', url: 'genders' },
          { key: 'semesters', url: 'semesters' },
          { key: 'precincts', url: 'precincts' }
        ];

        const requests = endpoints.map(endpoint => 
          axios.get(`http://localhost:5000/api/maintenance/${endpoint.url}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        );

        const responses = await Promise.all(requests);
        
        const data = endpoints.reduce((acc, endpoint, index) => {
          acc[endpoint.key] = responses[index].data.data.map(item => item.name);
          return acc;
        }, {});

        setMaintenanceData(data);
        
        // Set default election type if available
        if (data.electionTypes.length > 0) {
          setEventData(prev => ({
            ...prev,
            electionType: data.electionTypes[0]
          }));
        }
      } catch (error) {
        console.error("Error fetching maintenance data:", error);
        toast.error("Failed to load form options");
      } finally {
        setLoading(prev => ({ ...prev, options: false }));
      }
    };

    fetchMaintenanceData();
  }, []);

  // Add a helper function to check if all items are selected
  const areAllSelected = (selectedItems, allItems) => {
    return selectedItems.length === allItems.length;
  };

  useEffect(() => {
    const fetchEligibleCount = async () => {
      try {
        setLoading(prev => ({ ...prev, form: true }));
        const token = Cookies.get("token");
        
        // Determine if all options for each category are selected
        const allProgramsSelected = areAllSelected(eventData.eligibleVoters.programs, maintenanceData.programs);
        const allYearLevelsSelected = areAllSelected(eventData.eligibleVoters.yearLevels, maintenanceData.yearLevels);
        const allGendersSelected = areAllSelected(eventData.eligibleVoters.gender, maintenanceData.genders);
        
        // Create a modified eligible voters object - key to fixing the count
        const optimizedEligibleVoters = {
          // If all items are selected, send empty array to backend to indicate "all"
          programs: allProgramsSelected ? [] : eventData.eligibleVoters.programs,
          yearLevels: allYearLevelsSelected ? [] : eventData.eligibleVoters.yearLevels,
          gender: allGendersSelected ? [] : eventData.eligibleVoters.gender,
          semester: eventData.eligibleVoters.semester,
          precinct: eventData.eligibleVoters.precinct,
        };
        
        const response = await axios.post(
          "http://localhost:5000/api/elections/preview-voters",
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
        setLoading(prev => ({ ...prev, form: false }));
      }
    };

    const hasFilters = Object.values(eventData.eligibleVoters).some(arr => arr.length > 0);
    if (hasFilters) {
      fetchEligibleCount();
    } else {
      setEligibleCount(0);
    }
  }, [eventData.eligibleVoters, maintenanceData]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!eventData.title) newErrors.title = "Title is required";
    if (!eventData.dateFrom) newErrors.dateFrom = "Start date is required";
    if (!eventData.dateTo) newErrors.dateTo = "End date is required";
    if (new Date(eventData.dateFrom) > new Date(eventData.dateTo)) {
      newErrors.dateTo = "End date must be after start date";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateVoterCriteria = () => {
    const newCriteriaErrors = {};
    const { eligibleVoters } = eventData;
    
    if (eligibleVoters.programs.length === 0) newCriteriaErrors.programs = "Select at least one program";
    if (eligibleVoters.yearLevels.length === 0) newCriteriaErrors.yearLevels = "Select at least one year level";
    if (eligibleVoters.gender.length === 0) newCriteriaErrors.gender = "Select at least one gender";
    if (eligibleVoters.semester.length === 0) newCriteriaErrors.semester = "Select a semester";
    
    setCriteriaErrors(newCriteriaErrors);
    return Object.keys(newCriteriaErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEventData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (category, value) => {
    setEventData(prev => {
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

  const toggleAll = (category, items) => {
    // Skip semester from the "Select All" functionality
    if (category === 'semester') return;
    
    setEventData(prev => {
      const currentValues = prev.eligibleVoters[category];
      const allSelected = currentValues.length === items.length;
      
      return {
        ...prev,
        eligibleVoters: {
          ...prev.eligibleVoters,
          [category]: allSelected ? [] : [...items]
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

  const handlePreview = () => {
    if (!validateForm() || !validateVoterCriteria()) return;
    setShowPreview(true);
  };

  const handleConfirmCreate = async () => {
    setShowPreview(false);
    try {
      setLoading(prev => ({ ...prev, form: true }));
      setApiError(null);
      const token = Cookies.get("token");
      
      // Use the same optimization for creation endpoint
      const allProgramsSelected = areAllSelected(eventData.eligibleVoters.programs, maintenanceData.programs);
      const allYearLevelsSelected = areAllSelected(eventData.eligibleVoters.yearLevels, maintenanceData.yearLevels);
      const allGendersSelected = areAllSelected(eventData.eligibleVoters.gender, maintenanceData.genders);
      
      const optimizedEligibleVoters = {
        programs: allProgramsSelected ? [] : eventData.eligibleVoters.programs,
        yearLevels: allYearLevelsSelected ? [] : eventData.eligibleVoters.yearLevels,
        gender: allGendersSelected ? [] : eventData.eligibleVoters.gender,
        semester: eventData.eligibleVoters.semester,
        precinct: eventData.eligibleVoters.precinct,
      };
      
      const response = await axios.post(
        "http://localhost:5000/api/elections",
        {
          title: eventData.title,
          description: eventData.description,
          election_type: eventData.electionType,
          date_from: eventData.dateFrom,
          date_to: eventData.dateTo,
          start_time: eventData.startTime,
          end_time: eventData.endTime,
          eligible_voters: optimizedEligibleVoters
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      toast.success('Election created successfully!');
      router.push(`/superadmin/election/create/${response.data.election.id}/ballot`);
      
    } catch (error) {
      console.error("Election creation failed:", error);
      const errorMessage = error.response?.data?.message || error.message;
      setApiError(errorMessage);
      toast.error(`Election creation failed: ${errorMessage}`);
    } finally {
      setLoading(prev => ({ ...prev, form: false }));
    }
  };

  if (loading.options) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex justify-center items-center h-64">
          <p>Loading form options...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white shadow-lg rounded-lg max-w-6xl mx-auto">
      {showPreview && (
        <PreviewModal
          electionData={eventData}
          eligibleCount={eligibleCount}
          onConfirm={handleConfirmCreate}
          onCancel={() => setShowPreview(false)}
        />
      )}

      <button 
        onClick={() => router.back()} 
        className="flex items-center text-blue-900 hover:text-blue-700 mb-4"
      >
        <ArrowLeft className="w-6 h-6 mr-2" />
        <span className="font-semibold">Back</span>
      </button>

      <h1 className="text-2xl font-bold mb-6 text-gray-800">Create Election</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Election Details */}
        <div className="space-y-4">
          <div>
            <label className="block font-medium text-black mb-1">Election Title</label>
            <input
              type="text"
              name="title"
              value={eventData.title}
              onChange={handleChange}
              className={`border w-full p-2 rounded ${errors.title ? 'border-red-500' : 'border-gray-300'} text-black`}
            />
            {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
          </div>

          <div>
            <label className="block font-medium text-black mb-1">Election/Event Type</label>
            <select
              name="electionType"
              value={eventData.electionType}
              onChange={handleChange}
              className="border w-full p-2 rounded border-gray-300 text-black"
            >
              {maintenanceData.electionTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              value={eventData.description}
              onChange={handleChange}
              className="border w-full p-2 rounded border-gray-300 text-black"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                name="dateFrom"
                value={eventData.dateFrom}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
                className={`border w-full p-2 rounded ${errors.dateFrom ? 'border-red-500' : 'border-gray-300'} text-black`}
              />
              {errors.dateFrom && <p className="text-red-500 text-sm mt-1">{errors.dateFrom}</p>}
            </div>
            <div>
              <label className="block font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                name="dateTo"
                value={eventData.dateTo}
                onChange={handleChange}
                min={eventData.dateFrom || new Date().toISOString().split('T')[0]}
                className={`border w-full p-2 rounded ${errors.dateTo ? 'border-red-500' : 'border-gray-300'} text-black`}
              />
              {errors.dateTo && <p className="text-red-500 text-sm mt-1">{errors.dateTo}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-gray-700 mb-1">Start Time</label>
              <input
                type="time"
                name="startTime"
                value={eventData.startTime}
                onChange={handleChange}
                className="border w-full p-2 rounded border-gray-300 text-black"
              />
            </div>
            <div>
              <label className="block font-medium text-gray-700 mb-1">End Time</label>
              <input
                type="time"
                name="endTime"
                value={eventData.endTime}
                onChange={handleChange}
                className="border w-full p-2 rounded border-gray-300 text-black"
              />
            </div>
          </div>
        </div>

        {/* Eligible Voters */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Eligible Voters</h2>
            <div className="bg-blue-50 p-3 rounded-lg mb-4">
            
              <p className="font-medium text-blue-800">
                {eligibleCount} eligible voters count
              </p>
              
            </div>

            {[
              { category: 'programs', label: 'Programs', items: maintenanceData.programs },
              { category: 'yearLevels', label: 'Year Levels', items: maintenanceData.yearLevels },
              { category: 'semester', label: 'Semester', items: maintenanceData.semesters },
              { category: 'gender', label: 'Gender', items: maintenanceData.genders },
              { category: 'precinct', label: 'Precinct', items: maintenanceData.precincts },
            ].map(({ category, label, items }) => (
              <div key={category} className="border-b pb-4 last:border-b-0">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium text-gray-700">{label}</h3>
                  {category !== 'semester' && (
                    <button
                      onClick={() => toggleAll(category, items)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {eventData.eligibleVoters[category].length === items.length ? 'Deselect all' : 'Select all'}
                    </button>
                  )}
                </div>
                {criteriaErrors[category] && (
                  <p className="text-red-500 text-sm mb-2">{criteriaErrors[category]}</p>
                )}
                <div className="flex flex-wrap gap-3">
                  {items.map(item => (
                    <label 
                      key={item} 
                      className={`inline-flex items-center px-3 py-1 rounded-full ${
                        eventData.eligibleVoters[category].includes(item) 
                          ? 'bg-blue-100 border border-blue-300' 
                          : 'border border-gray-200'
                      }`}
                    >
                      {category === 'semester' ? (
                        <input
                          type="radio"
                          name="semester"
                          checked={eventData.eligibleVoters[category].includes(item)}
                          onChange={() => handleCheckboxChange(category, item)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                        />
                      ) : (
                        <input
                          type="checkbox"
                          checked={eventData.eligibleVoters[category].includes(item)}
                          onChange={() => handleCheckboxChange(category, item)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                        />
                      )}
                      <span className="text-gray-700">{item}</span>
                    </label>
                  ))}
                </div>
                {eventData.eligibleVoters[category].length > 0 && (
                  <p className="text-sm text-gray-500 mt-2">
                    Selected: {eventData.eligibleVoters[category].join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-8 gap-4">
        {apiError && (
          <p className="text-red-500 text-sm mr-4 self-center">{apiError}</p>
        )}
        <button
          onClick={handlePreview}
          disabled={loading.form}
          className={`bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors ${
            loading.form ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {loading.form ? 'Processing...' : 'Next'}
        </button>
      </div>
    </div>
  );
}