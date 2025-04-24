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
      
      {/* Create New Theme Form */}
      <ThemeCreationForm 
        newTheme={newTheme}
        setNewTheme={setNewTheme}
        handleThemeColorChange={handleThemeColorChange}
        themes={themes}
        setThemes={setThemes}
        saveThemes={saveThemes}
        setSaveStatus={setSaveStatus}
      />
      
      {/* Color Preview Section */}
      <ColorPreview newTheme={newTheme} />
      
      {/* Theme UI Preview */}
      <ThemeUIPreview newTheme={newTheme} />
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

// Color Preview Component
const ColorPreview = ({ newTheme }) => {
  return (
    <div className="border rounded-md p-4 mt-6">
      <h3 className="text-sm font-medium text-black mb-3">Color Preview</h3>
      <div className="space-y-4">
        {/* Color Swatches */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="flex flex-col items-center">
            <div 
              className="h-16 w-16 rounded-lg shadow-sm border border-gray-200" 
              style={{ backgroundColor: newTheme.colors.heroBg }}
            ></div>
            <span className="text-xs mt-1 text-gray-700">Hero Background</span>
            <span className="text-xs text-gray-500">{newTheme.colors.heroBg}</span>
          </div>
          <div className="flex flex-col items-center">
            <div 
              className="h-16 w-16 rounded-lg shadow-sm border border-gray-200 flex items-center justify-center"
              style={{ backgroundColor: newTheme.colors.heroBg }}
            >
              <span style={{ color: newTheme.colors.heroText }}>Aa</span>
            </div>
            <span className="text-xs mt-1 text-gray-700">Hero Text</span>
            <span className="text-xs text-gray-500">{newTheme.colors.heroText}</span>
          </div>
          <div className="flex flex-col items-center">
            <div 
              className="h-16 w-16 rounded-lg shadow-sm border border-gray-200" 
              style={{ backgroundColor: newTheme.colors.featureSectionBg }}
            ></div>
            <span className="text-xs mt-1 text-gray-700">Features Section</span>
            <span className="text-xs text-gray-500">{newTheme.colors.featureSectionBg}</span>
          </div>
          <div className="flex flex-col items-center">
            <div 
              className="h-16 w-16 rounded-lg shadow-sm border border-gray-200 flex items-center justify-center" 
              style={{ backgroundColor: newTheme.colors.featureBg }}
            >
              <span style={{ color: newTheme.colors.featureText }}>Aa</span>
            </div>
            <span className="text-xs mt-1 text-gray-700">Feature Card</span>
            <span className="text-xs text-gray-500">{newTheme.colors.featureBg}/{newTheme.colors.featureText}</span>
          </div>
          <div className="flex flex-col items-center">
            <div 
              className="h-16 w-16 rounded-lg shadow-sm border border-gray-200" 
              style={{ backgroundColor: newTheme.colors.ctaBg }}
            ></div>
            <span className="text-xs mt-1 text-gray-700">CTA Background</span>
            <span className="text-xs text-gray-500">{newTheme.colors.ctaBg}</span>
          </div>
          <div className="flex flex-col items-center">
            <div 
              className="h-16 w-16 rounded-lg shadow-sm border border-gray-200 flex items-center justify-center"
              style={{ backgroundColor: newTheme.colors.ctaBg }}
            >
              <span style={{ color: newTheme.colors.ctaText }}>Aa</span>
            </div>
            <span className="text-xs mt-1 text-gray-700">CTA Text</span>
            <span className="text-xs text-gray-500">{newTheme.colors.ctaText}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Theme UI Preview Component
const ThemeUIPreview = ({ newTheme }) => {
  return (
    <div className="border rounded-md p-4 mt-6">
      <h3 className="text-sm font-medium text-black mb-3">Theme UI Preview</h3>
      <div className="space-y-6">
        {/* Hero Section Preview */}
        <div className="rounded-lg overflow-hidden shadow-sm">
          <div 
            className="p-4"
            style={{ backgroundColor: newTheme.colors.heroBg }}
          >
            <h3 
              className="text-lg font-bold mb-2" 
              style={{ color: newTheme.colors.heroText }}
            >
              Hero Section
            </h3>
            <p style={{ color: newTheme.colors.heroText }}>Sample hero text with the selected theme colors</p>
            <button 
              className="mt-3 px-4 py-1 rounded font-medium text-sm"
              style={{
                backgroundColor: newTheme.colors.heroText,
                color: newTheme.colors.heroBg
              }}
            >
              Call to Action
            </button>
          </div>
        </div>
        
        {/* Features Section Preview */}
        <div 
          className="rounded-lg p-4"
          style={{ backgroundColor: newTheme.colors.featureSectionBg }}
        >
          <h4 
            className="text-center font-medium mb-3"
            style={{ color: newTheme.colors.featureText }}
          >
            Features Section
          </h4>
          <div className="flex justify-center gap-4 flex-wrap">
            <div 
              className="w-32 p-3 rounded-lg shadow-sm"
              style={{ backgroundColor: newTheme.colors.featureBg }}
            >
              <div className="text-center">
                <div className="w-8 h-8 mx-auto mb-2 bg-blue-100 rounded-full flex items-center justify-center">
                  <span>1</span>
                </div>
                <h5 
                  className="text-sm font-medium"
                  style={{ color: newTheme.colors.featureText }}
                >
                  Feature 1
                </h5>
                <p 
                  className="text-xs mt-1"
                  style={{ color: newTheme.colors.featureText }}
                >
                  Description text
                </p>
              </div>
            </div>
            <div 
              className="w-32 p-3 rounded-lg shadow-sm"
              style={{ backgroundColor: newTheme.colors.featureBg }}
            >
              <div className="text-center">
                <div className="w-8 h-8 mx-auto mb-2 bg-green-100 rounded-full flex items-center justify-center">
                  <span>2</span>
                </div>
                <h5 
                  className="text-sm font-medium"
                  style={{ color: newTheme.colors.featureText }}
                >
                  Feature 2
                </h5>
                <p 
                  className="text-xs mt-1"
                  style={{ color: newTheme.colors.featureText }}
                >
                  Description text
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* CTA Section Preview */}
        <div 
          className="p-4 rounded-lg text-center"
          style={{
            backgroundColor: newTheme.colors.ctaBg,
            color: newTheme.colors.ctaText
          }}
        >
          <h3 className="font-bold">Call to Action</h3>
          <p className="text-sm mb-2">Sample CTA text with theme colors</p>
          <button 
            className="px-4 py-1 rounded font-medium"
            style={{
              backgroundColor: newTheme.colors.ctaText,
              color: newTheme.colors.ctaBg
            }}
          >
            Button
          </button>
        </div>
      </div>
    </div>
  );
}

// Color Picker Field Component
const ColorPickerField = ({ label, description, id, value, onChange }) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        <span className="ml-1 text-xs text-gray-500">{description}</span>
      </label>
      <div className="flex items-center space-x-2">
        <div 
          className="h-8 w-8 rounded-md border border-gray-300 cursor-pointer flex items-center justify-center overflow-hidden"
          onClick={() => document.getElementById(id).click()}
          style={{ backgroundColor: value }}
        >
          <input
            type="color"
            id={id}
            value={value || "#000000"}
            onChange={(e) => onChange(e.target.value)}
            className="opacity-0"
          />
        </div>
        <span className="text-sm text-gray-600">{value}</span>
      </div>
    </div>
  );
}

export default ThemesSection;