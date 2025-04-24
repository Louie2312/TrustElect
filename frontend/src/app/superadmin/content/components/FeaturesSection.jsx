"use client"
import { useState } from 'react';

const FeaturesSection = ({ 
  landingContent, 
  updateFeature, 
  saveSectionContent, 
  formatImageUrl, 
  handleFileUpload, 
  removeImage, 
  addFeatureCard,
  deleteFeatureCard,
  showPreview,
  handleFeatureCard1Upload
}) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-base font-medium text-black">Feature Cards</h2>
          <p className="text-xs text-gray-600 mt-1">Feature card colors are now managed through the Themes tab</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={addFeatureCard}
            className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
          >
            Add Card
          </button>
          <button
            onClick={() => saveSectionContent('features')}
            className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
          >
            Update Features
          </button>
        </div>
      </div>
      
      {landingContent.features.columns.map((feature, index) => (
        <div key={index} className="border rounded p-3 mb-3">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-black">Feature {index + 1}</h3>
            {landingContent.features.columns.length > 1 && (
              <button
                onClick={() => deleteFeatureCard(index)}
                className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded hover:bg-red-200"
              >
                Delete
              </button>
            )}
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-black mb-1">
                Title
              </label>
              <input 
                type="text" 
                value={feature.title}
                onChange={(e) => updateFeature(index, 'title', e.target.value)}
                className="w-full px-2 py-1 border rounded-md text-black"
              />
            </div>
            
            <div>
              <label className="block text-xs text-black mb-1">
                Description
              </label>
              <textarea 
                value={feature.description}
                onChange={(e) => updateFeature(index, 'description', e.target.value)}
                rows="2"
                className="w-full px-2 py-1 border rounded-md text-black"
              />
            </div>

            <div>
              <label className="block text-xs text-black mb-1">
                Image for Feature {index + 1}
              </label> 
              <div className="flex items-center">
                {index === 0 ? (
                  <div className="w-full">
                    <div className="p-1 border border-blue-300 rounded bg-blue-50">
                      <p className="text-xs text-blue-800 mb-1 font-semibold">Feature Card 1 Image Upload</p>
                      <input 
                        type="file" 
                        accept="image/jpeg,image/png,image/webp"
                        data-feature-index="0"
                        data-section="feature"
                        id="feature-image-0"
                        name="feature-image-0"
                        onChange={(e) => handleFeatureCard1Upload(e)}
                        className="w-full border rounded p-1 text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-blue-50 file:text-black" 
                      />
                    </div>
                  </div>
                ) : (
                  <input 
                    type="file" 
                    accept="image/jpeg,image/png,image/webp"
                    data-feature-index={index}
                    id={`feature-image-${index}`}
                    onChange={(e) => handleFileUpload('featureImage', index, e)}
                    className="w-full border rounded p-1 text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-blue-50 file:text-black" 
                  />
                )}
                {feature.imageUrl && (
                  <button
                    onClick={() => removeImage('featureImage', index)}
                    className="ml-2 bg-red-100 text-red-800 px-2 py-1 rounded text-xs hover:bg-red-200"
                    title="Remove image"
                  >
                    Remove
                  </button>
                )}
              </div>
              {feature.imageUrl && (
                <div className="mt-2">
                  {feature.imageUrl.startsWith('blob:') ? (
                    <p className="text-xs text-blue-600">New image selected (not yet saved)</p>
                  ) : (
                    <p className="mt-1 text-xs text-black truncate">
                      Current: {feature.imageUrl}
                    </p>
                  )}
                  <div className="mt-1 h-12 w-12 border rounded overflow-hidden">
                    <img 
                      src={formatImageUrl(feature.imageUrl)} 
                      alt={`Feature ${index + 1}`}
                      className="h-full w-full object-cover" 
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Feature preview - only shown if content has changed or preview is toggled */}
            {showPreview && (
              <div className="border rounded-md overflow-hidden">
                <div className="bg-gray-100 px-3 py-1 border-b flex justify-between items-center">
                  <span className="text-xs font-medium text-black">Preview</span>
                  <span className="text-xs text-blue-600">Pending save</span>
                </div>
                <div className="shadow-sm" style={{backgroundColor: feature.bgColor || '#ffffff', color: feature.textColor || '#000000'}}>
                  {feature.imageUrl && (
                    <div className="h-40 overflow-hidden">
                      <img 
                        src={formatImageUrl(feature.imageUrl)} 
                        alt={feature.title} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  <div className="p-3">
                    <h3 className="text-md font-medium mb-1" style={{color: feature.textColor || '#000000'}}>{feature.title}</h3>
                    <p className="text-sm" style={{color: feature.textColor || '#000000'}}>{feature.description}</p>
                    <p className="text-xs text-gray-500 mt-2 italic">Colors will be applied from the active theme</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default FeaturesSection; 