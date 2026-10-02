import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapPin, Search, Clock, Sparkles, Building2, Globe, Check } from 'lucide-react';

export interface LocationItem {
  id: string;
  name: string;
  region: string;
  country: string;
  type: 'METRO' | 'TECH_HUB' | 'COMMERCIAL_DISTRICT' | 'CAPITAL' | 'SUBURB';
  countryCode: string;
  popularNiches?: string[];
}

export const CURATED_LOCATIONS: LocationItem[] = [
  // Philippines (Core Target Markets)
  { id: 'ph_cebu', name: 'Cebu City', region: 'Central Visayas', country: 'Philippines', countryCode: 'PH', type: 'METRO', popularNiches: ['Restaurants', 'Dentists', 'Salons & Spas'] },
  { id: 'ph_mandaue', name: 'Mandaue City', region: 'Cebu, Central Visayas', country: 'Philippines', countryCode: 'PH', type: 'COMMERCIAL_DISTRICT', popularNiches: ['Contractors', 'Auto Repair'] },
  { id: 'ph_lapulapu', name: 'Lapu-Lapu City', region: 'Mactan Island, Cebu', country: 'Philippines', countryCode: 'PH', type: 'METRO', popularNiches: ['Hospitality', 'Salons & Spas'] },
  { id: 'ph_makati', name: 'Makati', region: 'Metro Manila', country: 'Philippines', countryCode: 'PH', type: 'COMMERCIAL_DISTRICT', popularNiches: ['Lawyers', 'Accounting & CPA', 'Fine Dining'] },
  { id: 'ph_bgc', name: 'BGC, Taguig', region: 'Metro Manila', country: 'Philippines', countryCode: 'PH', type: 'TECH_HUB', popularNiches: ['Med Spas & Aesthetics', 'Marketing Agencies'] },
  { id: 'ph_manila', name: 'Manila', region: 'National Capital Region', country: 'Philippines', countryCode: 'PH', type: 'CAPITAL', popularNiches: ['Restaurants', 'Dental Clinics', 'Auto Repair'] },
  { id: 'ph_quezon', name: 'Quezon City', region: 'Metro Manila', country: 'Philippines', countryCode: 'PH', type: 'METRO', popularNiches: ['Medical Clinics', 'Contractors', 'Daycares'] },
  { id: 'ph_pasig', name: 'Pasig City (Ortigas)', region: 'Metro Manila', country: 'Philippines', countryCode: 'PH', type: 'COMMERCIAL_DISTRICT', popularNiches: ['Lawyers', 'Fitness Centers'] },
  { id: 'ph_davao', name: 'Davao City', region: 'Davao Region, Mindanao', country: 'Philippines', countryCode: 'PH', type: 'METRO', popularNiches: ['Agriculture', 'Medical Clinics'] },
  { id: 'ph_iloilo', name: 'Iloilo City', region: 'Western Visayas', country: 'Philippines', countryCode: 'PH', type: 'METRO', popularNiches: ['Restaurants', 'Real Estate'] },
  { id: 'ph_bacolod', name: 'Bacolod City', region: 'Negros Occidental', country: 'Philippines', countryCode: 'PH', type: 'METRO', popularNiches: ['Cafes & Bakeries', 'Dentists'] },
  { id: 'ph_cagayan', name: 'Cagayan de Oro', region: 'Northern Mindanao', country: 'Philippines', countryCode: 'PH', type: 'METRO', popularNiches: ['Contractors', 'Automotive'] },
  { id: 'ph_angeles', name: 'Angeles City & Clark', region: 'Pampanga, Central Luzon', country: 'Philippines', countryCode: 'PH', type: 'COMMERCIAL_DISTRICT', popularNiches: ['Restaurants', 'Bars'] },

  // United States (Major Agency Client Hubs)
  { id: 'us_austin', name: 'Austin, TX', region: 'Texas', country: 'United States', countryCode: 'US', type: 'TECH_HUB', popularNiches: ['Roofing Services', 'Dentists', 'HVAC Services'] },
  { id: 'us_dallas', name: 'Dallas-Fort Worth, TX', region: 'Texas', country: 'United States', countryCode: 'US', type: 'METRO', popularNiches: ['Contractors', 'Lawyers', 'Plumbing Services'] },
  { id: 'us_houston', name: 'Houston, TX', region: 'Texas', country: 'United States', countryCode: 'US', type: 'METRO', popularNiches: ['HVAC Services', 'Auto Repair', 'Medical Clinics'] },
  { id: 'us_miami', name: 'Miami, FL', region: 'Florida', country: 'United States', countryCode: 'US', type: 'METRO', popularNiches: ['Med Spas & Aesthetics', 'Real Estate', 'Roofing Services'] },
  { id: 'us_orlando', name: 'Orlando, FL', region: 'Florida', country: 'United States', countryCode: 'US', type: 'METRO', popularNiches: ['Solar Energy', 'Plumbing Services', 'Restaurants'] },
  { id: 'us_tampa', name: 'Tampa, FL', region: 'Florida', country: 'United States', countryCode: 'US', type: 'METRO', popularNiches: ['Roofing Services', 'Dental Clinics'] },
  { id: 'us_denver', name: 'Denver, CO', region: 'Colorado', country: 'United States', countryCode: 'US', type: 'METRO', popularNiches: ['Contractors', 'Chiropractors & PT', 'Fitness Centers'] },
  { id: 'us_phoenix', name: 'Phoenix, AZ', region: 'Arizona', country: 'United States', countryCode: 'US', type: 'METRO', popularNiches: ['HVAC Services', 'Solar Energy', 'Pool Services'] },
  { id: 'us_scottsdale', name: 'Scottsdale, AZ', region: 'Arizona', country: 'United States', countryCode: 'US', type: 'COMMERCIAL_DISTRICT', popularNiches: ['Med Spas', 'Luxury Real Estate'] },
  { id: 'us_chicago', name: 'Chicago, IL', region: 'Illinois', country: 'United States', countryCode: 'US', type: 'METRO', popularNiches: ['Lawyers', 'Accounting & CPA', 'Restaurants'] },
  { id: 'us_losangeles', name: 'Los Angeles, CA', region: 'California', country: 'United States', countryCode: 'US', type: 'METRO', popularNiches: ['Beauty Salons', 'Med Spas', 'Personal Injury Lawyers'] },
  { id: 'us_sanfrancisco', name: 'San Francisco, CA', region: 'California', country: 'United States', countryCode: 'US', type: 'TECH_HUB', popularNiches: ['Dentists', 'Marketing Agencies'] },
  { id: 'us_sandiego', name: 'San Diego, CA', region: 'California', country: 'United States', countryCode: 'US', type: 'METRO', popularNiches: ['Solar Energy', 'Veterinary Clinics'] },
  { id: 'us_seattle', name: 'Seattle, WA', region: 'Washington', country: 'United States', countryCode: 'US', type: 'TECH_HUB', popularNiches: ['Cafes & Bakeries', 'Lawyers', 'Dental Clinics'] },
  { id: 'us_newyork', name: 'New York, NY', region: 'New York', country: 'United States', countryCode: 'US', type: 'METRO', popularNiches: ['Lawyers', 'Accounting & CPA', 'Dentists'] },
  { id: 'us_atlanta', name: 'Atlanta, GA', region: 'Georgia', country: 'United States', countryCode: 'US', type: 'METRO', popularNiches: ['Contractors', 'Auto Repair', 'Daycares'] },
  { id: 'us_charlotte', name: 'Charlotte, NC', region: 'North Carolina', country: 'United States', countryCode: 'US', type: 'METRO', popularNiches: ['Financial Advisors', 'Roofing Services'] },
  { id: 'us_nashville', name: 'Nashville, TN', region: 'Tennessee', country: 'United States', countryCode: 'US', type: 'METRO', popularNiches: ['Bars & Breweries', 'Contractors'] },
  { id: 'us_lasvegas', name: 'Las Vegas, NV', region: 'Nevada', country: 'United States', countryCode: 'US', type: 'METRO', popularNiches: ['Restaurants', 'Nightlife', 'Attorneys'] },

  // United Kingdom, Canada & Australia
  { id: 'uk_london', name: 'London', region: 'Greater London', country: 'United Kingdom', countryCode: 'GB', type: 'CAPITAL', popularNiches: ['Dental Practices', 'Solicitors', 'Restaurants'] },
  { id: 'uk_manchester', name: 'Manchester', region: 'Greater Manchester', country: 'United Kingdom', countryCode: 'GB', type: 'METRO', popularNiches: ['Contractors', 'Hair Salons'] },
  { id: 'ca_toronto', name: 'Toronto, ON', region: 'Ontario', country: 'Canada', countryCode: 'CA', type: 'METRO', popularNiches: ['Dentists', 'Lawyers', 'HVAC Services'] },
  { id: 'ca_vancouver', name: 'Vancouver, BC', region: 'British Columbia', country: 'Canada', countryCode: 'CA', type: 'METRO', popularNiches: ['Med Spas', 'Restaurants', 'Contractors'] },
  { id: 'au_sydney', name: 'Sydney, NSW', region: 'New South Wales', country: 'Australia', countryCode: 'AU', type: 'METRO', popularNiches: ['Dental Clinics', 'Electricians', 'Plumbers'] },
  { id: 'au_melbourne', name: 'Melbourne, VIC', region: 'Victoria', country: 'Australia', countryCode: 'AU', type: 'METRO', popularNiches: ['Cafes & Bakeries', 'Lawyers', 'Physiotherapy'] },
  { id: 'sg_singapore', name: 'Singapore', region: 'Central Region', country: 'Singapore', countryCode: 'SG', type: 'CAPITAL', popularNiches: ['Aesthetic Clinics', 'Corporate Legal', 'F&B'] },
  { id: 'ae_dubai', name: 'Dubai', region: 'Emirate of Dubai', country: 'United Arab Emirates', countryCode: 'AE', type: 'METRO', popularNiches: ['Luxury Real Estate', 'Beauty Spas', 'Dental'] },
];

