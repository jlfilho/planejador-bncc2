import React from 'react';
import { X } from 'lucide-react';
import styles from './chip.module.css';

export interface ChipProps {
  label: string;
  onRemove?: () => void;
  className?: string;
}

export const Chip: React.FC<ChipProps> = ({ label, onRemove, className = '' }) => {
  return (
    <span className={`${styles.chip} ${className}`}>
      <span className={styles.label}>{label}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className={styles.removeButton}
          aria-label={`Remover habilidade ${label}`}
        >
          <X size={13} />
        </button>
      )}
    </span>
  );
};
