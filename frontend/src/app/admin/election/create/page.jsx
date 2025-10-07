"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "react-toastify";
import Cookies from "js-cookie";
import axios from "axios";

// Helper for 12-hour time format
const formatTime = (time24h) => {
  if (!time24h) return "";
  const [hours, minutes] = time24h.split(":");
  const hour = parseInt(hours, 10);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${hour12}:${minutes} ${period}`;
};

const PreviewModal = ({ 
  electionData, 
  eligibleCount, 
  formatTime,
  onConfirm, 
  onCancel 
}) => {
  const sortPrecincts = (a, b) => {
    const extractNumber = (str) => parseInt(str.match(/\d+/)?.[0] || '0');
    const aNum = extractNumber(a);
    const bNum = extractNumber(b);
    if (aNum !== 0 && bNum !== 0) {
      return aNum - bNum;
    }
    return a.localeCompare(b);
  };

  const sortPrograms = (a, b) => {
    const collegePrograms = [
      'BSA', 'BSBAOM', 'BSCPE', 'BSCS', 'BSHM', 'BSIT', 'BMMA', 'BSTM'
    ];
    const seniorHighPrograms = [
      'ABM', 'CUART', 'DIGAR', 'HUMMS', 'MAWD', 'STEM', 'TOPER'
    ];

    const aType = seniorHighPrograms.includes(a) ? 'seniorHigh' : 'college';
    const bType = seniorHighPrograms.includes(b) ? 'seniorHigh' : 'college';

    if (aType !== bType) {
      return aType === 'college' ? -1 : 1;
    }

    if (aType === 'college') {
      if (collegePrograms.includes(a) && collegePrograms.includes(b)) {
        return collegePrograms.indexOf(a) - collegePrograms.indexOf(b);
      }
      return a.localeCompare(b);
    }

    if (seniorHighPrograms.includes(a) && seniorHighPrograms.includes(b)) {
      return seniorHighPrograms.indexOf(a) - seniorHighPrograms.indexOf(b);
    }
    return a.localeCompare(b);
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
          {Object.entries(electionData.eligibleVoters)
            .filter(([key]) => key !== 'precinctPrograms' && key !== 'precinct' && electionData.eligibleVoters[key].length > 0)
            .map(([category, values]) => (
              <div key={category} className="mb-2">
                <p className="capitalize font-medium text-black">
                  {category.replace(/([A-Z])/g, ' $1').trim()}:
                </p>
                <p className="text-black">{values.join(", ")}</p>
              </div>
            ))}

          {/* Simplified Precinct Display */}
          {electionData.eligibleVoters.precinct.length > 0 && (
            <div className="mt-4">
              <p className="font-medium text-black mb-2">Precincts and Assigned Programs:</p>
              <div className="space-y-2 pl-4">
                {electionData.eligibleVoters.precinct.sort(sortPrecincts).map(precinct => (
                  <div key={precinct} className="flex">
                    <span className="font-medium text-black w-24">{precinct}:</span>
                    <span className="text-black">
                      {electionData.eligibleVoters.precinctPrograms[precinct]?.sort(sortPrograms).join(", ") || "No programs assigned"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <p className="mt-4 font-medium text-lg text-black">
          Total Eligible Voters: <span className="text-blue-600">{Number(eligibleCount).toLocaleString()}</span>
        </p>
        
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

const YearLevelSelector = ({ yearLevels, selectedYearLevels, onChange, selectedPrograms }) => {
  const collegeYearLevels = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
  const seniorHighYearLevels = ['Grade 11', 'Grade 12'];
  
  const collegePrograms = ['BSA', 'BSBAOM', 'BSCPE', 'BSCS', 'BSHM', 'BSIT', 'BMMA', 'BSTM'];
  const seniorHighPrograms = ['ABM', 'CUART', 'DIGAR', 'HUMMS', 'MAWD', 'STEM', 'TOPER'];
  
  const hasOnlyCollegePrograms = selectedPrograms.length > 0 && 
    selectedPrograms.every(p => collegePrograms.includes(p));
  
  const hasOnlySeniorHighPrograms = selectedPrograms.length > 0 && 
    selectedPrograms.every(p => seniorHighPrograms.includes(p));
  
  return (
    <div className="flex flex-wrap gap-3">
      {yearLevels.map(yearLevel => {
        let isEnabled = true;
        
        const isCollegeYearLevel = collegeYearLevels.includes(yearLevel);
        const isSeniorHighYearLevel = seniorHighYearLevels.includes(yearLevel);
        
        if (hasOnlyCollegePrograms) {
          isEnabled = isCollegeYearLevel;
        } else if (hasOnlySeniorHighPrograms) {
          isEnabled = isSeniorHighYearLevel;
        }
        
        const isChecked = selectedYearLevels.includes(yearLevel);
        
        return (
          <label 
            key={yearLevel}
            className={`inline-flex items-center px-3 py-1 rounded-full ${
              isChecked 
                ? 'bg-blue-100 border border-blue-300' 
                : 'border border-gray-200'
            } ${!isEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input
              type="checkbox"
              checked={isChecked}
              onChange={() => isEnabled && onChange(yearLevel)}
              className={`rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2 ${
                !isEnabled ? 'cursor-not-allowed' : ''
              }`}
              disabled={!isEnabled}
            />
            <span className={`${!isEnabled ? 'text-gray-400' : 'text-gray-700'}`}>
              {yearLevel}
            </span>
          </label>
        );
      })}
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
    startTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    endTime: "17:00",
    eligibleVoters: {
      programs: [],
      yearLevels: [],
      semester: [],
      gender: [],
      precinct: [],
      precinctPrograms: {}
    },
  });
  
  // Maintenance data states
  const [maintenanceData, setMaintenanceData] = useState({
    programs: [],
    electionTypes: [],
    yearLevels: [],
    semesters: [],
    genders: [],
    precincts: []
  });
  const [maintenanceLoading, setMaintenanceLoading] = useState(true);
  const [maintenanceError, setMaintenanceError] = useState(null);
  
  const [errors, setErrors] = useState({});
  const [criteriaErrors, setCriteriaErrors] = useState({});
  const [eligibleCount, setEligibleCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [currentSemester, setCurrentSemester] = useState(null);
  const [totalRegisteredVoters, setTotalRegisteredVoters] = useState(0);

  // Add state for managing visibility of program selections
  const [visibleProgramSelections, setVisibleProgramSelections] = useState({});

  // Add the areAllSelected helper function before the useEffect
  const areAllSelected = (selectedItems, allItems) => {
    if (!selectedItems || !allItems) return false;
    if (selectedItems.length !== allItems.length) return false;
    return selectedItems.length === allItems.length && 
           selectedItems.every(item => allItems.includes(item));
  };

  // Function to get current time in HH:MM format
  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  };

  // Update start time when date changes
  useEffect(() => {
    if (eventData.dateFrom === new Date().toISOString().split('T')[0]) {
      setEventData(prev => ({
        ...prev,
        startTime: getCurrentTime()
      }));
    }
  }, [eventData.dateFrom]);

  useEffect(() => {
    const fetchMaintenanceData = async () => {
      setMaintenanceLoading(true);
      setMaintenanceError(null);
      try {
        const token = Cookies.get("token");
        if (!token) {
          throw new Error("No authentication token found");
        }
        
        const maintenanceResults = {};
        
        const endpoints = {
          programs: "programs",
          electionTypes: "election-types", 
          yearLevels: "year-levels",
          semesters: "semesters",
          genders: "genders",
          precincts: "precincts"
        };
        
        const requests = Object.entries(endpoints).map(async ([category, endpoint]) => {
          try {
            const response = await axios.get(
              `/api/maintenance/${endpoint}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            
            if (category === 'precincts') {
              // Keep full objects for precincts to access IDs
              maintenanceResults[category] = response.data.data;
            } else {
              maintenanceResults[category] = response.data.data.map(item => item.name);
            }
          } catch (error) {
            console.error(`Error fetching ${category}:`, error);
            maintenanceResults[category] = [];
          }
        });
        
        // Fetch current semester
        const currentSemesterRequest = axios.get(
          "/api/maintenance/current-semester",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        requests.push(currentSemesterRequest);
        
        await Promise.all(requests);
        
        setMaintenanceData(maintenanceResults);
        
        if (maintenanceResults.electionTypes && maintenanceResults.electionTypes.length > 0) {
          setEventData(prev => ({
            ...prev,
            electionType: maintenanceResults.electionTypes[0]
          }));
        }
        
        // Set current semester if available
        const currentSemesterResponse = await currentSemesterRequest;
        if (currentSemesterResponse.data.success && currentSemesterResponse.data.data) {
          const currentSemesterName = currentSemesterResponse.data.data.name;
          setCurrentSemester(currentSemesterName);
          setEventData(prev => ({
            ...prev,
            eligibleVoters: {
              ...prev.eligibleVoters,
              semester: [currentSemesterName]
            }
          }));
        }
        
      } catch (error) {
        console.error("Error fetching maintenance data:", error);
        setMaintenanceError("Failed to load form options. Please try again later.");
      } finally {
        setMaintenanceLoading(false);
      }
    };
    
    fetchMaintenanceData();
  }, []);

  useEffect(() => {
    const fetchEligibleCount = async () => {
      try {
        setIsLoading(true);
        const token = Cookies.get("token");
        
        // Check if required fields are selected
        const hasRequiredSelections = 
          eventData.eligibleVoters.programs.length > 0 &&
          eventData.eligibleVoters.yearLevels.length > 0 &&
          eventData.eligibleVoters.gender.length > 0;

        if (!hasRequiredSelections) {
          setEligibleCount(0);
          return;
        }
        
        // Determine if all options for each category are selected using the helper function
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
          precinctPrograms: eventData.eligibleVoters.precinctPrograms
        };
        
        const response = await axios.post(
          "/api/elections/preview-voters",
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
        setIsLoading(false);
      }
    };

    const hasRequiredFilters = 
      eventData.eligibleVoters.programs.length > 0 &&
      eventData.eligibleVoters.yearLevels.length > 0 &&
      eventData.eligibleVoters.gender.length > 0;
    
    if (hasRequiredFilters) {
      fetchEligibleCount();
    } else {
      setEligibleCount(0);
    }
  }, [eventData.eligibleVoters, maintenanceData]);

  useEffect(() => {
    // Fetch total registered voters (all filters empty)
    const fetchTotalRegisteredVoters = async () => {
      try {
        const token = Cookies.get("token");
        const response = await axios.post(
          "/api/elections/preview-voters",
          { eligible_voters: { programs: [], yearLevels: [], gender: [], semester: [], precinct: [] } },
          { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } }
        );
        setTotalRegisteredVoters(response.data.count || 0);
      } catch (error) {
        console.error("Error fetching total registered voters:", error);
        toast.error("Failed to fetch total registered voters");
      }
    };
    fetchTotalRegisteredVoters();
  }, []);

  const validateForm = () => {
    const newErrors = {};
    
    if (!eventData.title) newErrors.title = "Title is required";
    if (!eventData.electionType) newErrors.electionType = "Election type is required";
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
    if (eligibleVoters.precinct.length === 0) newCriteriaErrors.precinct = "Select at least one precinct";
    
    // Validate that each selected precinct has at least one program assigned
    eligibleVoters.precinct.forEach(precinct => {
      if (!eligibleVoters.precinctPrograms[precinct]?.length) {
        newCriteriaErrors.precinct = `Assign at least one program to ${precinct}`;
      }
    });
    
    setCriteriaErrors(newCriteriaErrors);
    return Object.keys(newCriteriaErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEventData(prev => ({ ...prev, [name]: value }));
  };

  // Add function to check if a program is already assigned to another precinct
  const isProgramAssignedToOtherPrecinct = (program, currentPrecinct) => {
    return Object.entries(eventData.eligibleVoters.precinctPrograms)
      .some(([precinct, programs]) => 
        precinct !== currentPrecinct && programs.includes(program)
      );
  };

  // Add function to toggle program selection visibility
  const toggleProgramSelection = (precinct) => {
    setVisibleProgramSelections(prev => ({
      ...prev,
      [precinct]: !prev[precinct]
    }));
  };

  const handlePrecinctProgramChange = (precinct, program) => {
    // Check if program is already assigned to another precinct
    if (!eventData.eligibleVoters.precinctPrograms[precinct]?.includes(program) &&
        isProgramAssignedToOtherPrecinct(program, precinct)) {
      toast.error(`${program} is already assigned to another precinct`);
      return;
    }

    setEventData(prev => {
      const precinctPrograms = { ...prev.eligibleVoters.precinctPrograms };
      
      if (!precinctPrograms[precinct]) {
        precinctPrograms[precinct] = [];
      }
      
      if (precinctPrograms[precinct].includes(program)) {
        precinctPrograms[precinct] = precinctPrograms[precinct].filter(p => p !== program);
      } else {
        precinctPrograms[precinct] = [...precinctPrograms[precinct], program];
      }
      
      // Remove empty precinct entries
      if (precinctPrograms[precinct].length === 0) {
        delete precinctPrograms[precinct];
      }
      
      return {
        ...prev,
        eligibleVoters: {
          ...prev.eligibleVoters,
          precinctPrograms
        }
      };
    });
  };

  const handleCheckboxChange = (category, value) => {
    setEventData(prev => {
      if (category === 'semester') {
        return {
          ...prev,
          eligibleVoters: {
            ...prev.eligibleVoters,
            [category]: [value]
          }
        };
      }

      const currentValues = prev.eligibleVoters[category];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(item => item !== value)
        : [...currentValues, value];

      if (category === 'programs') {
        // Reset year levels when changing programs
        return {
          ...prev,
          eligibleVoters: {
            ...prev.eligibleVoters,
            [category]: newValues,
            yearLevels: [] // Reset year levels when changing programs
          }
        };
      }

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
    if (category === 'semester') return;
    
    setEventData(prev => {
      const currentValues = prev.eligibleVoters[category];
      const allSelected = currentValues.length === items.length;
      const newValues = allSelected ? [] : [...items];
      
      if (category === 'programs') {
        // Reset year levels when toggling all programs
        return {
          ...prev,
          eligibleVoters: {
            ...prev.eligibleVoters,
            [category]: newValues,
            yearLevels: [] // Reset year levels when changing programs
          }
        };
      }
      
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

  const handlePreview = () => {
    if (!validateForm() || !validateVoterCriteria()) return;
    setShowPreview(true);
  };

  const handleConfirmCreate = async () => {
    setShowPreview(false);
    try {
      setIsLoading(true);
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
        precinctPrograms: eventData.eligibleVoters.precinctPrograms
      };
  
      // Prepare laboratory precincts data
      const laboratoryPrecincts = eventData.eligibleVoters.precinct.map(precinct => {
        // Find the precinct ID from the maintenance data
        const precinctData = maintenanceData.precincts.find(p => p.name === precinct);
        return {
          laboratoryPrecinctId: precinctData?.id || precinct,
          assignedCourses: eventData.eligibleVoters.precinctPrograms[precinct] || []
        };
      }).filter(lp => lp.assignedCourses.length > 0);

      const response = await axios.post(
        "/api/elections",
        {
          title: eventData.title,
          description: eventData.description,
          election_type: eventData.electionType, 
          date_from: eventData.dateFrom, 
          date_to: eventData.dateTo,
          start_time: eventData.startTime,
          end_time: eventData.endTime,
          eligible_voters: optimizedEligibleVoters,
          laboratoryPrecincts: laboratoryPrecincts
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      toast.success('Election created successfully! It will be published after approval by a Super Admin.');
      router.push(`/admin/election/create/${response.data.election.id}/ballot`);
      
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      setApiError(errorMessage);
      toast.error(`Election creation failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const sortYearLevels = (a, b) => {
    const knownOrder = {
      '1st year': 1,
      '2nd year': 2,
      '3rd year': 3,
      '4th year': 4,
      'Grade 11': 5,
      'Grade 12': 6
    };
    const aOrder = knownOrder[a] || 999;
    const bOrder = knownOrder[b] || 999;
    if (aOrder !== 999 && bOrder !== 999) {
      return aOrder - bOrder;
    }
    return a.localeCompare(b);
  };

  const sortPrograms = (a, b) => {
    const collegePrograms = [
      'BSA',
      'BSBAOM',
      'BSCPE',
      'BSCS',
      'BSHM',
      'BSIT',
      'BMMA',
      'BSTM'
    ];

    const seniorHighPrograms = [
      'ABM',
      'CUART',
      'DIGAR',
      'HUMMS',
      'MAWD',
      'STEM',
      'TOPER'
    ];

    const getProgramType = (program) => {
      if (collegePrograms.includes(program)) return 'college';
      if (seniorHighPrograms.includes(program)) return 'seniorHigh';
      
      if (program.startsWith('BS')) return 'college';
      return 'seniorHigh';
    };

    const aType = getProgramType(a);
    const bType = getProgramType(b);

    if (aType !== bType) {
      return aType === 'college' ? -1 : 1;
    }

    if (aType === 'college') {
      if (collegePrograms.includes(a) && collegePrograms.includes(b)) {
        return collegePrograms.indexOf(a) - collegePrograms.indexOf(b);
      }
      if (collegePrograms.includes(a)) return -1;
      if (collegePrograms.includes(b)) return 1;
      return a.localeCompare(b);
    }

    if (aType === 'seniorHigh') {
      if (seniorHighPrograms.includes(a) && seniorHighPrograms.includes(b)) {
        return seniorHighPrograms.indexOf(a) - seniorHighPrograms.indexOf(b);
      }
      if (seniorHighPrograms.includes(a)) return -1;
      if (seniorHighPrograms.includes(b)) return 1;
      return a.localeCompare(b);
    }

    return a.localeCompare(b);
  };

  const sortGender = (a, b) => {
    if (a.toLowerCase() === 'male') return -1;
    if (b.toLowerCase() === 'male') return 1;
    return a.localeCompare(b);
  };

  const sortPrecincts = (a, b) => {
    const extractNumber = (str) => parseInt(str.match(/\d+/)?.[0] || '0');
    const aNum = extractNumber(a);
    const bNum = extractNumber(b);
    if (aNum !== 0 && bNum !== 0) {
      return aNum - bNum;
    }
    return a.localeCompare(b);
  };

  if (maintenanceLoading) {
    return (
      <div className="p-6 bg-white shadow-lg rounded-lg max-w-6xl mx-auto">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600">Loading election form options...</p>
          </div>
        </div>
      </div>
    );
  }

  if (maintenanceError) {
    return (
      <div className="p-6 bg-white shadow-lg rounded-lg max-w-6xl mx-auto">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <div className="flex items-center">
            <div className="flex-shrink-0 text-red-500">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-9v4a1 1 0 102 0v-4a1 1 0 10-2 0zm0-4a1 1 0 112 0 1 1 0 01-2 0z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{maintenanceError}</p>
            </div>
          </div>
        </div>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white shadow-lg rounded-lg max-w-6xl mx-auto">
      {showPreview && (
        <PreviewModal
          electionData={eventData}
          eligibleCount={eligibleCount}
          formatTime={formatTime}
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
            <label className="block font-medium text-black mb-1">Election Type</label>
            <select
              name="electionType"
              value={eventData.electionType}
              onChange={handleChange}
              className={`border w-full p-2 rounded ${errors.electionType ? 'border-red-500' : 'border-gray-300'} text-black`}
            >
              {maintenanceData.electionTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            {errors.electionType && <p className="text-red-500 text-sm mt-1">{errors.electionType}</p>}
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
                min={eventData.dateFrom === new Date().toISOString().split('T')[0] ? getCurrentTime() : "00:00"}
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
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Registered Student Voters</h2>
              <div className="bg-gray-100 px-4 py-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-600">Total Registered Voters:</span>
                  <span className="text-lg font-bold text-blue-800">
                    {Number(totalRegisteredVoters).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-m text-black mb-1">Eligible Voters Count</p>
                  <p className="font-medium text-blue-800 text-lg">      
                      {Number(eligibleCount).toLocaleString()} registered voters count
                  </p>
                </div>
              </div>
            </div>
          </div>

          {[
            { 
              category: 'programs', 
              label: 'Programs', 
              items: maintenanceData.programs.sort(sortPrograms),
              sortFn: sortPrograms
            },
            { 
              category: 'yearLevels', 
              label: 'Year Levels', 
              items: maintenanceData.yearLevels.sort(sortYearLevels),
              sortFn: sortYearLevels,
              customRender: true,
              render: () => (
                <YearLevelSelector 
                  yearLevels={maintenanceData.yearLevels.sort(sortYearLevels)}
                  selectedYearLevels={eventData.eligibleVoters.yearLevels}
                  onChange={(yearLevel) => handleCheckboxChange('yearLevels', yearLevel)}
                  selectedPrograms={eventData.eligibleVoters.programs}
                />
              )
            },
            { 
              category: 'semester', 
              label: 'Semester', 
              items: maintenanceData.semesters,
              readonly: true
            },
            { 
              category: 'gender', 
              label: 'Gender', 
              items: maintenanceData.genders.sort(sortGender),
              sortFn: sortGender
            },
            { 
              category: 'precinct', 
              label: 'Precinct', 
              items: maintenanceData.precincts.map(p => p.name).sort(sortPrecincts),
              sortFn: sortPrecincts,
              customRender: true,
              render: () => (
                <div className="space-y-4">
                  {maintenanceData.precincts.sort((a, b) => sortPrecincts(a.name, b.name)).map(precinct => (
                    <div key={precinct.id} className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <label 
                          className={`inline-flex items-center px-3 py-2 rounded-lg ${
                            eventData.eligibleVoters.precinct.includes(precinct.name)
                              ? 'bg-blue-100 border border-blue-300' 
                              : 'border border-gray-200'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={eventData.eligibleVoters.precinct.includes(precinct.name)}
                            onChange={() => handleCheckboxChange('precinct', precinct.name)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                          />
                          <span className="text-gray-700 font-medium">{precinct.name}</span>
                        </label>
                      </div>

                      {eventData.eligibleVoters.precinct.includes(precinct.name) && (
                        <div className="flex-grow">
                          <div className="flex justify-between items-center mb-2">
                            <button
                              onClick={() => toggleProgramSelection(precinct.name)}
                              className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                            >
                              {visibleProgramSelections[precinct.name] ? (
                                <>
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                  </svg>
                                  Hide Programs
                                </>
                              ) : (
                                <>
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                  </svg>
                                  Show Programs
                                </>
                              )}
                            </button>
                            {eventData.eligibleVoters.precinctPrograms[precinct.name]?.length > 0 && (
                              <span className="text-sm text-gray-500">
                                {eventData.eligibleVoters.precinctPrograms[precinct.name]?.length} program(s) selected
                              </span>
                            )}
                          </div>

                          {visibleProgramSelections[precinct.name] && eventData.eligibleVoters.programs.length > 0 && (
                            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                              <p className="text-sm font-medium text-gray-600 mb-2">Select programs for {precinct.name}:</p>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {eventData.eligibleVoters.programs.sort(sortPrograms).map(program => {
                                  const isAssignedToOther = isProgramAssignedToOtherPrecinct(program, precinct.name);
                                  const isChecked = eventData.eligibleVoters.precinctPrograms[precinct.name]?.includes(program) || false;
                                  
                                  return (
                                    <label 
                                      key={program} 
                                      className={`inline-flex items-center bg-white px-2 py-1 rounded ${
                                        isAssignedToOther && !isChecked ? 'opacity-50 cursor-not-allowed' : ''
                                      }`}
                                      title={isAssignedToOther && !isChecked ? 'This program is already assigned to another precinct' : ''}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => handlePrecinctProgramChange(precinct.name, program)}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                                        disabled={isAssignedToOther && !isChecked}
                                      />
                                      <span className={`text-sm ${isAssignedToOther && !isChecked ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {program}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            },
          ].map(({ category, label, items, note, readonly, sortFn, customRender, render }) => (
            <div key={category} className="border-b pb-4 last:border-b-0">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium text-black">{label}</h3>
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
              {note && (
                <p className={`text-sm ${category === 'semester' ? 'text-green-600 font-medium' : 'text-blue-600'} mb-2`}>
                  {note}
                </p>
              )}
              
              {customRender ? (
                render()
              ) : (
                category === 'semester' ? (
                  <div className="flex flex-wrap gap-3">
                    {maintenanceData.semesters.map((semester) => (
                      <label 
                        key={semester} 
                        className={`inline-flex items-center px-3 py-1 rounded-full ${
                          eventData.eligibleVoters.semester.includes(semester) 
                            ? 'bg-blue-100 border border-blue-300' 
                            : 'border border-gray-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name="semester"
                          checked={eventData.eligibleVoters.semester.includes(semester)}
                          disabled={semester !== currentSemester}
                          onChange={() => handleCheckboxChange('semester', semester)}
                          className={`rounded-md border-gray-300 text-black focus:ring-blue-500 mr-2 ${semester !== currentSemester ? 'opacity-60' : ''}`}
                        />
                        <span className="text-black">
                          {semester}
                        </span>
                      </label>
                    ))}
                    {!currentSemester && (
                      <p className="text-amber-600 mt-2 w-full">
                        No current semester has been set.
                      </p>
                    )}
                  </div>
                ) : (
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
                        <input
                          type="checkbox"
                          checked={eventData.eligibleVoters[category].includes(item)}
                          onChange={() => handleCheckboxChange(category, item)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                          disabled={readonly}
                        />
                        <span className="text-gray-700">{item}</span>
                      </label>
                    ))}
                  </div>
                )
              )}
              
              {!customRender && category !== 'semester' && eventData.eligibleVoters[category].length > 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  Selected: {eventData.eligibleVoters[category].sort(sortFn || ((a, b) => a.localeCompare(b))).join(", ")}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end mt-8 gap-4">
        {apiError && (
          <p className="text-red-500 text-sm mr-4 self-center">{apiError}</p>
        )}
        <button
          onClick={handlePreview}
          disabled={isLoading}
          className={`bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors ${
            isLoading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isLoading ? 'Processing...' : 'Next'}
        </button>
      </div>
    </div>
  );
}