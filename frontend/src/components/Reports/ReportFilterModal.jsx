"use client";

import { useState } from "react";
import { X } from "lucide-react";

export default function ReportFilterModal({ filters, onApply, onClose }) {
  const [localFilters, setLocalFilters] = useState(filters);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setLocalFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-opacity-100">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-black">Filter Reports</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
              <select
                name="reportType"
                value={localFilters.reportType}
                onChange={handleFilterChange}
                className="w-full p-2 border border-gray-300 rounded-md text-black"
              >
                <option value="All">All Types</option>
                <option value="Election">Election Reports</option>
                <option value="User">User Reports</option>
                <option value="Security">Security Reports</option>
                <option value="Audit">Audit Reports</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select
                name="department"
                value={localFilters.department}
                onChange={handleFilterChange}
                className="w-full p-2 border border-gray-300 rounded-md text-black"
              >
                <option value="All">All Departments</option>
                <option value="BSIT">BSIT</option>
                <option value="BSCS">BSCS</option>
                <option value="BSCPE">BSCPE</option>
                <option value="BMMA">BMMA</option>
                <option value="BSHM">BSHM</option>
                <option value="BSTM">BSTM</option>
                <option value="BSA">BSA</option>
                <option value="BSBAOM">BSBAOM</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Election Type</label>
              <select
                name="electionType"
                value={localFilters.electionType}
                onChange={handleFilterChange}
                className="w-full p-2 border border-gray-300 rounded-md text-black"
              >
                <option value="All">All Types</option>
                <option value="Departmental">Departmental</option>
                <option value="University">University-wide</option>
                <option value="Organization">Organization</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  className="border p-2 rounded text-black"
                  placeholder="Start date"
                />
                <input
                  type="date"
                  className="border p-2 rounded text-black"
                  placeholder="End date"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-black bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onApply(localFilters)}
              className="px-4 py-2 text-white bg-[#01579B] rounded-md hover:bg-[#01416E]"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}