"use client"
import { useState } from 'react';

const ThemesSection = ({ 
  themes, 
  setThemes, 
  activeTheme, 
  setActiveTheme, 
  newTheme, 
  setNewTheme, 
  saveThemes,
  setSaveStatus,
  applyThemeColors,
  handleThemeColorChange
}) => {
  const [editingTheme, setEditingTheme] = useState(null);
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-base font-medium text-black">Theme Management</h2>
          <p className="text-xs text-gray-600 mt-1">
            Themes control all colors site-wide including:
          </p>
          <ul className="list-disc ml-5 mt-1 text-xs text-gray-600">
            <li>Banner background and text</li>
            <li>Features section background</li>
            <li>Feature cards background and text</li>
            <li>Call-to-action section background and text</li>
          </ul>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => {
              // Create a new theme and add it to the themes list
              const newThemeObj = {
                id: themes.length + 1,
                name: newTheme.name || `Theme ${themes.length + 1}`,
                isActive: false,
                colors: { ...newTheme.colors }
              };
              const updatedThemes = [...themes, newThemeObj];
              setThemes(updatedThemes);
              // Save to localStorage
              saveThemes(updatedThemes);
              // Reset the new theme form
              setNewTheme({
                name: "",
                colors: {
                  heroBg: "#1e40af",
                  heroText: "#ffffff",
                  featureBg: "#ffffff",
                  featureText: "#000000",
                  ctaBg: "#1e3a8a",
                  ctaText: "#ffffff"
                }
              });
              setSaveStatus("New theme created");
              setTimeout(() => setSaveStatus(""), 3000);
            }}
            className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
          >
            Add Theme
          </button>
        </div>
      </div>
      
      {/* Existing Themes */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-black">Available Themes</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {themes.map((theme, index) => (
            <div 
              key={theme.id} 
              className={`border rounded-md p-3 ${theme.isActive ? 'border-blue-500 ring-2 ring-blue-200' : ''}`}
            >
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium text-black">{theme.name}</h4>
                <div className="flex space-x-2">
                  {!theme.isActive && (
                    <button
                      onClick={() => {
                        // Set this theme as active
                        const updatedThemes = themes.map(t => ({
                          ...t,
                          isActive: t.id === theme.id
                        }));
                        setThemes(updatedThemes);
                        setActiveTheme(theme);
                        // Save to localStorage
                        saveThemes(updatedThemes);
                        setSaveStatus(`Theme "${theme.name}" activated`);
                        setTimeout(() => setSaveStatus(""), 3000);
                        
                        // Apply theme colors to current content
                        applyThemeColors(theme);
                      }}
                      className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                    >
                      Apply Theme
                    </button>
                  )}
                  {theme.isActive && (
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                      Active
                    </span>
                  )}
                  <button
                    onClick={() => setEditingTheme(theme)}
                    className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded hover:bg-yellow-200"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      // Remove the theme
                      if (theme.isActive) {
                        setSaveStatus("Cannot delete the active theme");
                        setTimeout(() => setSaveStatus(""), 3000);
                        return;
                      }
                      const updatedThemes = themes.filter(t => t.id !== theme.id);
                      setThemes(updatedThemes);
                      // Save to localStorage
                      saveThemes(updatedThemes);
                      setSaveStatus("Theme deleted");
                      setTimeout(() => setSaveStatus(""), 3000);
                    }}
                    className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded hover:bg-red-200"
                    disabled={theme.isActive}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="flex items-center">
                  <div 
                    className="w-6 h-6 rounded-full mr-2 border" 
                    style={{ backgroundColor: theme.colors.heroBg }}
                  ></div>
                  <span className="text-xs text-gray-600">Hero Bg</span>
                </div>
                <div className="flex items-center">
                  <div 
                    className="w-6 h-6 rounded-full mr-2 border" 
                    style={{ backgroundColor: theme.colors.heroText }}
                  ></div>
                  <span className="text-xs text-gray-600">Hero Text</span>
                </div>
                <div className="flex items-center">
                  <div 
                    className="w-6 h-6 rounded-full mr-2 border" 
                    style={{ backgroundColor: theme.colors.featureSectionBg }}
                  ></div>
                  <span className="text-xs text-gray-600">Features Section</span>
                </div>
                <div className="flex items-center">
                  <div 
                    className="w-6 h-6 rounded-full mr-2 border" 
                    style={{ backgroundColor: theme.colors.featureBg }}
                  ></div>
                  <span className="text-xs text-gray-600">Feature Cards</span>
                </div>
                <div className="flex items-center">
                  <div 
                    className="w-6 h-6 rounded-full mr-2 border" 
                    style={{ backgroundColor: theme.colors.featureText }}
                  ></div>
                  <span className="text-xs text-gray-600">Feature Text</span>
                </div>
                <div className="flex items-center">
                  <div 
                    className="w-6 h-6 rounded-full mr-2 border" 
                    style={{ backgroundColor: theme.colors.ctaBg }}
                  ></div>
                  <span className="text-xs text-gray-600">CTA Bg</span>
                </div>
                <div className="flex items-center">
                  <div 
                    className="w-6 h-6 rounded-full mr-2 border" 
                    style={{ backgroundColor: theme.colors.ctaText }}
                  ></div>
                  <span className="text-xs text-gray-600">CTA Text</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Edit Theme Form (shows only when editing) */}
      {editingTheme && (
        <EditThemeForm 
          theme={editingTheme}
          setTheme={setEditingTheme}
          themes={themes}
          setThemes={setThemes}
          saveThemes={saveThemes}
          setSaveStatus={setSaveStatus}
          activeTheme={activeTheme}
          setActiveTheme={setActiveTheme}
          applyThemeColors={applyThemeColors}
        />
      )}
      
      {/* Create New Theme Form */}
      {!editingTheme && (
        <ThemeCreationForm 
          newTheme={newTheme}
          setNewTheme={setNewTheme}
          handleThemeColorChange={handleThemeColorChange}
          themes={themes}
          setThemes={setThemes}
          saveThemes={saveThemes}
          setSaveStatus={setSaveStatus}
        />
      )}
      
      {/* Color Preview Section */}
      {!editingTheme && <ColorPreview newTheme={newTheme} />}
      
      {/* Theme UI Preview */}
      {!editingTheme && <ThemeUIPreview newTheme={newTheme} />}
    </div>
  );
}

