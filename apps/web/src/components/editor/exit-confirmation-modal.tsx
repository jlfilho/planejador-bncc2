'use client';

import React from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import { Modal, Button } from '../ui';
import styles from './exit-confirmation-modal.module.css';

interface ExitConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmExit: () => void;
  planTitle: string;
  lastSavedFormatted?: string;
}

export const ExitConfirmationModal: React.FC<ExitConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirmExit,
  planTitle,
  lastSavedFormatted,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className={styles.modalContent}>
        {/* Cabeçalho */}
        <div className={styles.header}>
          <div className={styles.iconCircle}>
            <AlertTriangle size={22} className={styles.warningIcon} />
          </div>
          <div className={styles.textContainer}>
            <h3 className={styles.title}>Sair sem salvar?</h3>
            <p className={styles.description}>
              Você tem alterações não salvas em “{planTitle || 'seu plano'}”. Se
              sair agora, essas alterações serão perdidas.
            </p>
          </div>
        </div>

        {/* Resumo Último Salvamento */}
        {lastSavedFormatted && (
          <div className={styles.lastSavedBadge}>
            <Clock size={16} className={styles.clockIcon} />
            <span>Último salvamento: {lastSavedFormatted}</span>
          </div>
        )}

        {/* Ações */}
        <div className={styles.actions}>
          <Button variant="outline" size="md" onClick={onClose}>
            Continuar editando
          </Button>
          <Button variant="danger" size="md" onClick={onConfirmExit}>
            Sair sem salvar
          </Button>
        </div>
      </div>
    </Modal>
  );
};
