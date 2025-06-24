import { useState } from 'react';
import { Upload, X, Eye, Check, Trash2 } from 'lucide-react';
import Image from 'next/image';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function StudentsSection({ 
  landingContent, 
  updateStudentUI, 
  saveSectionContent, 
  formatImageUrl,
  handleFileUpload,
  removeImage,
  showPreview 
}) {
  const [activeTab, setActiveTab] = useState('background');
  const [saving, setSaving] = useState(false);
  const [showLandingPreview, setShowLandingPreview] = useState(false);

  const handleApplyDesign = async (type) => {
    console.log(`Applying design type: ${type}`);
    setSaving(true);
    
    try {
      // Get the auth token
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      if (type === 'landing') {
        // For landing design, make a direct database update
        console.log('Applying landing design with direct database update');
        
        // Make a direct database update for landing design
        const directUpdateResponse = await fetch(`${API_URL}/api/studentUI/force-landing`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!directUpdateResponse.ok) {
          const errorText = await directUpdateResponse.text();
          throw new Error(`Server error: ${errorText}`);
        }
        
        const directUpdateData = await directUpdateResponse.json();
        console.log('Direct update response:', directUpdateData);
        
        // Update local state to match server state
        updateStudentUI('type', 'landing');
        updateStudentUI('use_landing_design', true);
        updateStudentUI('backgroundImage', null);
        
      } else {
        // For poster design
        console.log('Applying poster design');
        
        // Check if we have a background image to apply
        const backgroundImage = landingContent.studentUI?.backgroundImage;
        
        if (!backgroundImage) {
          throw new Error('No background image available. Please upload an image first.');
        }
        
        // Update local state
        updateStudentUI('type', 'poster');
        updateStudentUI('use_landing_design', false);
        
        // Create form data for the request
        const formData = new FormData();
        formData.append('content', JSON.stringify({
          type: 'poster',
          use_landing_design: false,
          existing_background_image: backgroundImage
        }));
        
        // Make the request
        const response = await fetch(`${API_URL}/api/studentUI`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Server error: ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Server response:', data);
      }
      
      // Show success message
      alert(`${type === 'landing' ? 'Landing page' : 'Background poster'} design has been applied successfully. The page will now reload.`);
      
      // Force a complete page reload
      window.location.reload(true);
      
    } catch (error) {
      console.error('Error applying design:', error);
      alert(`Failed to apply design: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveDesign = async () => {
    setSaving(true);
    
    try {
      // Get the auth token
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      // Check what design is currently active to show appropriate message
      const currentDesign = landingContent.studentUI?.type === 'landing' ? 'landing page' : 'background';
      
      // Update local state
      updateStudentUI('type', 'poster');
      updateStudentUI('use_landing_design', false);
      updateStudentUI('backgroundImage', null);
      
      // Create form data for the request
      const formData = new FormData();
      formData.append('content', JSON.stringify({
        type: 'poster',
        use_landing_design: false,
        existing_background_image: null
      }));
      formData.append('removeBackground', 'true');
      
      // Make the request
      const response = await fetch(`${API_URL}/api/studentUI`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Remove design response:', data);
      
      // Show success message
      alert(`The ${currentDesign} design has been removed successfully. The page will now reload.`);
      
      // Force a complete page reload
      window.location.reload(true);
    } catch (error) {
      console.error('Error removing design:', error);
      alert(`Failed to remove design: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const LandingPreview = () => (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header Preview */}
      <div className="w-full flex justify-between items-center p-4 bg-[#01579B] shadow-md">
        <h1 className="text-xl font-bold flex items-center">
          {landingContent.logo?.imageUrl ? (
            <img 
              src={formatImageUrl(landingContent.logo.imageUrl)}
              alt="Site Logo" 
              className="h-10 mr-2"
            />
          ) : (
            <div className="h-10 w-10 bg-blue-800 mr-2"></div>
          )}
          <span className="text-white">TrustElect</span>
        </h1>
      </div>

      {/* Hero Section Preview */}
      <div 
        className="p-8"
        style={{
          backgroundColor: landingContent.hero?.bgColor || '#01579B',
          color: landingContent.hero?.textColor || '#ffffff',
          backgroundImage: landingContent.hero?.posterImage ? `url(${formatImageUrl(landingContent.hero.posterImage)})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="max-w-4xl mx-auto">
          <h2 
            className="text-3xl font-bold mb-4"
            style={{ color: landingContent.hero?.textColor || '#ffffff' }}
          >
            {landingContent.hero?.title || 'Welcome to TrustElect'}
          </h2>
          <p 
            className="text-xl"
            style={{ color: landingContent.hero?.textColor || '#ffffff' }}
          >
            {landingContent.hero?.subtitle || 'Your trusted voting platform'}
          </p>
        </div>
      </div>

      {/* Features Preview */}
      <div className="p-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-center mb-8 text-gray-800">Key Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {landingContent.features?.columns?.map((feature, index) => (
              <div 
                key={index}
                className="p-4 rounded-lg shadow"
                style={{
                  backgroundColor: feature.bgColor || '#ffffff',
                  color: feature.textColor || '#000000'
                }}
              >
                {feature.imageUrl && (
                  <div className="mb-4">
                    <img
                      src={formatImageUrl(feature.imageUrl)}
                      alt={feature.title}
                      className="w-full h-32 object-cover rounded"
                    />
                  </div>
                )}
                <h4 
                  className="text-lg font-semibold mb-2"
                  style={{ color: feature.textColor || '#000000' }}
                >
                  {feature.title}
                </h4>
                <p style={{ color: feature.textColor || '#000000' }}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Call to Action Preview */}
      {landingContent.callToAction?.enabled && (
        <div 
          className="p-8"
          style={{
            backgroundColor: landingContent.callToAction?.bgColor || '#1e3a8a',
            color: landingContent.callToAction?.textColor || '#ffffff'
          }}
        >
          <div className="max-w-4xl mx-auto text-center">
            <h3 
              className="text-2xl font-bold mb-4"
              style={{ color: landingContent.callToAction?.textColor || '#ffffff' }}
            >
              {landingContent.callToAction?.title || 'Ready to Vote?'}
            </h3>
            <p 
              className="text-lg"
              style={{ color: landingContent.callToAction?.textColor || '#ffffff' }}
            >
              {landingContent.callToAction?.subtitle || 'Start your experience with TrustElect'}
            </p>
          </div>
        </div>
      )}

      {/* Footer Preview */}
      <div className="bg-[#01579B] text-white py-4 px-6">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-white">TrustElect</h2>
              <p className="text-white text-sm">STI TrustElect Voting System</p>
            </div>
            <div className="text-white text-sm">
              © {new Date().getFullYear()} TrustElect
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const BackgroundDesignTab = () => (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h3 className="text-md font-medium mb-4 text-black">Background Poster Design</h3>
      <div className="mt-2">
        {landingContent.studentUI?.backgroundImage ? (
          <div className="relative">
            <img
              src={formatImageUrl(landingContent.studentUI.backgroundImage)}
              alt="Background"
              className="max-w-lg rounded-lg shadow-sm"
            />
            <button
              onClick={() => {
                if (confirm('Are you sure you want to remove this background image?')) {
                  removeImage('studentBackground');
                  // If we're in poster design, this will leave us with no background
                  // Update local state to reflect this
                  if (landingContent.studentUI?.type === 'poster') {
                    updateStudentUI('backgroundImage', null);
                  }
                }
              }}
              className="absolute top-2 right-2 p-1 bg-red-100 rounded-full text-red-600 hover:bg-red-200"
              title="Remove background image"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="max-w-lg border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
            <label className="cursor-pointer block">
              <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
              <span className="text-sm text-black">Click to upload background image</span>
              <input
                type="file"
                id="student-background-input"
                name="backgroundImage"
                className="hidden"
                accept="image/*"
                onChange={(e) => handleFileUpload('studentBackground', null, e)}
              />
            </label>
          </div>
        )}
        <p className="mt-2 text-sm text-black">
          Recommended size: 1920x1080px. Max file size: 5MB. Supported formats: JPG, PNG
        </p>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => handleApplyDesign('poster')}
          disabled={saving || !landingContent.studentUI?.backgroundImage}
          className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 ${
            (saving || !landingContent.studentUI?.backgroundImage) ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <Check className="w-4 h-4" />
          Apply Background Design
        </button>
      </div>
      
      {/* Status message */}
      {landingContent.studentUI?.type === 'poster' && landingContent.studentUI?.backgroundImage && (
        <div className="mt-3 p-2 bg-green-100 text-green-800 rounded-md text-sm flex items-center">
          <Check className="w-4 h-4 mr-1" />
          Background design is currently active
        </div>
      )}
      
      {landingContent.studentUI?.type === 'landing' && (
        <div className="mt-3 p-2 bg-yellow-100 text-yellow-800 rounded-md text-sm">
          Landing page design is currently active. Applying background design will disable landing page design.
        </div>
      )}
    </div>
  );

  const LandingDesignTab = () => (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h3 className="text-md font-medium mb-4 text-black">Landing Page Design</h3>
      <p className="text-sm text-black mb-4">
        Apply the landing page design to the student dashboard. This will use the same design as your main landing page.
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => setShowLandingPreview(true)}
          className="px-4 py-2 bg-gray-100 text-black rounded-md hover:bg-gray-200 transition-colors flex items-center gap-2"
        >
          <Eye className="w-4 h-4" />
          Preview Design
        </button>
        <button
          onClick={() => handleApplyDesign('landing')}
          disabled={saving}
          className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 ${
            saving ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <Check className="w-4 h-4" />
          Apply Landing Design
        </button>
      </div>
      
      {/* Status message */}
      {landingContent.studentUI?.type === 'landing' && (
        <div className="mt-3 p-2 bg-green-100 text-green-800 rounded-md text-sm flex items-center">
          <Check className="w-4 h-4 mr-1" />
          Landing page design is currently active
        </div>
      )}
      
      {landingContent.studentUI?.type === 'poster' && landingContent.studentUI?.backgroundImage && (
        <div className="mt-3 p-2 bg-yellow-100 text-yellow-800 rounded-md text-sm">
          Background design is currently active. Applying landing design will disable background design.
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4 text-black">Student Dashboard Design</h2>
        
        {/* Tab Navigation */}
        <div className="flex border-b mb-6">
          <button
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'background' 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('background')}
          >
            Background Design
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'landing' 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('landing')}
          >
            Landing Page Design
          </button>
        </div>
        
        {/* Tab Content */}
        <div className="mb-8">
          {activeTab === 'background' ? <BackgroundDesignTab /> : <LandingDesignTab />}
        </div>
        
        {/* Remove Design Button - Always at the bottom */}
        <div className="mt-8 pt-4 border-t">
          <button
            onClick={handleRemoveDesign}
            disabled={saving}
            className={`px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center gap-2 ${
              saving ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Trash2 className="w-4 h-4" />
            Remove All Design
          </button>
        </div>
      </div>

      {/* Landing Page Preview Modal */}
      {showLandingPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold text-black">Landing Page Design Preview</h3>
              <button
                onClick={() => setShowLandingPreview(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5 text-black" />
              </button>
            </div>
            <div className="p-4">
              <LandingPreview />
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 