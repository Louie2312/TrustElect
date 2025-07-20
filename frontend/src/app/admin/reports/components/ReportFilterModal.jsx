import { X } from "lucide-react";
import { useState } from "react";

const ReportFilterModal = ({ filters, onApply, onClose }) => {
  const [localFilters, setLocalFilters] = useState(filters);

  const handleApply = () => {
    onApply(localFilters);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-[#01579B]">Filter Report</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={24} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Range
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={localFilters.dateRange.start || ""}
                    onChange={(e) =>
                      setLocalFilters({
                        ...localFilters,
                        dateRange: { ...localFilters.dateRange, start: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#01579B]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">End Date</label>
                  <input
                    type="date"
                    value={localFilters.dateRange.end || ""}
                    onChange={(e) =>
                      setLocalFilters({
                        ...localFilters,
                        dateRange: { ...localFilters.dateRange, end: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#01579B]"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <select
                value={localFilters.department}
                onChange={(e) =>
                  setLocalFilters({ ...localFilters, department: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#01579B]"
              >
                <option value="All">All Departments</option>
                <option value="IT">Information Technology</option>
                <option value="CS">Computer Science</option>
                <option value="Business">Business</option>
                <option value="Engineering">Engineering</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Election Type
              </label>
              <select
                value={localFilters.electionType}
                onChange={(e) =>
                  setLocalFilters({ ...localFilters, electionType: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#01579B]"
              >
                <option value="All">All Types</option>
                <option value="Student Council">Student Council</option>
                <option value="Department">Department</option>
                <option value="Organization">Organization</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-2 bg-[#01579B] text-white rounded-md hover:bg-[#01416E] transition-colors duration-200"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportFilterModal; 