const RECENT_LOCATIONS_KEY = 'horusscope_recent_locations_v1';

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelectSuggestion?: (location: LocationItem) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}

export const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  value,
  onChange,
  onSelectSuggestion,
  placeholder = 'e.g. Cebu City, Philippines or Austin, TX',
  className = '',
  inputClassName = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [recentLocations, setRecentLocations] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent locations from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_LOCATIONS_KEY);
      if (stored) {
        setRecentLocations(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  const saveRecentLocation = (locName: string) => {
    try {
      const updated = [locName, ...recentLocations.filter((l) => l.toLowerCase() !== locName.toLowerCase())].slice(0, 5);
      setRecentLocations(updated);
      localStorage.setItem(RECENT_LOCATIONS_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // Filter suggestions based on input
  const suggestions = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) {
      // If empty or focused, show popular hubs
      return CURATED_LOCATIONS.slice(0, 7);
    }

    return CURATED_LOCATIONS.filter((loc) => {
      const fullName = `${loc.name}, ${loc.region}, ${loc.country}`.toLowerCase();
      return (
        loc.name.toLowerCase().includes(query) ||
        loc.region.toLowerCase().includes(query) ||
        loc.country.toLowerCase().includes(query) ||
        loc.countryCode.toLowerCase() === query
      );
    }).slice(0, 8);
  }, [value]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectLocation = (loc: LocationItem | string) => {
    const displayName = typeof loc === 'string' ? loc : `${loc.name}, ${loc.country}`;
    onChange(displayName);
    saveRecentLocation(displayName);
    if (typeof loc !== 'string' && onSelectSuggestion) {
      onSelectSuggestion(loc);
    }
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        handleSelectLocation(suggestions[highlightedIndex]);
      } else {
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const getTypeBadge = (type: LocationItem['type']) => {
    switch (type) {
      case 'TECH_HUB':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-700">Tech Hub</span>;
      case 'COMMERCIAL_DISTRICT':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700">District</span>;
      case 'CAPITAL':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700">Capital</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-100 text-slate-600">Metro</span>;
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-8 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500 ${inputClassName}`}
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              inputRef.current?.focus();
            }}
            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs px-1"
          >
            ×
          </button>
        )}
      </div>

      {/* Floating Suggestions Dropdown */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl no-scrollbar">
          {/* Recent Searches (if available and query is short) */}
          {recentLocations.length > 0 && !value.trim() && (
            <div className="p-2 border-b border-slate-100">
              <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                <Clock className="w-3 h-3" />
                <span>Recent Searches</span>
              </div>
              <div className="flex flex-wrap gap-1 px-1 pt-1">
                {recentLocations.map((recent) => (
                  <button
                    key={recent}
                    type="button"
                    onClick={() => handleSelectLocation(recent)}
                    className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  >
                    <MapPin className="w-2.5 h-2.5 opacity-60" />
                    <span>{recent}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Heading */}
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between border-b border-slate-100">
            <span>{value.trim() ? 'Matching Locations' : 'Popular Target Hubs'}</span>
            <span className="text-[9px] lowercase font-normal opacity-70">↑↓ to navigate</span>
          </div>

          {/* List of matched items */}
          <div className="py-1">
            {suggestions.length > 0 ? (
              suggestions.map((item, idx) => {
                const isSelected = idx === highlightedIndex;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectLocation(item)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`px-3 py-2 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-50 text-blue-900'
                        : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                        <Building2 className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold flex items-center gap-1.5 truncate">
                          <span>{item.name}</span>
                          <span className="text-[10px] font-normal text-slate-400">
                            • {item.countryCode}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {item.region}, {item.country}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {getTypeBadge(item.type)}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-3 py-4 text-center text-xs text-slate-500">
                <p>No predefined hub matched "{value}".</p>
                <p className="text-[11px] text-slate-400 mt-1">Press Enter to search Google Places directly for this location.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
