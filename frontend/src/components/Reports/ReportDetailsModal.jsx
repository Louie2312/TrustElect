"use client";

import { useState } from "react";
import { Download, X, Calendar, Filter, Users, BarChart2 } from "lucide-react";

export default function ReportDetailsModal({ report, onClose, onDownload }) {
  const [activeTab, setActiveTab] = useState("summary");
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [filters, setFilters] = useState({
    department: "All",
    electionType: "All",
  });

  const reportData = {
    summary: {
      totalElections: 4,
      activeElections: 2,
      completedElections: 2,
      upcomingElections: 1,
      totalUsers: 3835,
      totalAdmins: 2,
    },
    details: [
      { id: 1, name: "2025 Student Council Election", type: "Student Council", status: "Completed", startDate: "2025-06-23", endDate: "2025-06-24", voters: 228, turnout: "54%" },
    ],
    charts: [
      { name: "Voter Turnout", type: "bar", data: [78, 82, 65] },
      { name: "Election Types", type: "pie", data: [8, 4] },
    ],
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-opacity-100">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold text-black">{report.title}</h2>
              <p className="text-sm text-gray-600">{report.description}</p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex border-b mb-4">
            <button
              className={`px-4 py-2 font-medium ${activeTab === "summary" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-600"}`}
              onClick={() => setActiveTab("summary")}
            >
              Summary
            </button>
            <button
              className={`px-4 py-2 font-medium ${activeTab === "details" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-600"}`}
              onClick={() => setActiveTab("details")}
            >
              Details
            </button>
            <button
              className={`px-4 py-2 font-medium ${activeTab === "charts" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-600"}`}
              onClick={() => setActiveTab("charts")}
            >
              Charts
            </button>
          </div>

          <div className="mb-4 flex justify-between items-center">
            <div className="flex gap-2">
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  className="border p-2 pl-10 rounded text-sm text-black"
                  placeholder="Start date"
                />
              </div>
              <span className="self-center">to</span>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  className="border p-2 pl-10 rounded text-sm text-black"
                  placeholder="End date"
                />
              </div>
            </div>
            <button
              onClick={onDownload}
              className="flex items-center text-white bg-[#01579B] px-4 py-2 rounded hover:bg-[#01416E]"
            >
              <Download className="w-5 h-5 mr-2" />
              Download Report
            </button>
          </div>

          <div className="overflow-y-auto max-h-[50vh]">
            {activeTab === "summary" && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="border rounded-lg p-4">
                  <h3 className="text-sm font-medium text-black mb-1">Total Elections</h3>
                  <p className="text-2xl font-bold text-black">{reportData.summary.totalElections}</p>
                </div>
                <div className="border rounded-lg p-4">
                  <h3 className="text-sm font-medium text-black mb-1">Active Elections</h3>
                  <p className="text-2xl font-bold text-green-600">{reportData.summary.activeElections}</p>
                </div>
                <div className="border rounded-lg p-4">
                  <h3 className="text-sm font-medium text-black mb-1">Completed Elections</h3>
                  <p className="text-2xl font-bold text-blue-600">{reportData.summary.completedElections}</p>
                </div>
                <div className="border rounded-lg p-4">
                  <h3 className="text-sm font-medium text-black mb-1">Upcoming Elections</h3>
                  <p className="text-2xl font-bold text-orange-600">{reportData.summary.upcomingElections}</p>
                </div>
                <div className="border rounded-lg p-4">
                  <h3 className="text-sm font-medium text-black mb-1">Total Users</h3>
                  <p className="text-2xl font-bold text-black">{reportData.summary.totalUsers}</p>
                </div>
                <div className="border rounded-lg p-4">
                  <h3 className="text-sm font-medium text-black mb-1">Total Admins</h3>
                  <p className="text-2xl font-bold text-black">{reportData.summary.totalAdmins}</p>
                </div>
              </div>
            )}

            {activeTab === "details" && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-3 text-left text-sm font-medium text-black">Election Name</th>
                      <th className="p-3 text-left text-sm font-medium text-black">Type</th>
                      <th className="p-3 text-left text-sm font-medium text-black">Status</th>
                      <th className="p-3 text-left text-sm font-medium text-black">Dates</th>
                      <th className="p-3 text-left text-sm font-medium text-black">Voters</th>
                      <th className="p-3 text-left text-sm font-medium text-black">Votes Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.details.map((item) => (
                      <tr key={item.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 text-sm text-black">{item.name}</td>
                        <td className="p-3 text-sm text-black">{item.type}</td>
                        <td className="p-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            item.status === "Active" ? "bg-green-100 text-green-800" :
                            item.status === "Completed" ? "bg-blue-100 text-blue-800" :
                            "bg-gray-100 text-gray-800"
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="p-3 text-sm text-gray-600">{item.startDate} to {item.endDate}</td>
                        <td className="p-3 text-sm text-gray-600">{item.voters}</td>
                        <td className="p-3 text-sm text-gray-600">{item.turnout}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "charts" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-4">Voter Turnout</h3>
                  <div className="bg-gray-100 h-64 flex items-center justify-center">
                    <BarChart2 className="w-16 h-16 text-gray-400" />
                    <p className="text-gray-500">Chart will be displayed here</p>
                  </div>
                </div>
                <div className="border rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-4">Election Types</h3>
                  <div className="bg-gray-100 h-64 flex items-center justify-center">
                    <Users className="w-16 h-16 text-gray-400" />
                    <p className="text-gray-500">Chart will be displayed here</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}