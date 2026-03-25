import React, { useState } from 'react';
import { User, Building2 } from 'lucide-react';

const PlaceholderImage = ({ type = 'user', size = 40, className = '' }) => {
  const [error, setError] = useState(false);
  
  // Generate a consistent color based on the type
  const colors = {
    user: 'bg-indigo-100 text-indigo-600',
    brand: 'bg-purple-100 text-purple-600',
    campaign: 'bg-green-100 text-green-600'
  };
  
  const icons = {
    user: User,
    brand: Building2,
    campaign: Building2
  };
  
  const Icon = icons[type] || User;
  const colorClass = colors[type] || colors.user;
  
  // If there's an error loading external image, show placeholder
  if (error) {
    return (
      <div 
        className={`${colorClass} ${className} rounded-full flex items-center justify-center`}
        style={{ width: size, height: size }}
      >
        <Icon className="w-1/2 h-1/2" />
      </div>
    );
  }
  
  // Try to load external image, fallback to placeholder on error
  return (
    <img
      src={`https://ui-avatars.com/api/?name=${type}&background=random&size=${size}`}
      alt={type}
      className={`${className} rounded-full object-cover`}
      style={{ width: size, height: size }}
      onError={() => setError(true)}
    />
  );
};

export default PlaceholderImage;