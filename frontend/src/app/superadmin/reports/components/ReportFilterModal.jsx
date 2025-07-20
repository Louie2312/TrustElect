"use client";

import { useState } from "react";
import { X } from "lucide-react";

export default function ReportFilterModal({ filters, onApply, onClose }) {
  const [localFilters, setLocalFilters] = useState(filters);

  const handleApply = () => {
    onApply(localFilters);
  };

  const reportCategories = [
    { value: "All", label: "All Reports" },
    { value: "Election", label: "Election Reports" },
    { value: "Users", label: "User Reports" },
    { value: "Security", label: "Security Reports" },
    { value: "Audit", label: "Audit Reports" },
    { value: "System", label: "System Reports" },
    { value: "Admin", label: "Admin Reports" }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-black">Filter Reports</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Report Category
              </label>
              <select
                className="w-full border rounded p-2 text-black"
                value={localFilters.reportType}
                onChange={(e) =>
                  setLocalFilters((prev) => ({
                    ...prev,
                    reportType: e.target.value,
                  }))
                }
              >
                {reportCategories.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button
              onClick={() => {
                setLocalFilters({
                  reportType: "All"
                });
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Reset
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-2 bg-[#01579B] text-white rounded hover:bg-[#01416E]"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}