// Theme Creation Form Component
const ThemeCreationForm = ({ 
  newTheme,
  setNewTheme,
  handleThemeColorChange,
  themes,
  setThemes,
  saveThemes,
  setSaveStatus
}) => {
  return (
    <div className="border rounded-md p-4 mt-6">
      <h3 className="text-sm font-medium text-black mb-3">Create New Theme</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-gray-700 mb-1">Theme Name</label>
          <input
            type="text"
            value={newTheme.name}
            onChange={(e) => setNewTheme({...newTheme, name: e.target.value})}
            placeholder="Enter theme name"
            className="w-full px-3 py-2 border rounded-md text-black"
          />
        </div>
        
        {/* Color pickers for theme */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 mt-3">
          <div className="space-y-3">
            <ColorPickerField 
              label="Primary Color"
              description="(buttons, accents)"
              id="primaryColor"
              value={newTheme.colors.primary}
              onChange={(value) => handleThemeColorChange('primary', value)}
            />

            <ColorPickerField 
              label="Secondary Color"
              description="(highlights, focus)"
              id="secondaryColor"
              value={newTheme.colors.secondary}
              onChange={(value) => handleThemeColorChange('secondary', value)}
            />

            <ColorPickerField 
              label="Hero Background"
              description="(main banner)"
              id="heroBg"
              value={newTheme.colors.heroBg}
              onChange={(value) => handleThemeColorChange('heroBg', value)}
            />

            <ColorPickerField 
              label="Hero Text"
              description="(banner text)"
              id="heroText"
              value={newTheme.colors.heroText}
              onChange={(value) => handleThemeColorChange('heroText', value)}
            />
          </div>

          <div className="space-y-3">
            <ColorPickerField 
              label="Feature Section Background"
              description="(features area)"
              id="featureSectionBg"
              value={newTheme.colors.featureSectionBg}
              onChange={(value) => handleThemeColorChange('featureSectionBg', value)}
            />

            <ColorPickerField 
              label="Feature Card Background"
              description="(card bg)"
              id="featureBg"
              value={newTheme.colors.featureBg}
              onChange={(value) => handleThemeColorChange('featureBg', value)}
            />

            <ColorPickerField 
              label="Feature Text Color"
              description="(card text)"
              id="featureText"
              value={newTheme.colors.featureText}
              onChange={(value) => handleThemeColorChange('featureText', value)}
            />

            <ColorPickerField 
              label="CTA Background"
              description="(call to action)"
              id="ctaBg"
              value={newTheme.colors.ctaBg}
              onChange={(value) => handleThemeColorChange('ctaBg', value)}
            />
          </div>
        </div>
      </div>
      
      <div className="pt-2">
        <button
          onClick={() => {
            // Create a new theme and add it to the themes list
            const newThemeObj = {
              id: themes.length + 1,
              name: newTheme.name || `Theme ${themes.length + 1}`,
              isActive: false,
              colors: { ...newTheme.colors }
            };
            const updatedThemes = [...themes, newThemeObj];
            setThemes(updatedThemes);
            // Save to localStorage
            saveThemes(updatedThemes);
            // Reset the new theme form
            setNewTheme({
              name: "",
              colors: {
                heroBg: "#1e40af",
                heroText: "#ffffff",
                featureBg: "#ffffff",
                featureText: "#000000",
                ctaBg: "#1e3a8a",
                ctaText: "#ffffff"
              }
            });
            setSaveStatus("New theme created");
            setTimeout(() => setSaveStatus(""), 3000);
          }}
          className="w-full px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Create Theme
        </button>
      </div>
    </div>
  );
}

// Edit Theme Form Component
const EditThemeForm = ({ 
  theme, 
  setTheme, 
  themes, 
  setThemes, 
  saveThemes, 
  setSaveStatus,
  activeTheme,
  setActiveTheme,
  applyThemeColors
}) => {
  const [editedTheme, setEditedTheme] = useState({...theme});
  const [bulkBackgroundColor, setBulkBackgroundColor] = useState("");
  const [bulkCtaColor, setBulkCtaColor] = useState("");
  const [ctaPurpose, setCtaPurpose] = useState("");
  const [ctaMediaType, setCtaMediaType] = useState("none");

  const handleColorChange = (colorKey, colorValue) => {
    setEditedTheme({
      ...editedTheme,
      colors: {
        ...editedTheme.colors,
        [colorKey]: colorValue
      }
    });
  };

  const handleSaveEdits = () => {
    const updatedThemes = themes.map(t => 
      t.id === editedTheme.id ? editedTheme : t
    );
    setThemes(updatedThemes);
    saveThemes(updatedThemes);
    
    // If the active theme was edited, update it
    if (activeTheme && activeTheme.id === editedTheme.id) {
      setActiveTheme(editedTheme);
      applyThemeColors(editedTheme);
    }
    
    setSaveStatus(`Theme "${editedTheme.name}" updated`);
    setTimeout(() => setSaveStatus(""), 3000);
    
    // Close the edit form
    setTheme(null);
  };

  const handleBulkBackgroundUpdate = () => {
    if (!bulkBackgroundColor) return;
    
    setEditedTheme({
      ...editedTheme,
      colors: {
        ...editedTheme.colors,
        heroBg: bulkBackgroundColor,
        featureSectionBg: bulkBackgroundColor,
        featureBg: bulkBackgroundColor,
        ctaBg: bulkBackgroundColor
      }
    });
    
    setSaveStatus("All backgrounds updated - remember to save");
    setTimeout(() => setSaveStatus(""), 3000);
  };

  const handleCtaUpdate = () => {
    if (!bulkCtaColor && !ctaPurpose) return;
    
    const newColors = { ...editedTheme.colors };
    
    if (bulkCtaColor) {
      newColors.ctaBg = bulkCtaColor;
    }
    
    setEditedTheme({
      ...editedTheme,
      colors: newColors,
      ctaConfig: {
        ...editedTheme.ctaConfig,
        purpose: ctaPurpose || editedTheme.ctaConfig?.purpose || "default",
        mediaType: ctaMediaType || "none"
      }
    });
    
    setSaveStatus("CTA settings updated - remember to save");
    setTimeout(() => setSaveStatus(""), 3000);
  };

  return (
    <div className="border-2 border-yellow-300 rounded-md p-4 mt-6 bg-yellow-50">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium text-black">Edit Theme: {theme.name}</h3>
        <button
          onClick={() => setTheme(null)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-gray-700 mb-1">Theme Name</label>
          <input
            type="text"
            value={editedTheme.name}
            onChange={(e) => setEditedTheme({...editedTheme, name: e.target.value})}
            placeholder="Enter theme name"
            className="w-full px-3 py-2 border rounded-md text-black"
          />
        </div>
        
        {/* Bulk Update Options */}
        <div className="bg-white p-3 rounded-md border border-gray-200 mb-4">
          <h4 className="text-xs font-medium text-gray-800 mb-2">Bulk Update Options</h4>
          
          {/* Change All Backgrounds */}
          <div className="space-y-2">
            <div className="flex items-center">
              <label className="block text-xs text-gray-700 flex-grow">Change All Landing Page Backgrounds</label>
              <div className="flex items-center">
                <input
                  type="color"
                  value={bulkBackgroundColor}
                  onChange={(e) => setBulkBackgroundColor(e.target.value)}
                  className="w-8 h-8 rounded-md border"
                />
                <button
                  onClick={handleBulkBackgroundUpdate}
                  className="ml-2 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                >
                  Apply
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500">This will update Hero, Features Section, Feature Cards, and CTA backgrounds.</p>
          </div>
        </div>
        
        {/* Individual Color pickers for theme */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 mt-3">
          <div className="space-y-3">
            <ColorPickerField 
              label="Hero Background"
              description="(main banner)"
              id="edit-heroBg"
              value={editedTheme.colors.heroBg}
              onChange={(value) => handleColorChange('heroBg', value)}
            />

            <ColorPickerField 
              label="Hero Text"
              description="(banner text)"
              id="edit-heroText"
              value={editedTheme.colors.heroText}
              onChange={(value) => handleColorChange('heroText', value)}
            />
            
            <ColorPickerField 
              label="Feature Section Background"
              description="(features area)"
              id="edit-featureSectionBg"
              value={editedTheme.colors.featureSectionBg}
              onChange={(value) => handleColorChange('featureSectionBg', value)}
            />
          </div>

          <div className="space-y-3">
            <ColorPickerField 
              label="Feature Card Background"
              description="(card bg)"
              id="edit-featureBg"
              value={editedTheme.colors.featureBg}
              onChange={(value) => handleColorChange('featureBg', value)}
            />

            <ColorPickerField 
              label="Feature Text Color"
              description="(card text)"
              id="edit-featureText"
              value={editedTheme.colors.featureText}
              onChange={(value) => handleColorChange('featureText', value)}
            />

            <ColorPickerField 
              label="CTA Background"
              description="(call to action)"
              id="edit-ctaBg"
              value={editedTheme.colors.ctaBg}
              onChange={(value) => handleColorChange('ctaBg', value)}
            />
            
            <ColorPickerField 
              label="CTA Text Color"
              description="(call to action text)"
              id="edit-ctaText"
              value={editedTheme.colors.ctaText}
              onChange={(value) => handleColorChange('ctaText', value)}
            />
          </div>
        </div>
        
        <div className="pt-2 flex space-x-3">
          <button
            onClick={handleSaveEdits}
            className="flex-grow px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Save Changes
          </button>
          <button
            onClick={() => setTheme(null)}
            className="px-3 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
        
        {/* Theme Preview */}
        <div className="mt-4">
          <h4 className="text-xs font-medium text-gray-800 mb-2">Theme Preview</h4>
          <div className="border rounded-md p-3 bg-white">
            <div className="grid grid-cols-4 gap-2">
              <div 
                className="h-8 rounded border flex items-center justify-center text-xs"
                style={{ backgroundColor: editedTheme.colors.heroBg, color: editedTheme.colors.heroText }}
              >
                Hero
              </div>
              <div 
                className="h-8 rounded border flex items-center justify-center text-xs"
                style={{ backgroundColor: editedTheme.colors.featureSectionBg }}
              >
                Features
              </div>
              <div 
                className="h-8 rounded border flex items-center justify-center text-xs"
                style={{ backgroundColor: editedTheme.colors.featureBg, color: editedTheme.colors.featureText }}
              >
                Card
              </div>
              <div 
                className="h-8 rounded border flex items-center justify-center text-xs"
                style={{ backgroundColor: editedTheme.colors.ctaBg, color: editedTheme.colors.ctaText }}
              >
                CTA
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Color Preview Component
const ColorPreview = ({ newTheme }) => {
  return (
    <div className="border rounded-md p-4 mt-6">
      <h3 className="text-sm font-medium text-black mb-3">Color Preview</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="mb-2 text-xs font-medium text-gray-700">Hero Section</div>
          <div
            className="p-3 rounded shadow-sm"
            style={{ backgroundColor: newTheme.colors.heroBg, color: newTheme.colors.heroText }}
          >
            <h4 className="text-sm font-bold">Hero Heading</h4>
            <p className="text-xs mt-1">This is how your hero section will look like.</p>
            <button 
              className="mt-2 px-3 py-1 text-xs rounded"
              style={{ 
                backgroundColor: newTheme.colors.heroText, 
                color: newTheme.colors.heroBg 
              }}
            >
              Action Button
            </button>
          </div>
        </div>
        
        <div>
          <div className="mb-2 text-xs font-medium text-gray-700">Feature Card</div>
          <div
            className="p-3 rounded shadow-sm"
            style={{ 
              backgroundColor: newTheme.colors.featureBg, 
              color: newTheme.colors.featureText,
              border: "1px solid #e5e7eb" 
            }}
          >
            <h4 className="text-sm font-bold">Feature Title</h4>
            <p className="text-xs mt-1">This is how your feature cards will look like.</p>
          </div>
        </div>
        
        <div className="col-span-2 mt-2">
          <div className="mb-2 text-xs font-medium text-gray-700">Call to Action Section</div>
          <div
            className="p-3 rounded shadow-sm"
            style={{ backgroundColor: newTheme.colors.ctaBg, color: newTheme.colors.ctaText }}
          >
            <h4 className="text-sm font-bold text-center">Ready to get started?</h4>
            <p className="text-xs mt-1 text-center">This is how your call to action section will look like.</p>
            <div className="text-center mt-2">
              <button 
                className="px-3 py-1 text-xs rounded"
                style={{ 
                  backgroundColor: newTheme.colors.ctaText, 
                  color: newTheme.colors.ctaBg 
                }}
              >
                Contact Us
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Theme UI Preview
const ThemeUIPreview = ({ newTheme }) => {
  return (
    <div className="border rounded-md p-4 mt-6">
      <h3 className="text-sm font-medium text-black mb-3">Theme UI Preview</h3>
      <div className="space-y-4 border rounded overflow-hidden">
        {/* Mock Hero Section */}
        <div 
          className="p-4 text-center"
          style={{ backgroundColor: newTheme.colors.heroBg, color: newTheme.colors.heroText }}  
        >
          <div className="text-lg font-bold">Welcome to TrustElect</div>
          <div className="text-sm mt-1">Secure voting platform for educational institutions</div>
          <button 
            className="mt-2 px-3 py-1 text-xs rounded"
            style={{ 
              backgroundColor: newTheme.colors.heroText, 
              color: newTheme.colors.heroBg, 
              fontWeight: 'bold' 
            }}
          >
            Get Started
          </button>
        </div>
        
        {/* Mock Features Section */}
        <div 
          className="p-4"
          style={{ backgroundColor: newTheme.colors.featureSectionBg }}  
        >
          <div className="text-center text-sm font-bold mb-3" style={{ color: '#000000' }}>
            Features
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map(i => (
              <div 
                key={i}
                className="p-2 rounded-md"
                style={{ 
                  backgroundColor: newTheme.colors.featureBg, 
                  color: newTheme.colors.featureText 
                }}
              >
                <div className="text-xs font-bold">Feature {i}</div>
                <div className="text-xs mt-1">Feature description here</div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Mock CTA Section */}
        <div 
          className="p-4 text-center"
          style={{ backgroundColor: newTheme.colors.ctaBg, color: newTheme.colors.ctaText }}  
        >
          <div className="text-sm font-bold">Ready to get started?</div>
          <div className="text-xs mt-1">Join thousands of schools using our platform</div>
          <button 
            className="mt-2 px-3 py-1 text-xs rounded"
            style={{ 
              backgroundColor: newTheme.colors.ctaText, 
              color: newTheme.colors.ctaBg, 
              fontWeight: 'bold' 
            }}
          >
            Contact Us
          </button>
        </div>
      </div>
    </div>
  );
};

// Color Picker Field Component
const ColorPickerField = ({ label, description, id, value, onChange }) => {
  return (
    <div>
      <div className="flex justify-between items-center">
        <label className="block text-xs text-gray-700 mb-1">
          {label}
          <span className="text-xs text-gray-500 ml-1">{description}</span>
        </label>
        <div
          className="w-5 h-5 rounded-md border border-gray-300"
          style={{ backgroundColor: value }}
        ></div>
      </div>
      <div className="flex space-x-2">
        <input
          type="color"
          id={id}
          value={value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-8 p-0 border rounded"
        />
        <input
          type="text"
          value={value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-2 py-1 border rounded text-xs"
        />
      </div>
    </div>
  );
};

export default ThemesSection;