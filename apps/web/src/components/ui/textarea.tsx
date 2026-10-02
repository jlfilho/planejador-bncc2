import React from 'react';
import styles from './textarea.module.css';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  isMonospace?: boolean;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  hint,
  isMonospace = false,
  className = '',
  id,
  ...props
}) => {
  const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`${styles.container} ${className}`}>
      {label && (
        <label htmlFor={textareaId} className={styles.label}>
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={`${styles.textarea} ${isMonospace ? styles.monospace : ''} ${
          error ? styles.hasError : ''
        }`}
        {...props}
      />
      {error && <span className={styles.errorText}>{error}</span>}
      {!error && hint && <span className={styles.hintText}>{hint}</span>}
    </div>
  );
};
