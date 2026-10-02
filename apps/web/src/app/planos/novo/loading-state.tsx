import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import styles from './loading-state.module.css';

export const LoadingState: React.FC = () => {
  const [progress, setProgress] = useState(5);

  useEffect(() => {
    // Simula barra de progresso suave até 92% enquanto aguarda a API
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 30) return prev + 4;
        if (prev < 60) return prev + 2;
        if (prev < 90) return prev + 0.8;
        return prev;
      });
    }, 400);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.banner} role="status" aria-live="polite">
      <div className={styles.topRow}>
        <div className={styles.spinnerWrapper}>
          <Loader2 size={24} className={styles.spinner} />
        </div>
        <div className={styles.textColumn}>
          <h3 className={styles.title}>Preparando seu rascunho com IA</h3>
          <p className={styles.description}>
            Estamos organizando o conteúdo pedagógico. Isso pode levar até 60
            segundos.
          </p>
        </div>
      </div>

      <div className={styles.progressTrack}>
        <div
          className={styles.progressBar}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};
