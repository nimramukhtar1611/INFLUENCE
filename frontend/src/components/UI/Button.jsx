// components/UI/Button.js - COMPLETE FIXED VERSION
import React from 'react';
import { Loader } from 'lucide-react';

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon: Icon,
  iconPosition = 'left',
  onClick,
  type = 'button',
  className = '',
  ...props 
}) => {
  // ==================== VARIANTS ====================
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 active:bg-indigo-800',
    secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-indigo-500 active:bg-gray-100',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 active:bg-red-800',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 active:bg-green-800',
    warning: 'bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500 active:bg-yellow-800',
    outline: 'border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 focus:ring-indigo-500 active:bg-indigo-100',
    ghost: 'text-gray-600 hover:bg-gray-100 focus:ring-gray-500 active:bg-gray-200',
    link: 'text-indigo-600 hover:text-indigo-700 underline-offset-2 hover:underline focus:ring-indigo-500 p-0'
  };

  // ==================== SIZES ====================
  const sizes = {
    xs: 'px-2 py-1 text-xs gap-1',
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-base gap-2',
    lg: 'px-6 py-3 text-lg gap-2',
    xl: 'px-8 py-4 text-xl gap-3'
  };

  // ==================== LOADER SIZES ====================
  const loaderSizes = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-7 h-7'
  };

  // ==================== DISABLED STYLES ====================
  const disabledStyles = 'opacity-50 cursor-not-allowed pointer-events-none';

  // ==================== RENDER LOADER ====================
  const renderLoader = () => (
    <Loader 
      className={`${loaderSizes[size]} animate-spin ${
        variant === 'primary' || variant === 'danger' || variant === 'success' || variant === 'warning'
          ? 'text-white'
          : 'text-current'
      }`} 
    />
  );

  // ==================== RENDER ICON ====================
  const renderIcon = () => {
    if (!Icon) return null;
    const iconSize = {
      xs: 'w-3 h-3',
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
      xl: 'w-7 h-7'
    }[size];
    
    return <Icon className={iconSize} />;
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${(disabled || loading) ? disabledStyles : ''}
        rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-offset-2
        transition-all duration-200 ease-in-out
        flex items-center justify-center
        ${className}
      `}
      {...props}
    >
      {loading && iconPosition === 'left' && renderLoader()}
      {!loading && iconPosition === 'left' && renderIcon()}
      
      <span className={`${loading && iconPosition === 'left' ? 'ml-2' : ''} ${
        loading && iconPosition === 'right' ? 'mr-2' : ''
      }`}>
        {children}
      </span>
      
      {loading && iconPosition === 'right' && renderLoader()}
      {!loading && iconPosition === 'right' && renderIcon()}
    </button>
  );
};

// ==================== ICON BUTTON COMPONENT ====================
export const IconButton = ({
  icon: Icon,
  variant = 'ghost',
  size = 'md',
  loading = false,
  disabled = false,
  onClick,
  type = 'button',
  className = '',
  label,
  ...props
}) => {
  const sizes = {
    xs: 'p-1',
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-2.5',
    xl: 'p-3'
  };

  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-7 h-7'
  };

  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500',
    secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-indigo-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    ghost: 'text-gray-600 hover:bg-gray-100 focus:ring-gray-500',
    outline: 'border border-gray-300 hover:bg-gray-50 focus:ring-indigo-500'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${variants[variant]}
        ${sizes[size]}
        rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2
        transition-all duration-200 ease-in-out
        ${(disabled || loading) ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
      aria-label={label}
      title={label}
      {...props}
    >
      {loading ? (
        <Loader className={`${iconSizes[size]} animate-spin`} />
      ) : (
        <Icon className={iconSizes[size]} />
      )}
    </button>
  );
};

// ==================== BUTTON GROUP COMPONENT ====================
export const ButtonGroup = ({
  children,
  orientation = 'horizontal',
  attached = false,
  className = ''
}) => {
  const baseClasses = attached ? 'flex' : 'flex gap-2';
  const orientationClasses = orientation === 'horizontal' ? 'flex-row' : 'flex-col';
  
  return (
    <div className={`${baseClasses} ${orientationClasses} ${className}`}>
      {React.Children.map(children, (child, index) => {
        if (!child) return null;
        
        if (attached) {
          let roundedClasses = '';
          const totalChildren = React.Children.count(children);
          
          if (orientation === 'horizontal') {
            if (index === 0) roundedClasses = 'rounded-r-none';
            else if (index === totalChildren - 1) roundedClasses = 'rounded-l-none';
            else roundedClasses = 'rounded-none';
          } else {
            if (index === 0) roundedClasses = 'rounded-b-none';
            else if (index === totalChildren - 1) roundedClasses = 'rounded-t-none';
            else roundedClasses = 'rounded-none';
          }
          
          return React.cloneElement(child, {
            className: `${child.props.className || ''} ${roundedClasses}`
          });
        }
        
        return child;
      })}
    </div>
  );
};

export default Button;