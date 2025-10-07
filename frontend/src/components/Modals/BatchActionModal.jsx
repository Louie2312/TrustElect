'use client';

import React from 'react';

const BatchActionModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmButtonColor = "bg-red-500 hover:bg-red-600",
  cancelButtonColor = "bg-gray-300 hover:bg-gray-400",
  isLoading = false,
  type = "danger", // "danger", "warning", "info"
  children = null // For additional content like dropdowns
}) => {
  if (!isOpen) return null;

  // Determine colors based on type
  const getColors = () => {
    switch (type) {
      case "danger":
        return {
          confirm: "bg-red-500 hover:bg-red-600",
          cancel: "bg-gray-300 hover:bg-gray-400"
        };
      case "warning":
        return {
          confirm: "bg-orange-500 hover:bg-orange-600",
          cancel: "bg-gray-300 hover:bg-gray-400"
        };
      case "info":
        return {
          confirm: "bg-blue-500 hover:bg-blue-600",
          cancel: "bg-gray-300 hover:bg-gray-400"
        };
      default:
        return {
          confirm: confirmButtonColor,
          cancel: cancelButtonColor
        };
    }
  };

  const colors = getColors();

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
        {/* Title */}
        <h2 className="text-xl font-bold text-black text-center mb-4">
          {title}
        </h2>
        
        {/* Additional content (like dropdowns) */}
        {children && (
          <div className="mb-4">
            {children}
          </div>
        )}
        
        {/* Message */}
        <p className="text-black text-center mb-6">
          {message}
        </p>
        
        {/* Buttons */}
        <div className="flex justify-center gap-4">
          <button
            onClick={onClose}
            disabled={isLoading}
            className={`px-6 py-2 rounded text-black font-medium transition-colors ${
              colors.cancel
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-6 py-2 rounded text-white font-medium transition-colors ${
              colors.confirm
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BatchActionModal;
