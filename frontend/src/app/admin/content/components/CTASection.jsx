"use client"
import { useState } from 'react';

const CTASection = ({ 
  landingContent, 
  updateCTA, 
  saveSectionContent, 
  formatImageUrl,
  handleFileUpload,
  removeImage,
  showPreview
}) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-base font-medium text-black">Engagement Section</h2>
        <button
          onClick={() => saveSectionContent('callToAction')}
          className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
        >
          Update Engagement Section
        </button>
      </div>
      
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-black mb-1">
            Section Purpose
          </label>
          <select
            value={landingContent.callToAction.purpose || 'default'}
            onChange={(e) => updateCTA('purpose', e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-black"
          >
            <option value="default">Default</option>
            <option value="contact">Contact Us</option>
            <option value="learn">Learn More</option>

          </select>
        </div>
      
        <div>
          <label className="block text-sm font-medium text-black mb-1">
            Title
          </label>
          <input 
            type="text" 
            value={landingContent.callToAction.title}
            onChange={(e) => updateCTA('title', e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-black"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-black mb-1">
            Subtitle
          </label>
          <textarea 
            value={landingContent.callToAction.subtitle}
            onChange={(e) => updateCTA('subtitle', e.target.value)}
            rows="2"
            className="w-full px-3 py-2 border rounded-md text-black"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-black mb-1">
            Button Text
          </label>
          <input 
            type="text" 
            value={landingContent.callToAction.buttonText || "Contact Us"}
            onChange={(e) => updateCTA('buttonText', e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-black"
          />
        </div>
        
       
        {/* Color pickers for CTA section */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Background Color
            </label>
            <div className="flex items-center">
              <input 
                type="color" 
                value={landingContent.callToAction.bgColor || "#1e3a8a"}
                onChange={(e) => updateCTA('bgColor', e.target.value)}
                className="h-10 w-10 border rounded"
              />
              <input 
                type="text"
                value={landingContent.callToAction.bgColor || "#1e3a8a"}
                onChange={(e) => updateCTA('bgColor', e.target.value)}
                className="w-full ml-2 px-3 py-2 border rounded-md text-black"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Text Color
            </label>
            <div className="flex items-center">
              <input 
                type="color" 
                value={landingContent.callToAction.textColor || "#ffffff"}
                onChange={(e) => updateCTA('textColor', e.target.value)}
                className="h-10 w-10 border rounded"
              />
              <input 
                type="text"
                value={landingContent.callToAction.textColor || "#ffffff"}
                onChange={(e) => updateCTA('textColor', e.target.value)}
                className="w-full ml-2 px-3 py-2 border rounded-md text-black"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-black mb-1">
            Background Video
          </label>
          <div className="flex items-center">
            <input 
              id="cta-video-input"
              type="file" 
              accept="video/mp4,video/webm"
              onChange={(e) => handleFileUpload('ctaVideo', null, e)}
              className="w-full border rounded p-1 text-sm file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-blue-50 file:text-black text-black"
            />
            {landingContent.callToAction.videoUrl && (
              <button
                onClick={() => removeImage('ctaVideo')}
                className="ml-2 bg-red-100 text-red-800 px-2 py-1 rounded text-xs hover:bg-red-200"
                title="Remove video"
              >
                Remove
              </button>
            )}
          </div>
          {landingContent.callToAction.videoUrl && !landingContent.callToAction.videoUrl.startsWith('blob:') && (
            <p className="mt-1 text-xs text-black truncate">
              Current: {landingContent.callToAction.videoUrl}
            </p>
          )}
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="cta-enabled"
            checked={landingContent.callToAction.enabled}
            onChange={(e) => updateCTA('enabled', e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600"
          />
          <label htmlFor="cta-enabled" className="ml-2 text-sm text-black">
            Display this section
          </label>
        </div>
        
        {/* CTA preview */}
        {showPreview && (
          <div className="border rounded overflow-hidden">
            <div className="bg-gray-100 px-3 py-2 border-b flex justify-between items-center">
              <span className="text-sm font-medium text-black">Preview</span>
              <span className="text-xs text-blue-600">Pending save</span>
            </div>
            <div className="p-4">
              {landingContent.callToAction.enabled ? (
                <div className="space-y-4">
                  {/* Title above the video */}
                  <div className="text-center">
                    <h3 
                      className="text-2xl font-bold drop-shadow-2xl"
                      style={{color: landingContent.callToAction.textColor || '#ffffff'}}
                    >
                      {landingContent.callToAction.title}
                    </h3>
                  </div>

                  {/* Video container - Same aspect ratio as hero */}
                  {landingContent.callToAction.videoUrl ? (
                    <div 
                      className="w-full aspect-video rounded-lg overflow-hidden shadow-sm"
                      style={{
                        backgroundColor: landingContent.callToAction.bgColor || '#1e3a8a'
                      }}
                    >
                      <video
                        src={formatImageUrl(landingContent.callToAction.videoUrl)}
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="w-full h-full object-cover rounded-lg"
                        onError={(e) => {
                          console.error("Error loading CTA video in preview:", landingContent.callToAction.videoUrl);
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                    <div 
                      className="w-full aspect-video flex items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-700"
                    >
                      <p className="text-sm text-white">No video uploaded</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 bg-gray-100 rounded-lg border-2 border-dashed">
                  <p className="text-black text-sm">Section disabled</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CTASection; 