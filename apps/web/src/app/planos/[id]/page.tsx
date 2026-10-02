'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Save,
  CheckCircle,
  Sparkles,
  UserCheck,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';
import { apiFetch, ApiError } from '../../../services/api';
import { AppLayout } from '../../../components/layout/app-layout';
import { Button, Badge, Alert } from '../../../components/ui';
import { MarkdownToolbar } from '../../../components/editor/markdown-toolbar';
import { MarkdownPreview } from '../../../components/editor/markdown-preview';
import { ExitConfirmationModal } from '../../../components/editor/exit-confirmation-modal';
import styles from './editor.module.css';

interface Skill {
  id: string;
  codigo: string;
  nivel: string;
  ano?: number;
  eixo: string;
  descricao: string;
}

interface PlanDetail {
  id: string;
  titulo: string;
  instrucao: string;
  duracao: number;
  recursosDigitais: boolean;
  conteudoMarkdown: string;
  status: 'RASCUNHO';
  aiAssisted: boolean;
  createdAt: string;
  updatedAt: string;
  skills: Skill[];
}

export default function PlanEditorPage() {
  const params = useParams();
  const router = useRouter();
  const planId = params.id as string;

  const [plan, setPlan] = useState<PlanDetail | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [originalTitle, setOriginalTitle] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [lastSaved, setLastSaved] = useState<string>('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Carrega plano da API
  useEffect(() => {
    let mounted = true;
    async function loadPlan() {
      setIsLoading(true);
      try {
        const data = await apiFetch<PlanDetail>(`/api/plans/${planId}`);
        if (mounted) {
          setPlan(data);
          setTitle(data.titulo);
          setContent(data.conteudoMarkdown);
          setOriginalTitle(data.titulo);
          setOriginalContent(data.conteudoMarkdown);
          setLastSaved(data.updatedAt);
        }
      } catch (err: unknown) {
        if (mounted) {
          if (err instanceof ApiError && err.statusCode === 404) {
            setErrorMessage('Plano não encontrado.');
          } else {
            setErrorMessage('Erro ao carregar o plano de aula.');
          }
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    if (planId) {
      loadPlan();
    }
    return () => {
      mounted = false;
    };
  }, [planId]);

  const isDirty = title !== originalTitle || content !== originalContent;

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return;

    setIsSaving(true);
    setSaveSuccess(false);
    setErrorMessage(null);

    try {
      const updated = await apiFetch<{
        id: string;
        titulo: string;
        conteudoMarkdown: string;
        status: string;
        updatedAt: string;
      }>(`/api/plans/${planId}`, {
        method: 'PUT',
        body: JSON.stringify({
          titulo: title.trim(),
          conteudoMarkdown: content,
        }),
      });

      setOriginalTitle(updated.titulo);
      setOriginalContent(updated.conteudoMarkdown);
      setLastSaved(updated.updatedAt);
      setSaveSuccess(true);

      setTimeout(() => {
        setSaveSuccess(false);
      }, 4000);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Não foi possível salvar as alterações.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackClick = (e: React.MouseEvent) => {
    if (isDirty) {
      e.preventDefault();
      setIsExitModalOpen(true);
    }
  };

  const formatLastSavedTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const formatMetaString = () => {
    if (!plan) return '';
    const firstSkill = plan.skills[0];
    const eixo = firstSkill?.eixo || 'BNCC';
    const ano = firstSkill?.ano ? `${firstSkill.ano}º ano` : firstSkill?.nivel || '';
    const dur = `${plan.duracao} minutos`;
    const rec = plan.recursosDigitais ? 'Com recursos digitais' : 'Desplugado';

    return [eixo, ano, dur, rec].filter(Boolean).join(' · ');
  };

  if (isLoading) {
    return (
      <AppLayout pageTitle="Carregando..." breadcrumb="Meus planos / Rascunho">
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--color-gray-600)' }}>
          Carregando plano de aula...
        </div>
      </AppLayout>
    );
  }

  if (errorMessage === 'Plano não encontrado.' || !plan) {
    return (
      <AppLayout pageTitle="Plano não encontrado" breadcrumb="Meus planos">
        <div style={{ maxWidth: 600, margin: '40px auto' }}>
          <Alert variant="error" title="Plano não encontrado">
            Este plano não existe ou pertence a outro professor. O acesso é restrito exclusivamente ao docente proprietário.
          </Alert>
          <div style={{ marginTop: 24 }}>
            <Button variant="primary" onClick={() => router.push('/planos')}>
              Voltar para Meus Planos
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle={title || 'Rascunho'} breadcrumb="Meus planos / Rascunho">
      <div className={styles.container}>
        {/* Banner de Sucesso ao Salvar (Frame 8) */}
        {saveSuccess && (
          <Alert variant="success" title="Alterações salvas com sucesso">
            Seu rascunho foi atualizado e permanece privado na sua conta.
          </Alert>
        )}

        {/* Banner de Erro caso ocorra falha */}
        {errorMessage && errorMessage !== 'Plano não encontrado.' && (
          <Alert variant="error" title="Não foi possível salvar">
            {errorMessage}
          </Alert>
        )}

        {/* Barra Superior do Editor */}
        <div className={styles.topBar}>
          <div className={styles.headerLeft}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Link
                href="/planos"
                onClick={handleBackClick}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 13,
                  color: 'var(--color-primary-700)',
                  fontWeight: 600,
                }}
              >
                <ArrowLeft size={16} /> Meus planos
              </Link>
            </div>

            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={styles.titleInput}
              placeholder="Título do plano de aula"
              aria-label="Título do plano de aula"
              maxLength={100}
            />

            <div className={styles.metaRow}>
              <span className={styles.metaText}>{formatMetaString()}</span>
              <Badge variant="draft">RASCUNHO</Badge>
              {plan.aiAssisted && (
                <Badge variant="ai" icon={<Sparkles size={13} />}>
                  Auxílio por IA
                </Badge>
              )}
            </div>
          </div>

          <div className={styles.headerActions}>
            <Button
              variant="primary"
              size="md"
              onClick={handleSave}
              isLoading={isSaving}
              disabled={isSaving || !title.trim() || !content.trim()}
              leftIcon={<Save size={18} />}
            >
              Salvar alterações
            </Button>
          </div>
        </div>

        {/* Abas Mobile e Tablet */}
        <div className={styles.tabsContainer}>
          <button
            type="button"
            className={`${styles.tabButton} ${
              activeTab === 'editor' ? styles.tabButtonActive : ''
            }`}
            onClick={() => setActiveTab('editor')}
          >
            Editor Markdown
          </button>
          <button
            type="button"
            className={`${styles.tabButton} ${
              activeTab === 'preview' ? styles.tabButtonActive : ''
            }`}
            onClick={() => setActiveTab('preview')}
          >
            Pré-visualização
          </button>
        </div>

        {/* Split View Desktop / Abas Mobile */}
        <div className={styles.splitView}>
          {/* Painel do Editor */}
          <div
            className={`${styles.editorPanel} ${
              activeTab !== 'editor' ? styles.hiddenMobile : ''
            }`}
          >
            <MarkdownToolbar
              textareaRef={textareaRef}
              onContentChange={(newText) => setContent(newText)}
            />
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className={styles.markdownTextarea}
              placeholder="Digite seu plano em Markdown..."
              aria-label="Conteúdo em Markdown"
            />
          </div>

          {/* Painel de Pré-visualização Formatada */}
          <div
            className={`${styles.previewPanel} ${
              activeTab !== 'preview' ? styles.hiddenMobile : ''
            }`}
          >
            <div className={styles.previewHeader}>
              <h2 className={styles.previewTitle}>{title}</h2>
              <span className={styles.previewMeta}>{formatMetaString()}</span>
            </div>

            <MarkdownPreview content={content} />
          </div>
        </div>

        {/* Nota de Autoria (Frame 8) */}
        <div className={styles.autorshipNotice}>
          <UserCheck size={16} className={styles.autorshipIcon} />
          <span>
            Revise o conteúdo gerado antes de usar em sala. A decisão pedagógica
            é sempre sua.
          </span>
        </div>

        {/* Modal de Confirmação de Saída sem Salvar (Frame 9) */}
        <ExitConfirmationModal
          isOpen={isExitModalOpen}
          onClose={() => setIsExitModalOpen(false)}
          onConfirmExit={() => {
            setIsExitModalOpen(false);
            router.push('/planos');
          }}
          planTitle={title}
          lastSavedFormatted={
            lastSaved ? `hoje, às ${formatLastSavedTime(lastSaved)}` : undefined
          }
        />
      </div>
    </AppLayout>
  );
}
