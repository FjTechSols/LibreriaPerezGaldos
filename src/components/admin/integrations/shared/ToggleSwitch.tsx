// Reusable Component: ToggleSwitch
// A reusable toggle switch component with dark mode support

import React from 'react';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
  description?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  label,
  description
}) => {
  return (
    <div className="toggle-group">
      <label className={`toggle-label ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}>
        <label className="switch">
          <input 
            type="checkbox" 
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
          />
          <span className={`slider round ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}></span>
        </label>
        <span className={disabled ? 'text-gray-400 dark:text-gray-500' : ''}>
          {label}
        </span>
      </label>
      {description && (
        <p className="toggle-description">{description}</p>
      )}
    </div>
  );
};
