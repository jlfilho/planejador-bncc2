import React from 'react';
import styles from './badge.module.css';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'draft' | 'ai' | 'skill' | 'neutral' | 'year';
  icon?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  icon,
  className = '',
}) => {
  return (
    <span className={`${styles.badge} ${styles[variant]} ${className}`}>
      {icon && <span className={styles.icon}>{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
