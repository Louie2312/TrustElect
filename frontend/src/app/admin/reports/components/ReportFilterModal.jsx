import { X } from "lucide-react";

const ReportFilterModal = ({ filters, onApply, onClose }) => {
  const reportTypes = [
    { value: "All", label: "All Reports" },
    { value: "Voters", label: "Voter Reports" },
    { value: "Results", label: "Election Results" },
    { value: "Activity", label: "Activity Reports" },
    { value: "Summary", label: "Summary Reports" },
    { value: "Participation", label: "Participation Reports" },
    { value: "Candidates", label: "Candidate Reports" }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    onApply({
      ...filters,
      reportType: formData.get('reportType')
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md mx-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-black">Filter Reports</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Report Type
                </label>
                <select
                  name="reportType"
                  defaultValue={filters.reportType}
                  className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#01579B] text-black"
                >
                  {reportTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#01579B] text-white rounded hover:bg-[#01416E]"
              >
                Apply Filters
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReportFilterModal; 