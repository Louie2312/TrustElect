"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import LoginForm from "@/components/Auth/LoginForm";
import { Button } from "@/components/ui/button";
import stiLogo from "../assets/sti_logo.png";
import axios from "axios";
import { Clock, Calendar, CheckCircle, Users, Vote } from "lucide-react";

export default function Home() {
  const [showLogin, setShowLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [apiConnected, setApiConnected] = useState(false);
  
  const [landingContent, setLandingContent] = useState({
    logo: {
      imageUrl: null
    },
    hero: {
      title: "TrustElect Voting Platform",
      subtitle: "STI TrustElect Voting System",
      videoUrl: null,
      posterImage: null
    },
    features: {
      columns: [
        {
          title: "Easy Setup",
          description: "Simple election  process",
          imageUrl: null
        },
        {
          title: "Secure Voting",
          description: "End-to-end encryption votes",
          imageUrl: null
        },
        {
          title: "Real-time Results",
          description: "Instant counting and results",
          imageUrl: null
        }
      ]
    },
    callToAction: {
      title: "Ready to Vote?",
      subtitle: "Start your experience with TrustElect",
      buttonText: "Contact Us",
      enabled: true,
      showElections: true,
      electionStatusFilter: "ongoing_completed" // "ongoing_completed" or "all"
    }
  });
  const [elections, setElections] = useState([]);

  const checkApiConnection = async () => {
    try {
      // Fix: Use relative path - Next.js rewrites will handle the routing
      await axios.head('/api/healthcheck', { timeout: 5000 });
      console.log('API connection successful');
      setApiConnected(true);
      return true;
    } catch (error) {
      console.error('API connection failed:', error);
      setApiConnected(false);
      return false;
    }
  };

  const cacheLandingContent = (content) => {
    try {
      const cacheData = {
        content,
        timestamp: new Date().getTime()
      };
      localStorage.setItem('cachedLandingContent', JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error caching content:', error);
    }
  };

  const getCachedLandingContent = () => {
    try {
      const cachedData = localStorage.getItem('cachedLandingContent');
      if (!cachedData) return null;
      
      const { content, timestamp } = JSON.parse(cachedData);
      const now = new Date().getTime();
      const cacheAge = now - timestamp;

      if (cacheAge < 30 * 60 * 1000) {
        return content;
      }
      
      return null;
    } catch (error) {
      console.error('Error reading cached content:', error);
      return null;
    }
  };

  const fetchElections = useCallback(async () => {
    try {
      const statuses = ['ongoing', 'upcoming', 'completed'];
      const allElections = [];

      for (const status of statuses) {
        try {
          const response = await axios.get(`/api/elections/status/${status}`, {
            timeout: 5000
          });
          
          if (response.data) {
            allElections.push(...response.data);
          }
        } catch (error) {
          console.error(`Error fetching ${status} elections:`, error);
        }
      }

      setElections(allElections);
    } catch (error) {
      console.error('Error fetching elections:', error);
    }
  }, []);

  const fetchContent = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const timestamp = new Date().getTime();
      // Fix: Use relative path - Next.js rewrites will handle the routing
      const response = await axios.get(`/api/content?t=${timestamp}`, {
        timeout: 5000
      });
      
      if (response.data) {
        const newHero = response.data.hero || landingContent.hero;
        const newFeatures = response.data.features || landingContent.features;
        const newCTA = response.data.callToAction || landingContent.callToAction;

        const newContent = {
          logo: {
            imageUrl: response.data.logo?.imageUrl || landingContent.logo.imageUrl
          },
          hero: {
            title: newHero.title || landingContent.hero.title,
            subtitle: newHero.subtitle || landingContent.hero.subtitle,
            videoUrl: newHero.videoUrl || null,
            posterImage: newHero.posterImage || null,
            bgColor: newHero.bgColor || landingContent.hero.bgColor || "#1e40af",
            textColor: newHero.textColor || landingContent.hero.textColor || "#ffffff"
          },
          features: {
            columns: (newFeatures.columns || []).map((column, index) => {
              const existingColumn = landingContent.features.columns[index] || {};
              
              return {
                title: column.title || existingColumn.title || "",
                description: column.description || existingColumn.description || "",
                imageUrl: column.imageUrl || existingColumn.imageUrl || null,
                bgColor: column.bgColor || existingColumn.bgColor || "#ffffff",
                textColor: column.textColor || existingColumn.textColor || "#000000"
              };
            })
          },
          callToAction: {
            title: newCTA.title || landingContent.callToAction.title,
            subtitle: newCTA.subtitle || landingContent.callToAction.subtitle,
            buttonText: newCTA.buttonText || landingContent.callToAction.buttonText,
            buttonUrl: newCTA.buttonUrl || landingContent.callToAction.buttonUrl,
            enabled: typeof newCTA.enabled !== 'undefined' ? newCTA.enabled : true,
            showElections: typeof newCTA.showElections !== 'undefined' ? newCTA.showElections : true,
            electionStatusFilter: newCTA.electionStatusFilter || "ongoing_completed",
            bgColor: newCTA.bgColor || landingContent.callToAction.bgColor || "#1e3a8a",
            textColor: newCTA.textColor || landingContent.callToAction.textColor || "#ffffff"
          }
        };

        setLandingContent(newContent);
        cacheLandingContent(newContent);
      }
    } catch (error) {
      console.error("Error fetching content:", error);
      const cachedContent = getCachedLandingContent();
      if (cachedContent) {
        setLandingContent(cachedContent);
      } else {
        console.log("No cached content available, using defaults");
      }
    } finally {
      setIsLoading(false);
    }
  }, [landingContent]);

  // KEEP ONLY THIS useEffect - the one with empty dependency array
  useEffect(() => {
    checkApiConnection();
    fetchContent();
    fetchElections();
  }, [fetchContent, fetchElections]); // Added fetchContent and fetchElections dependency


  const formatImageUrl = (url) => {
    if (!url) return null; 
    try {
      if (url.startsWith('blob:')) {
        console.warn("Blob URLs cannot be used on the public landing page:", url);
        return null;
      }

      // Handle both absolute and relative URLs, prevent duplicate query strings
      const baseUrl = url.split("?")[0]; // Remove any existing query params
      const isAbsolute = /^https?:\/\//i.test(baseUrl);
      
      if (isAbsolute) {
        // Extract the path from absolute URL
        const urlObj = new URL(baseUrl);
        const path = urlObj.pathname;
        console.log('Formatting absolute URL:', url, '->', path);
        return path; // Return relative path for same-origin requests
      }

      // For relative URLs, ensure they start with /
      const path = baseUrl.startsWith('/') ? baseUrl : `/${baseUrl}`;
      
      // Log the URL for debugging
      console.log('Formatting image URL:', url, '->', path);
      
      return path; // Return relative path for same-origin requests
    } catch (error) {
      console.error('Error formatting URL:', error, url);
      return null;
    }
  };

  const getImageUrl = (url) => {
    if (!url) return null;
    
    const formattedUrl = formatImageUrl(url);
    if (!formattedUrl) return null;
    
    // For uploads, use the /api/uploads path to ensure proper serving
    if (formattedUrl.startsWith('/uploads/')) {
      return formattedUrl.replace('/uploads/', '/api/uploads/');
    }
    
    return formattedUrl;
  };

  const parseElectionDate = (dateStr, timeStr) => {
    try {
      if (!dateStr || !timeStr) return 'Date not set';
      
      const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
      const timeParts = timeStr.includes(':') ? timeStr.split(':') : [timeStr, '00'];
      const hours = parseInt(timeParts[0], 10);
      const minutes = parseInt(timeParts[1], 10);
      
      const dateObj = new Date(year, month - 1, day + 1, hours, minutes);
      
      if (isNaN(dateObj.getTime())) return 'Invalid date';
      
      return new Intl.DateTimeFormat('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true 
      }).format(dateObj);
    } catch (error) {
      console.error('Date parsing error:', error);
      return 'Invalid date';
    }
  };

  const getFilteredElections = () => {
    if (!elections || elections.length === 0) return [];
    
    if (landingContent.callToAction.electionStatusFilter === "ongoing_completed") {
      return elections.filter(election => 
        election.status === 'ongoing' || election.status === 'completed'
      );
    }
    
    return elections;
  };

  const getStatusConfig = (status) => {
    const configs = {
      ongoing: {
        icon: <Clock className="w-4 h-4" />,
        color: 'bg-blue-100 text-blue-800',
        label: 'Ongoing'
      },
      upcoming: {
        icon: <Calendar className="w-4 h-4" />,
        color: 'bg-yellow-100 text-yellow-800',
        label: 'Upcoming'
      },
      completed: {
        icon: <CheckCircle className="w-4 h-4" />,
        color: 'bg-green-100 text-green-800',
        label: 'Completed'
      }
    };
    return configs[status] || configs.ongoing;
  };

  const renderImage = (url, alt, width, height, className, onErrorAction) => {
    const imageUrl = getImageUrl(url);
    if (!imageUrl) return null;

    return (
      <Image
        src={imageUrl}
        alt={alt || "Image"}
        width={width || 400}
        height={height || 300}
        className={className || ""}
        unoptimized={true}
        onError={(e) => {
          console.error("Error loading image:", imageUrl);
          if (onErrorAction) onErrorAction(e);
        }}
      />
    );
  };

  return (
    <div className="relative min-h-screen bg-white flex flex-col">
      {/* Header Section - Updated to remove About button */}
      <header className="w-full flex justify-between items-center p-6 bg-[#01579B] shadow-md fixed top-0 left-0 right-0 z-10">
        <h1 className="text-2xl font-bold flex items-center">
          {landingContent.logo?.imageUrl ? (
            <Image 
              src={getImageUrl(landingContent.logo.imageUrl)}
              alt="Site Logo" 
              width={60}
              height={20} 
              className="mr-2"
              priority
              unoptimized={true}
              style={{ maxHeight: 'calc(51px - (0px * 2))' }}
              onError={(e) => {
                console.error("Error loading logo:", landingContent.logo.imageUrl);
                console.error("Formatted URL:", getImageUrl(landingContent.logo.imageUrl));
                
                // Try alternative URL format
                const altUrl = getImageUrl(landingContent.logo.imageUrl);
                console.log('Trying alternative logo URL:', altUrl);
                
                const img = e.currentTarget;
                img.src = altUrl;
                img.onload = () => {
                  console.log('Alternative logo URL worked:', altUrl);
                };
                img.onerror = () => {
                  console.log('Alternative logo URL also failed, hiding logo');
                  img.style.display = 'none';
                };
              }}
              onLoad={() => {
                console.log('Logo loaded successfully:', landingContent.logo.imageUrl);
              }}
            />
          ) : (
            <Image 
              src={stiLogo} 
              alt="STI Logo" 
              width={65}
              height={25} 
              className="mr-2"
              priority
              style={{ maxHeight: 'calc(51px - (0px * 2))' }}
            />
          )}
          <span className="text-white">TrustElect</span>
        </h1>
        
        <nav className="flex items-center gap-4">
          {/* Removed About button */}
          <Button
            onClick={() => setShowLogin(true)}
            className="cursor-pointer px-6 py-2 br-5 bg-[#0000FF] text-white font-semibold rounded-lg shadow-md hover:bg-blue-800"
          >
            Login
          </Button>
        </nav>
      </header>

      <main className="flex-grow pt-24">
        <section 
        className="text-white py-20 px-6"
        style={{
          backgroundColor: landingContent.hero?.bgColor || '#01579B',
          color: landingContent.hero?.textColor || '#ffffff'
        }}
      >
        <div className="container mx-auto max-w-6xl flex flex-col md:flex-row items-center">
          <div className="md:w-1/3 space-y-6">
            <h1 
              className="text-4xl md:text-5xl font-bold leading-tight"
              style={{ color: landingContent.hero?.textColor || '#ffffff' }}
            >
              {landingContent.hero.title}
            </h1>
            <p 
              className="text-xl md:text-2xl"
              style={{ color: landingContent.hero?.textColor || '#ffffff' }}
            >
              {landingContent.hero.subtitle}
            </p>
            
          </div>
          <div className="md:w-2/3 mt-10 md:mt-0 flex justify-center">
            {(() => {
              
              const heroVideoUrl = landingContent.hero && landingContent.hero.videoUrl ? 
                getImageUrl(landingContent.hero.videoUrl) : null;
              
              const heroPosterUrl = landingContent.hero && landingContent.hero.posterImage ? 
                getImageUrl(landingContent.hero.posterImage) : null;

          if (heroVideoUrl) {
                return (
            <div className="w-full max-w-6xl aspect-video bg-black/20 rounded-lg overflow-hidden relative">
              <video
                src={heroVideoUrl}
                poster={heroPosterUrl}
                controls
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.error("Error loading hero video");
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    const fallback = document.createElement('div');
                    fallback.className = 'absolute inset-0 flex items-center justify-center bg-blue-700';
                    fallback.innerHTML = `<span class="text-white/70">Video unavailable</span>`;
                    parent.appendChild(fallback);
                  }
                }}
              >
                Your browser does not support the video tag.
              </video>
            </div>
                );

              } else if (heroPosterUrl) {
                return (
              <div className="w-full max-w-6xl aspect-video bg-black/20 rounded-lg overflow-hidden">
                <Image
                  src={heroPosterUrl}
                  alt="TrustElect Platform"
                  width={1920}
                  height={1080}
                  className="w-full h-full object-cover"
                  unoptimized={true}
                  onError={(e) => {
                    console.error("Error loading hero poster image:", heroPosterUrl);
                    
                    const container = e.currentTarget.closest('div');
                    if (container) {
                      const img = document.createElement('img');
                      img.src = heroPosterUrl;
                      img.className = 'w-full h-full object-cover';
                      img.onload = () => {
                        console.log('Alternative URL worked:', heroPosterUrl); 
                        container.innerHTML = '';
                        container.appendChild(img);
                      };
                      img.onerror = () => {
                        console.log('Alternative URL also failed, showing fallback');
                        container.innerHTML = `
                          <div class="w-full h-full flex items-center justify-center bg-blue-700">
                            <span class="text-xl text-white/70">Demo Video</span>
                          </div>
                        `;
                      };
                    }
                  }}
                  onLoad={() => {
                    console.log('Hero poster loaded successfully:', heroPosterUrl);
                  }}
                />
              </div>
            );

              } else {
                return (
                  <div className="w-full max-w-6xl aspect-video bg-blue-700 rounded-lg flex items-center justify-center">

                  </div>
                );
              }
            })()}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">
            Key Features
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {landingContent.features.columns.map((feature, index) => {
              if (index === 0) {
                console.log("Feature Card 1 data:", feature);
                console.log("Feature Card 1 image URL:", feature.imageUrl);
              }

              let imageUrl = null;
              if (feature.imageUrl) {
                imageUrl = getImageUrl(feature.imageUrl);

                const isHeroImage = landingContent.hero && 
                  (feature.imageUrl === landingContent.hero.videoUrl || 
                    feature.imageUrl === landingContent.hero.posterImage);
                    
                if (isHeroImage) {
                  console.warn(`Feature ${index} image URL matches a hero image - ignoring`);
                  imageUrl = null;
                }
              }

              if (index === 0) {
                console.log("Feature Card 1 final image URL:", imageUrl);
              }
              
              return (
                <div 
                  key={index} 
                  className="p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
                  style={{
                    backgroundColor: feature.bgColor || '#ffffff',
                    color: feature.textColor || '#000000'
                  }}
                >
                  {imageUrl ? (
                    <div className="mb-4 h-48 overflow-hidden rounded-lg">
                  <Image
                    src={imageUrl}
                    alt={feature.title || `Feature ${index + 1}`}
                    width={400}
                    height={300}
                    className="w-full h-full object-cover"
                    unoptimized={true}
                    onError={(e) => {
                      console.error(`Error loading feature image ${index}:`, imageUrl);
                      const container = e.currentTarget.closest('.mb-4');
                      if (container) {
                        container.style.display = 'none';
                      }
                    }}
                  />
                </div>
                ) : null}
                <h3 
                  className="text-xl font-semibold mb-2"
                  style={{ color: feature.textColor || '#000000' }}
                >
                  {feature.title}
                </h3>
                <p style={{ color: feature.textColor || '#000000' }}>
                  {feature.description}
                </p>
              </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      {landingContent.callToAction.enabled && (
        <section 
          className="text-white py-16 px-6"
          style={{
            backgroundColor: landingContent.callToAction?.bgColor || '#1e3a8a',
            color: landingContent.callToAction?.textColor || '#ffffff'
          }}
        >
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h2 
                className="text-3xl font-bold mb-4"
                style={{ color: landingContent.callToAction?.textColor || '#ffffff' }}
              >
                {landingContent.callToAction.title}
              </h2>
              <p 
                className="text-xl mb-8"
                style={{ color: landingContent.callToAction?.textColor || '#ffffff' }}
              >
                {landingContent.callToAction.subtitle}
              </p>
            </div>

            {/* Elections Display */}
            {landingContent.callToAction.showElections && (
              <div className="mb-8">
                <h3 
                  className="text-2xl font-semibold mb-6 text-center"
                  style={{ color: landingContent.callToAction?.textColor || '#ffffff' }}
                >
                  Current Elections
                </h3>
                
                {(() => {
                  const filteredElections = getFilteredElections();
                  
                  if (filteredElections.length === 0) {
                    return (
                      <div className="text-center py-8">
                        <div className="text-6xl mb-4 text-white text-opacity-50">
                          <Vote className="w-16 h-16 mx-auto" />
                        </div>
                        <p className="text-xl text-white text-opacity-80">
                          No elections available at the moment
                        </p>
                        <p className="text-white text-opacity-60 mt-2">
                          Check back later for new election updates
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredElections.slice(0, 6).map((election, index) => {
                        const statusConfig = getStatusConfig(election.status);
                        
                        return (
                          <div 
                            key={election.id || index}
                            className="bg-white bg-opacity-10 rounded-lg p-6 backdrop-blur-sm hover:bg-opacity-20 transition-all duration-300"
                          >
                            {/* Status Badge */}
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center">
                                {statusConfig.icon}
                                <span className={`ml-2 px-3 py-1 rounded-full text-sm font-medium ${statusConfig.color}`}>
                                  {statusConfig.label}
                                </span>
                              </div>
                              <div className={`h-2.5 w-2.5 rounded-full ${election.ballot_exists ? 'bg-green-400' : 'bg-red-400'}`}></div>
                            </div>

                            {/* Election Info */}
                            <h4 className="text-xl font-bold mb-3 text-white line-clamp-2">
                              {election.title}
                            </h4>
                            <p className="text-white text-opacity-90 mb-4 line-clamp-3 text-sm">
                              {election.description}
                            </p>

                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <div className="flex items-center text-sm">
                                <Users className="w-4 h-4 mr-2 text-white" />
                                <div>
                                  <div className="text-white text-opacity-80 text-xs">Voters</div>
                                  <div className="font-bold text-white">
                                    {Number(election.voter_count || 0).toLocaleString()}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center text-sm">
                                <Vote className="w-4 h-4 mr-2 text-white" />
                                <div>
                                  <div className="text-white text-opacity-80 text-xs">Votes</div>
                                  <div className="font-bold text-white">
                                    {Number(election.vote_count || 0).toLocaleString()}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Dates */}
                            <div className="text-xs text-white text-opacity-80 space-y-1">
                              <div>Starts: {parseElectionDate(election.date_from, election.start_time)}</div>
                              <div>Ends: {parseElectionDate(election.date_to, election.end_time)}</div>
                            </div>

                            {/* Participation Rate */}
                            {election.status === 'completed' && election.voter_count > 0 && (
                              <div className="mt-4 pt-4 border-t border-white border-opacity-20">
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-white text-opacity-80">Participation Rate</span>
                                  <span className="font-bold text-white">
                                    {Math.round((election.vote_count / election.voter_count) * 100)}%
                                  </span>
                                </div>
                                <div className="w-full bg-white bg-opacity-20 rounded-full h-2 mt-2">
                                  <div 
                                    className="bg-white h-2 rounded-full transition-all duration-500"
                                    style={{ 
                                      width: `${Math.min((election.vote_count / election.voter_count) * 100, 100)}%` 
                                    }}
                                  ></div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Call to Action Button */}
            <div className="text-center">
              <Button
                onClick={() => setShowLogin(true)}
                className="px-8 py-3 bg-white text-blue-600 font-semibold rounded-lg shadow-lg hover:bg-gray-100 transition-colors"
              >
                {landingContent.callToAction.buttonText || "Get Started"}
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* New About Us Section */}
      <section className="py-20 px-6 bg-white">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl font-bold text-center mb-12 text-blue-900">
            About Us
          </h2>
          
          <div className="max-w-4xl mx-auto">
            <p className="mb-6 text-lg text-gray-800 leading-relaxed">
              TrustElect is a comprehensive election management system dedicated to fostering secure, efficient, and transparent electoral processes. We provide a robust platform designed to empower both administrators and voters throughout every stage of an election, from initial setup to the declaration of results.
            </p>
            
            <div className="mb-8">
              <h3 className="text-2xl font-semibold mb-4 text-blue-800">
                Our Platform Provides:
              </h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-800">
                <li>Secure Administration with Role-Based Access Control (RBAC) and data encryption using Advance Encryption System 256 (AES – 256)</li>
                <li>Efficient Database Management for fast and accurate processing</li>
                <li>User-Friendly Interfaces that prioritize ease of use</li>
                <li>Verifiable Ballot Receipts through encrypted ballots and receipt confirmation</li>
                <li>Transparent Results with partial vote counting for clear visualization and easily understandable results promoting transparency and integrity</li>
              </ul>
            </div>
            
            <p className="mb-8 text-lg text-gray-800 leading-relaxed">
              At TrustElect, our objective is to increase trust in the electoral process by providing a safe, transparent, and dependable platform. We are devoted to fair elections, accurate results, and the ongoing strengthening of democratic processes.
            </p>
            
            <div className="mb-8">
              <h3 className="text-2xl font-semibold mb-6 text-blue-800">
                Meet the Team
              </h3>
              <p className="mb-6 text-lg text-gray-800 leading-relaxed">
                Our team consists of enthusiastic individuals with growing experience in software development, cybersecurity, and election systems. We deliver a trusted and effective election management platform by combining technical skills with real-world understanding, guided by an experienced IT instructor.
              </p>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-blue-50 p-6 rounded-lg">
                  <h4 className="font-bold text-blue-900 mb-2">Steven Baradero</h4>
                  <p className="text-blue-700 font-semibold mb-2">Project Manager</p>
                  <p className="text-gray-700">Leads project planning, execution, and team coordination.</p>
                </div>
                
                <div className="bg-blue-50 p-6 rounded-lg">
                  <h4 className="font-bold text-blue-900 mb-2">Suiluj Louis Anunciado</h4>
                  <p className="text-blue-700 font-semibold mb-2">Lead Programmer</p>
                  <p className="text-gray-700">Heads development, system architecture, and security implementation.</p>
                </div>
                
                <div className="bg-blue-50 p-6 rounded-lg">
                  <h4 className="font-bold text-blue-900 mb-2">Elmie Sanico</h4>
                  <p className="text-blue-700 font-semibold mb-2">System Analyst</p>
                  <p className="text-gray-700">Translate user needs into functional, effective system designs.</p>
                </div>
                
                <div className="bg-blue-50 p-6 rounded-lg">
                  <h4 className="font-bold text-blue-900 mb-2">Giann Emerson Ararao</h4>
                  <p className="text-blue-700 font-semibold mb-2">Quality Assurance</p>
                  <p className="text-gray-700">Ensures the platform is secure, bug-free, and reliable through rigorous testing.</p>
                </div>
                
                <div className="bg-blue-100 p-6 rounded-lg md:col-span-2">
                  <h4 className="font-bold text-blue-900 mb-2">John Robert Soriano</h4>
                  <p className="text-blue-700 font-semibold mb-2">Adviser</p>
                  <p className="text-gray-700">Provides expert technical guidance and oversight to uphold industry standards.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#01579B] text-white py-8 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h2 className="text-xl font-bold text-white">TrustElect</h2>
              <p className="text-white">STI TrustElect Voting System</p>
            </div>
            <div className="text-white text-sm">
              © {new Date().getFullYear()} TrustElect
            </div>
          </div>
        </div>
      </footer>

      {/* Login Form (Centered on Click) */}
      {showLogin && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <LoginForm onClose={() => setShowLogin(false)} />
        </div>
      )}

      {/* Remove the About Modal completely */}
    </div>
  );
}