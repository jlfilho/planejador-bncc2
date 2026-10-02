'use client';

import React from 'react';
import { Bold, Italic, List, ListOrdered, Link2 } from 'lucide-react';
import styles from '../../app/planos/[id]/editor.module.css';

interface MarkdownToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onContentChange: (newContent: string) => void;
}

export const MarkdownToolbar: React.FC<MarkdownToolbarProps> = ({
  textareaRef,
  onContentChange,
}) => {
  const insertSyntax = (before: string, after: string = '', defaultText: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    const selectedText = text.substring(start, end) || defaultText;
    const replacement = `${before}${selectedText}${after}`;

    const newText = text.substring(0, start) + replacement + text.substring(end);
    onContentChange(newText);

    // Reposiciona o cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + selectedText.length,
      );
    }, 0);
  };

  return (
    <div className={styles.editorToolbar}>
      <button
        type="button"
        className={styles.toolbarBtn}
        onClick={() => insertSyntax('**', '**', 'negrito')}
        title="Negrito (Ctrl+B)"
        aria-label="Negrito"
      >
        <Bold size={16} />
      </button>

      <button
        type="button"
        className={styles.toolbarBtn}
        onClick={() => insertSyntax('*', '*', 'itálico')}
        title="Itálico (Ctrl+I)"
        aria-label="Itálico"
      >
        <Italic size={16} />
      </button>

      <div className={styles.toolbarDivider} />

      <button
        type="button"
        className={styles.toolbarBtn}
        onClick={() => insertSyntax('- ', '', 'item da lista')}
        title="Lista não ordenada"
        aria-label="Lista não ordenada"
      >
        <List size={16} />
      </button>

      <button
        type="button"
        className={styles.toolbarBtn}
        onClick={() => insertSyntax('1. ', '', 'item numerado')}
        title="Lista numerada"
        aria-label="Lista numerada"
      >
        <ListOrdered size={16} />
      </button>

      <div className={styles.toolbarDivider} />

      <button
        type="button"
        className={styles.toolbarBtn}
        onClick={() => insertSyntax('[', '](https://exemplo.com)', 'texto do link')}
        title="Inserir link"
        aria-label="Inserir link"
      >
        <Link2 size={16} />
      </button>
    </div>
  );
};
