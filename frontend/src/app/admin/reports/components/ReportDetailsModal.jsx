import { X } from "lucide-react";
import DepartmentVoterReport from "./DepartmentVoterReport";

const ReportDetailsModal = ({ isOpen, onClose, report }) => {
  if (!isOpen || !report) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-7xl max-h-[90vh] overflow-y-auto m-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-[#01579B]">Department Voter Report</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={24} />
            </button>
          </div>

          <DepartmentVoterReport electionId={report.electionId} />
        </div>
      </div>
    </div>
  );
};

export default ReportDetailsModal; 