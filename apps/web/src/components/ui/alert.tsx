import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import styles from './alert.module.css';

export interface AlertProps {
  title?: string;
  children: React.ReactNode;
  variant?: 'error' | 'warning' | 'info' | 'success';
  className?: string;
  customIcon?: React.ReactNode;
}

export const Alert: React.FC<AlertProps> = ({
  title,
  children,
  variant = 'info',
  className = '',
  customIcon,
}) => {
  const getDefaultIcon = () => {
    switch (variant) {
      case 'error':
        return <AlertCircle size={20} className={styles.errorIcon} />;
      case 'warning':
        return <AlertTriangle size={20} className={styles.warningIcon} />;
      case 'success':
        return <CheckCircle size={20} className={styles.successIcon} />;
      case 'info':
      default:
        return <Info size={20} className={styles.infoIcon} />;
    }
  };

  return (
    <div className={`${styles.alert} ${styles[variant]} ${className}`} role="alert">
      <div className={styles.iconContainer}>{customIcon || getDefaultIcon()}</div>
      <div className={styles.content}>
        {title && <h4 className={styles.title}>{title}</h4>}
        <div className={styles.description}>{children}</div>
      </div>
    </div>
  );
};
