"use client"
import { useState } from 'react';

const CTASection = ({ 
  landingContent, 
  updateCTA, 
  saveSectionContent, 
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
                <div className="relative">
                  <div 
                    className="p-4 rounded-lg text-center shadow-sm relative"
                    style={{
                      backgroundColor: landingContent.callToAction.bgColor || '#1e3a8a',
                      color: landingContent.callToAction.textColor || '#ffffff'
                    }}
                  >
                    <div>
                      <h3 className="text-lg font-bold mb-2" style={{color: landingContent.callToAction.textColor || '#ffffff'}}>
                        {landingContent.callToAction.title}
                      </h3>
                      <p className="text-sm mb-3" style={{color: landingContent.callToAction.textColor || '#ffffff'}}>
                        {landingContent.callToAction.subtitle}
                      </p>
                      <button className="px-4 py-2 bg-white rounded shadow-sm font-medium" style={{color: landingContent.callToAction.bgColor || '#1e3a8a'}}>
                        {landingContent.callToAction.buttonText || "Contact Us"}
                      </button>
                    </div>
                  </div>
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