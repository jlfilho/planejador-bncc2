import React from 'react';
import { AlertCircle } from 'lucide-react';
import styles from './error-state.module.css';

export interface ErrorStateProps {
  message?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message }) => {
  return (
    <div className={styles.banner} role="alert">
      <div className={styles.iconContainer}>
        <AlertCircle size={20} className={styles.icon} />
      </div>
      <div className={styles.textContainer}>
        <h3 className={styles.title}>Não foi possível gerar o rascunho</h3>
        <p className={styles.description}>
          {message ||
            'O processamento foi interrompido e nenhum plano foi salvo. Seus campos e habilidades continuam aqui. Revise as informações e faça uma nova tentativa manual quando estiver pronto.'}
        </p>
      </div>
    </div>
  );
};
