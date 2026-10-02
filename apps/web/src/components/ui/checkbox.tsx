import React from 'react';
import { Check } from 'lucide-react';
import styles from './checkbox.module.css';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  label?: React.ReactNode;
  className?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onChange,
  disabled = false,
  id,
  label,
  className = '',
}) => {
  return (
    <label
      className={`${styles.container} ${disabled ? styles.disabled : ''} ${className}`}
      htmlFor={id}
    >
      <input
        type="checkbox"
        id={id}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className={styles.hiddenInput}
      />
      <div
        className={`${styles.customBox} ${checked ? styles.checked : ''}`}
        aria-hidden="true"
      >
        {checked && <Check size={13} className={styles.checkIcon} />}
      </div>
      {label && <span className={styles.label}>{label}</span>}
    </label>
  );
};
