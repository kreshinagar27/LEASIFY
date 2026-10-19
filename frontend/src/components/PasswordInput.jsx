import React, { useState, forwardRef } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';

/**
 * Accessible PasswordInput component with independent Show/Hide toggle.
 * Compatible with react-hook-form (ref forwarding), controlled & uncontrolled inputs.
 */
const PasswordInput = forwardRef(({
  id,
  name,
  register: registerFn,
  rules,
  error,
  placeholder = '••••••••',
  className = '',
  containerClassName = '',
  leftIcon: LeftIcon = Lock,
  showLeftIcon = true,
  ariaLabel,
  ...rest
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);

  const registeredProps = (typeof registerFn === 'function' && name)
    ? registerFn(name, rules)
    : {};

  const toggleVisibility = (e) => {
    e.preventDefault();
    setShowPassword((prev) => !prev);
  };

  return (
    <div className={`relative flex items-center ${containerClassName}`}>
      <input
        ref={(node) => {
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
          if (registeredProps.ref) registeredProps.ref(node);
        }}
        id={id}
        name={name}
        type={showPassword ? 'text' : 'password'}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={`w-full ${showLeftIcon ? 'pl-10' : 'pl-3.5'} pr-10 py-2.5 rounded-2xl glass-input text-sm ${className}`}
        {...registeredProps}
        {...rest}
      />
      {showLeftIcon && LeftIcon && (
        <LeftIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#77665A] dark:text-[#AA9886] pointer-events-none select-none" />
      )}
      <button
        type="button"
        onMouseDown={(e) => {
          // Prevent input from losing focus / cursor selection on mouse click
          e.preventDefault();
        }}
        onClick={toggleVisibility}
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        title={showPassword ? 'Hide password' : 'Show password'}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#77665A] hover:text-[#39251F] dark:text-[#AA9886] dark:hover:text-[#F6EEE3] transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/40 select-none flex items-center justify-center cursor-pointer"
      >
        {showPassword ? (
          <EyeOff className="w-4 h-4" aria-hidden="true" />
        ) : (
          <Eye className="w-4 h-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
});

PasswordInput.displayName = 'PasswordInput';

export default PasswordInput;
