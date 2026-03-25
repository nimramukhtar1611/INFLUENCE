// components/UI/Input.js - COMPLETE FIXED VERSION
import React, { forwardRef, useState } from 'react';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

const Input = forwardRef(({
  label,
  error,
  success,
  icon: Icon,
  type = 'text',
  placeholder,
  value,
  onChange,
  onBlur,
  onFocus,
  disabled = false,
  required = false,
  readOnly = false,
  className = '',
  containerClassName = '',
  labelClassName = '',
  hint,
  maxLength,
  showPasswordToggle = false,
  validate = null,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState(false);
  const [validationError, setValidationError] = useState('');

  // ==================== HANDLE PASSWORD TOGGLE ====================
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // ==================== HANDLE BLUR ====================
  const handleBlur = (e) => {
    setTouched(true);
    
    // Custom validation
    if (validate) {
      const error = validate(value);
      setValidationError(error || '');
    }
    
    if (onBlur) onBlur(e);
  };

  // ==================== DETERMINE INPUT TYPE ====================
  const getInputType = () => {
    if (type === 'password' && showPassword) return 'text';
    if (type === 'password') return 'password';
    return type;
  };

  // ==================== GET INPUT STYLES ====================
  const getInputStyles = () => {
    let styles = 'w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all';
    
    if (disabled) styles += ' bg-gray-100 cursor-not-allowed';
    if (readOnly) styles += ' bg-gray-50 cursor-default';
    
    if (error || (touched && validationError)) {
      styles += ' border-red-500 focus:ring-red-200 focus:border-red-500';
    } else if (success || (touched && !validationError && value)) {
      styles += ' border-green-500 focus:ring-green-200 focus:border-green-500';
    } else {
      styles += ' border-gray-300 focus:ring-indigo-200 focus:border-indigo-500';
    }
    
    if (Icon) styles += ' pl-10';
    if (type === 'password' || showPasswordToggle) styles += ' pr-10';
    
    return styles;
  };

  // ==================== DISPLAY ERROR ====================
  const displayError = error || (touched ? validationError : '');

  return (
    <div className={`w-full ${containerClassName}`}>
      {label && (
        <label className={`block text-sm font-medium text-gray-700 mb-1 ${labelClassName}`}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {/* Left Icon */}
        {Icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
            <Icon className={`w-5 h-5 ${
              disabled ? 'text-gray-300' : 
              displayError ? 'text-red-400' :
              success ? 'text-green-400' : 'text-gray-400'
            }`} />
          </div>
        )}
        
        {/* Input */}
        <input
          ref={ref}
          type={getInputType()}
          value={value}
          onChange={onChange}
          onBlur={handleBlur}
          onFocus={onFocus}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          maxLength={maxLength}
          className={getInputStyles() + ' ' + className}
          {...props}
        />
        
        {/* Right Icons */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          {/* Validation Icons */}
          {!disabled && !readOnly && (
            <>
              {displayError && (
                <AlertCircle className="w-5 h-5 text-red-500" title={displayError} />
              )}
              {!displayError && success && value && (
                <CheckCircle className="w-5 h-5 text-green-500" />
              )}
            </>
          )}
          
          {/* Password Toggle */}
          {type === 'password' && showPasswordToggle && (
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="focus:outline-none"
              tabIndex="-1"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              ) : (
                <Eye className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              )}
            </button>
          )}
        </div>
      </div>
      
      {/* Error Message */}
      {displayError && (
        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />
          {displayError}
        </p>
      )}
      
      {/* Success Message */}
      {!displayError && success && value && (
        <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
          <CheckCircle className="w-4 h-4" />
          {success}
        </p>
      )}
      
      {/* Hint Text */}
      {hint && !displayError && (
        <p className="mt-1 text-xs text-gray-500">{hint}</p>
      )}
      
      {/* Character Counter */}
      {maxLength && (
        <p className="mt-1 text-xs text-gray-500 text-right">
          {value?.length || 0}/{maxLength}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

// ==================== TEXTAREA COMPONENT ====================
export const Textarea = forwardRef(({
  label,
  error,
  success,
  placeholder,
  value,
  onChange,
  onBlur,
  disabled = false,
  required = false,
  rows = 4,
  maxLength,
  className = '',
  containerClassName = '',
  ...props
}, ref) => {
  return (
    <div className={`w-full ${containerClassName}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <textarea
        ref={ref}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        rows={rows}
        maxLength={maxLength}
        className={`
          w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}
          ${error ? 'border-red-500 focus:ring-red-200' : 
            success ? 'border-green-500 focus:ring-green-200' : 
            'border-gray-300 focus:ring-indigo-200 focus:border-indigo-500'}
          ${className}
        `}
        {...props}
      />
      
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      
      {maxLength && (
        <p className="mt-1 text-xs text-gray-500 text-right">
          {value?.length || 0}/{maxLength}
        </p>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';

export default Input;