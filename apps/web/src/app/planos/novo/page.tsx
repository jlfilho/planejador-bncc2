'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ListChecks,
  Sparkles,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';
import { apiFetch, ApiError } from '../../../services/api';
import { AppLayout } from '../../../components/layout/app-layout';
import { BnccCatalog, BnccSkillItem } from '../../../components/bncc/bncc-catalog';
import { Button, Input, Textarea, Chip, Alert } from '../../../components/ui';
import { LoadingState } from './loading-state';
import { ErrorState } from './error-state';
import styles from './novo.module.css';

export default function NovoPlanoPage() {
  const router = useRouter();

  // Estados dos campos do formulário
  const [selectedSkills, setSelectedSkills] = useState<BnccSkillItem[]>([]);
  const [tituloProvisorio, setTituloProvisorio] = useState('');
  const [instrucao, setInstrucao] = useState(
    'Proponha uma investigação prática de organização e classificação de materiais em grupos.',
  );
  const [duracao, setDuracao] = useState<number>(50);
  const [recursosDigitais, setRecursosDigitais] = useState<boolean>(true);

  // Estados de ciclo de vida da geração
  const [generationState, setGenerationState] = useState<'idle' | 'generating' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Alterna seleção de habilidade
  const handleToggleSkill = (skill: BnccSkillItem) => {
    setSelectedSkills((prev) => {
      const exists = prev.some((s) => s.codigo === skill.codigo);
      if (exists) {
        return prev.filter((s) => s.codigo !== skill.codigo);
      }
      return [...prev, skill];
    });
  };

  // Remove chip de habilidade
  const handleRemoveSkill = (codigo: string) => {
    setSelectedSkills((prev) => prev.filter((s) => s.codigo !== codigo));
  };

  // Validações
  const isDuracaoValid = duracao >= 15 && duracao <= 360;
  const isInstrucaoValid = instrucao.trim().length >= 10 && instrucao.trim().length <= 1000;
  const hasSkills = selectedSkills.length > 0;
  const isFormValid = isDuracaoValid && isInstrucaoValid && hasSkills;

  // Submissão do plano
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || generationState === 'generating') return;

    setGenerationState('generating');
    setErrorMessage(null);

    try {
      const createdPlan = await apiFetch<{ id: string }>('/api/plans/generate', {
        method: 'POST',
        body: JSON.stringify({
          skillCodes: selectedSkills.map((s) => s.codigo),
          instrucao: instrucao.trim(),
          duracao: Number(duracao),
          recursosDigitais,
          tituloProvisorio: tituloProvisorio.trim() || undefined,
        }),
      });

      // Sucesso atômico: redireciona para o editor do plano
      router.push(`/planos/${createdPlan.id}`);
    } catch (err: unknown) {
      setGenerationState('error');
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage(
          'Não foi possível gerar. Nenhum plano foi salvo. Você pode tentar novamente.',
        );
      }
    }
  };

  return (
    <AppLayout pageTitle="Novo plano" breadcrumb="Meus planos / Novo plano">
      <div className={styles.container}>
        {/* Cabeçalho */}
        <div className={styles.header}>
          <div className={styles.intro}>
            <h1 className={styles.pageTitle}>Criar novo plano</h1>
            <p className={styles.pageSubtitle}>
              Selecione habilidades da BNCC e descreva sua intenção. A IA
              prepara um rascunho para você revisar — nada é salvo
              automaticamente.
            </p>
          </div>
          <div className={styles.stepBadge}>
            <ListChecks size={18} />
            <span>1. Contexto e habilidades</span>
          </div>
        </div>

        {/* Estado Visual de Preparação / Loading (Frame 6) */}
        {generationState === 'generating' && <LoadingState />}

        {/* Estado Visual de Falha (Frame 7) */}
        {generationState === 'error' && (
          <ErrorState message={errorMessage || undefined} />
        )}

        {/* Formulário em Duas Colunas (Desktop) */}
        <form onSubmit={handleGenerate} className={styles.formGrid}>
          {/* Coluna Esquerda: Catálogo BNCC */}
          <BnccCatalog
            selectedSkills={selectedSkills}
            onToggleSkill={handleToggleSkill}
            disabled={generationState === 'generating'}
          />

          {/* Coluna Direita: Contexto Pedagógico */}
          <div className={styles.contextColumn}>
            <div className={styles.sectionHeaderContent}>
              <h2 className={styles.sectionTitle}>Contexto do plano</h2>
              <p className={styles.sectionSubtitle}>
                Essas informações orientam a estrutura do rascunho.
              </p>
            </div>

            {/* Habilidades Selecionadas */}
            <div className={styles.selectedSkillsSection}>
              <div className={styles.selectedSkillsHeader}>
                <span className={styles.selectedSkillsLabel}>Selecionadas</span>
                <span className={styles.selectedSkillsCount}>
                  {selectedSkills.length}{' '}
                  {selectedSkills.length === 1 ? 'habilidade' : 'habilidades'}
                </span>
              </div>

              {selectedSkills.length > 0 ? (
                <div className={styles.chipsContainer}>
                  {selectedSkills.map((skill) => (
                    <Chip
                      key={skill.codigo}
                      label={skill.codigo}
                      onRemove={
                        generationState !== 'generating'
                          ? () => handleRemoveSkill(skill.codigo)
                          : undefined
                      }
                    />
                  ))}
                </div>
              ) : (
                <p className={styles.emptySkillsWarning}>
                  Selecione ao menos 1 habilidade no catálogo ao lado.
                </p>
              )}
            </div>

            {/* Título Provisório */}
            <Input
              label="Título provisório"
              value={tituloProvisorio}
              onChange={(e) => setTituloProvisorio(e.target.value)}
              placeholder="Ex: Padrões na Sala de Aula"
              hint="Você poderá editar este título depois."
              rightIcon={
                tituloProvisorio.trim() ? (
                  <CheckCircle size={18} color="var(--color-success-text)" />
                ) : undefined
              }
              disabled={generationState === 'generating'}
            />

            {/* Instrução Pedagógica */}
            <Textarea
              label="Instrução pedagógica"
              value={instrucao}
              onChange={(e) => setInstrucao(e.target.value)}
              placeholder="Descreva abordagem, dinâmica em grupos ou objetivos didáticos desejados..."
              hint="Descreva abordagem, turma ou contexto desejado (10 a 1000 caracteres)."
              error={
                instrucao.length > 0 && !isInstrucaoValid
                  ? 'A instrução pedagógica deve conter entre 10 e 1000 caracteres.'
                  : undefined
              }
              rows={4}
              disabled={generationState === 'generating'}
              required
            />

            {/* Duração em minutos */}
            <Input
              label="Duração (minutos)"
              type="number"
              value={duracao || ''}
              onChange={(e) => setDuracao(parseInt(e.target.value, 10) || 0)}
              min={15}
              max={360}
              placeholder="50"
              hint="Duração estimada da aula (15 a 360 min)."
              error={
                !isDuracaoValid
                  ? 'Informe uma duração entre 15 e 360 minutos.'
                  : undefined
              }
              disabled={generationState === 'generating'}
              required
            />

            {/* Recursos Digitais */}
            <div className={styles.radioGroupContainer}>
              <span className={styles.radioLabel}>Usar recursos digitais?</span>
              <div className={styles.radioOptions}>
                <label
                  className={styles.radioOption}
                  onClick={() =>
                    generationState !== 'generating' && setRecursosDigitais(true)
                  }
                >
                  <div
                    className={`${styles.customRadio} ${
                      recursosDigitais ? styles.customRadioActive : ''
                    }`}
                  >
                    {recursosDigitais && <div className={styles.radioIndicator} />}
                  </div>
                  <span>Sim</span>
                </label>

                <label
                  className={styles.radioOption}
                  onClick={() =>
                    generationState !== 'generating' && setRecursosDigitais(false)
                  }
                >
                  <div
                    className={`${styles.customRadio} ${
                      !recursosDigitais ? styles.customRadioActive : ''
                    }`}
                  >
                    {!recursosDigitais && (
                      <div className={styles.radioIndicator} />
                    )}
                  </div>
                  <span>Não</span>
                </label>
              </div>
            </div>

            {/* Alerta de Validação antes de gerar (Frame 5) */}
            {!isFormValid && (
              <Alert variant="warning" title="Revise antes de gerar">
                {!hasSkills
                  ? 'Selecione ao menos uma habilidade da BNCC.'
                  : !isDuracaoValid
                  ? 'Corrija a duração (15 a 360 min) para continuar.'
                  : 'Descreva a instrução pedagógica com no mínimo 10 caracteres.'}
              </Alert>
            )}

            {/* Botão de Geração */}
            <Button
              type="submit"
              variant="primary"
              size="md"
              className={styles.generateButton}
              isLoading={generationState === 'generating'}
              disabled={!isFormValid || generationState === 'generating'}
              leftIcon={<Sparkles size={18} />}
            >
              {generationState === 'generating'
                ? 'Gerando rascunho…'
                : generationState === 'error'
                ? 'Tentar gerar novamente'
                : 'Gerar rascunho com IA'}
            </Button>

            {/* Aviso de Controle Docente */}
            <div className={styles.safetyReassurance}>
              <ShieldCheck size={16} className={styles.safetyIcon} />
              <span>
                A IA cria somente um rascunho. Você revisa e escolhe quando
                salvar.
              </span>
            </div>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
