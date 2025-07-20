"use client";

import { FileText, Users, Download } from "lucide-react";

export default function ReportCard({ report, onView, onDownload }) {
  return (
    <div className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-white">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <Users className="w-8 h-8 text-[#01579B]" />
          <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">
            {report.type}
          </span>
        </div>
        
        <h3 className="text-lg font-semibold mb-2 text-black">{report.title}</h3>
        <p className="text-sm text-gray-600 mb-4">{report.description}</p>
        
        <div className="flex gap-2">
          <button
            onClick={onView}
            className="flex-1 text-sm bg-blue-100 text-blue-600 px-3 py-2 rounded hover:bg-blue-200"
          >
            View
          </button>
          <button
            onClick={onDownload}
            className="text-sm bg-gray-100 text-gray-600 p-2 rounded hover:bg-gray-200"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
} 