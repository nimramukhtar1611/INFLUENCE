// components/UI/Select.js - COMPLETE FIXED VERSION
import React, { forwardRef, useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, X, Check, AlertCircle, Search } from 'lucide-react';

const Select = forwardRef(({
  label,
  error,
  options = [],
  value,
  onChange,
  onBlur,
  placeholder = 'Select an option',
  disabled = false,
  required = false,
  multiple = false,
  searchable = false,
  clearable = false,
  creatable = false,
  maxSelected,
  className = '',
  containerClassName = '',
  optionClassName = '',
  noOptionsMessage = 'No options available',
  loading = false,
  ...props
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const selectRef = useRef(null);
  const searchInputRef = useRef(null);

  // ==================== CLOSE ON CLICK OUTSIDE ====================
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ==================== FOCUS SEARCH WHEN OPENED ====================
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);

  // ==================== KEYBOARD NAVIGATION ====================
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      const filteredOptions = getFilteredOptions();
      
      switch(e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex(prev => 
            prev < filteredOptions.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
            handleOptionSelect(filteredOptions[highlightedIndex]);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setSearchTerm('');
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, highlightedIndex, options, searchTerm]);

  // ==================== GET FILTERED OPTIONS ====================
  const getFilteredOptions = () => {
    if (!searchTerm) return options;
    
    return options.filter(option => 
      option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      option.value.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // ==================== GET SELECTED LABELS ====================
  const getSelectedLabels = () => {
    if (multiple && Array.isArray(value)) {
      return options
        .filter(opt => value.includes(opt.value))
        .map(opt => opt.label);
    }
    
    const selected = options.find(opt => opt.value === value);
    return selected ? [selected.label] : [];
  };

  // ==================== HANDLE OPTION SELECT ====================
  const handleOptionSelect = (option) => {
    if (option.disabled) return;

    if (multiple) {
      const currentValue = Array.isArray(value) ? value : [];
      
      if (currentValue.includes(option.value)) {
        // Remove if already selected
        onChange?.(currentValue.filter(v => v !== option.value));
      } else {
        // Add if not selected and under max limit
        if (!maxSelected || currentValue.length < maxSelected) {
          onChange?.([...currentValue, option.value]);
        }
      }
    } else {
      onChange?.(option.value);
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  // ==================== HANDLE CLEAR ====================
  const handleClear = (e) => {
    e.stopPropagation();
    if (multiple) {
      onChange?.([]);
    } else {
      onChange?.('');
    }
  };

  // ==================== HANDLE REMOVE TAG ====================
  const handleRemoveTag = (valueToRemove, e) => {
    e.stopPropagation();
    const currentValue = Array.isArray(value) ? value : [];
    onChange?.(currentValue.filter(v => v !== valueToRemove));
  };

  // ==================== HANDLE CREATE OPTION ====================
  const handleCreateOption = () => {
    if (!creatable || !searchTerm) return;
    
    const newOption = {
      value: searchTerm.toLowerCase().replace(/\s+/g, '-'),
      label: searchTerm
    };
    
    handleOptionSelect(newOption);
    setSearchTerm('');
  };

  const filteredOptions = getFilteredOptions();
  const selectedLabels = getSelectedLabels();
  const showCreateOption = creatable && searchTerm && 
    !options.some(opt => opt.label.toLowerCase() === searchTerm.toLowerCase());

  return (
    <div className={`w-full ${containerClassName}`} ref={selectRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {/* Select Trigger */}
        <div
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`
            w-full min-h-[42px] px-4 py-2 border rounded-lg cursor-pointer
            flex items-center justify-between
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:border-indigo-500'}
            ${error ? 'border-red-500' : 'border-gray-300'}
            ${isOpen ? 'ring-2 ring-indigo-200 border-indigo-500' : ''}
            transition-all
            ${className}
          `}
          ref={ref}
          {...props}
        >
          {/* Selected Values */}
          <div className="flex-1 flex flex-wrap gap-1">
            {multiple ? (
              selectedLabels.length > 0 ? (
                selectedLabels.map((label, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full text-sm"
                  >
                    {label}
                    {clearable && (
                      <button
                        onClick={(e) => handleRemoveTag(value[index], e)}
                        className="hover:text-indigo-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                ))
              ) : (
                <span className="text-gray-400">{placeholder}</span>
              )
            ) : (
              <span className={value ? 'text-gray-900' : 'text-gray-400'}>
                {options.find(opt => opt.value === value)?.label || placeholder}
              </span>
            )}
          </div>
          
          {/* Icons */}
          <div className="flex items-center gap-1">
            {clearable && value && (multiple ? value.length > 0 : value) && (
              <button
                onClick={handleClear}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
            
            {isOpen ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>

        {/* Dropdown */}
        {isOpen && !disabled && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
            {/* Search Input */}
            {searchable && (
              <div className="sticky top-0 p-2 bg-white border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search..."
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            )}

            {/* Options List */}
            <div className="py-1">
              {loading ? (
                <div className="px-4 py-3 text-center text-gray-500">
                  Loading...
                </div>
              ) : filteredOptions.length > 0 ? (
                filteredOptions.map((option, index) => {
                  const isSelected = multiple
                    ? Array.isArray(value) && value.includes(option.value)
                    : value === option.value;
                  const isHighlighted = index === highlightedIndex;

                  return (
                    <div
                      key={option.value}
                      onClick={() => handleOptionSelect(option)}
                      className={`
                        px-4 py-2 cursor-pointer flex items-center justify-between
                        ${option.disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:bg-indigo-50'}
                        ${isSelected ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'}
                        ${isHighlighted ? 'bg-indigo-50' : ''}
                        ${optionClassName}
                      `}
                    >
                      <span className="flex-1">{option.label}</span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-indigo-600" />
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="px-4 py-3 text-center text-gray-500">
                  {noOptionsMessage}
                </div>
              )}

              {/* Create Option */}
              {showCreateOption && (
                <div
                  onClick={handleCreateOption}
                  className="px-4 py-2 cursor-pointer text-indigo-600 hover:bg-indigo-50 border-t border-gray-200"
                >
                  Create "{searchTerm}"
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Error Message */}
      {error && (
        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />
          {error}
        </p>
      )}
      
      {/* Max Selected Hint */}
      {maxSelected && multiple && Array.isArray(value) && value.length >= maxSelected && (
        <p className="mt-1 text-xs text-yellow-600">
          Maximum {maxSelected} items can be selected
        </p>
      )}
    </div>
  );
});

Select.displayName = 'Select';

// ==================== OPTION GROUP COMPONENT ====================
export const OptionGroup = ({ label, children, className = '' }) => {
  return (
    <div className={className}>
      <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50">
        {label}
      </div>
      {children}
    </div>
  );
};

export default Select;