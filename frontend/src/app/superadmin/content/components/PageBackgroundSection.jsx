"use client";

import { useState, useRef } from "react";
import { Upload, X, Image as ImageIcon, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import Cookies from "js-cookie";

const PageBackgroundSection = ({ 
  landingContent, 
  setLandingContent, 
  section, 
  sectionName,
  onSave 
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setIsUploading(true);

    try {
      // Create a local URL for immediate preview
      const localUrl = URL.createObjectURL(file);
      
      // Update the landing content with the new background image
      setLandingContent(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          backgroundImage: localUrl
        }
      }));

      toast.success(`${sectionName} background updated successfully! Click Save to apply changes.`);

    } catch (error) {
      console.error('Error uploading background:', error);
      toast.error('Failed to upload background image');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeBackground = () => {
    setLandingContent(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        backgroundImage: null
      }
    }));
    toast.success(`${sectionName} background removed`);
  };

  const currentBackground = landingContent[section]?.backgroundImage;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">
        {sectionName} Background
      </h3>
      
      <div className="space-y-4">
        {/* Current Background Preview */}
        {currentBackground && (
          <div className="relative">
            <div className="text-sm font-medium text-gray-700 mb-2">Current Background:</div>
            <div className="relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden border">
              <img
                src={currentBackground}
                alt={`${sectionName} background`}
                className="w-full h-full object-cover"
              />
              <button
                onClick={removeBackground}
                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
                title="Remove background"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Upload Section */}
        <div 
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            disabled={isUploading}
          />
          
          <div className="flex flex-col items-center space-y-3">
            <div className="p-3 bg-blue-100 rounded-full">
              {isUploading ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              ) : (
                <ImageIcon className="w-8 h-8 text-blue-600" />
              )}
            </div>
            
            <div>
              <div className="text-blue-600 hover:text-blue-700 font-medium">
                {isUploading ? 'Uploading...' : 'Click to Upload Background Image'}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                PNG, JPG, JPEG up to 5MB
              </p>
            </div>
          </div>
        </div>

        {/* Simple Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-700">
            The uploaded image will automatically cover the entire section while keeping all content visible on top.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between mt-4">
          {currentBackground && (
            <button
              onClick={removeBackground}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
            >
              Remove Background
            </button>
          )}
          <button
            onClick={() => onSave && onSave(section)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default PageBackgroundSection;
