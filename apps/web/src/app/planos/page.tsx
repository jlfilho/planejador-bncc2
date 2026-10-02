'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Lock,
  Sparkles,
  ChevronRight,
  FilePlus2,
  ShieldCheck,
} from 'lucide-react';
import { apiFetch } from '../../services/api';
import { AppLayout } from '../../components/layout/app-layout';
import { Button, Input, Badge } from '../../components/ui';
import styles from './planos.module.css';

interface Skill {
  codigo: string;
  nivel: string;
  ano?: number;
  eixo: string;
}

interface PlanItem {
  id: string;
  titulo: string;
  duracao: number;
  recursosDigitais: boolean;
  status: 'RASCUNHO';
  aiAssisted: boolean;
  createdAt: string;
  updatedAt: string;
  skills: Skill[];
}

interface PlansResponse {
  total: number;
  items: PlanItem[];
}

export default function PlanosPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchPlans = useCallback(async (query: string) => {
    setIsLoading(true);
    try {
      const endpoint = query.trim()
        ? `/api/plans?q=${encodeURIComponent(query.trim())}`
        : '/api/plans';
      const data = await apiFetch<PlansResponse>(endpoint);
      setPlans(data.items);
      setTotal(data.total);
    } catch {
      setPlans([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPlans(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchPlans]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const isToday =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();

      const time = date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });

      if (isToday) {
        return `Hoje, ${time}`;
      }

      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const formatPlanMeta = (plan: PlanItem) => {
    const firstSkill = plan.skills[0];
    const eixo = firstSkill?.eixo || 'BNCC';
    const ano = firstSkill?.ano ? `${firstSkill.ano}º ano` : firstSkill?.nivel || '';
    const skillsCount =
      plan.skills.length === 1
        ? '1 habilidade'
        : `${plan.skills.length} habilidades`;

    return [eixo, ano, skillsCount].filter(Boolean).join(' · ');
  };

  return (
    <AppLayout pageTitle="Meus planos" breadcrumb="Meus planos">
      <div className={styles.container}>
        {/* Cabeçalho */}
        <div className={styles.header}>
          <div className={styles.intro}>
            <h1 className={styles.pageTitle}>Meus planos</h1>
            <p className={styles.pageSubtitle}>
              Seus rascunhos privados. Somente você pode consultar e editar
              estes planos.
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus size={18} />}
            onClick={() => router.push('/planos/novo')}
          >
            Novo plano
          </Button>
        </div>

        {/* Barra de Ferramentas / Busca */}
        <div className={styles.tools}>
          <div className={styles.searchContainer}>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por título ou componente curricular"
              leftIcon={<Search size={18} />}
            />
          </div>

          <div className={styles.privacySummary}>
            <Lock size={15} />
            <span>
              {total === 0
                ? 'Nenhum rascunho privado'
                : total === 1
                ? '1 rascunho privado'
                : `${total} rascunhos privados`}
            </span>
          </div>
        </div>

        {/* Conteúdo: Lista ou Estado Vazio */}
        {isLoading ? (
          <div className={styles.loadingContainer}>
            <p>Carregando seus planos...</p>
          </div>
        ) : plans.length === 0 ? (
          /* Estado Vazio (Frame 4) */
          <div className={styles.emptyState}>
            <div className={styles.emptyIllustration}>
              <FilePlus2 size={36} />
            </div>
            <h2 className={styles.emptyTitle}>Você ainda não tem rascunhos</h2>
            <p className={styles.emptyDescription}>
              Comece selecionando habilidades da BNCC e descrevendo sua intenção
              pedagógica. Você poderá revisar tudo antes de salvar.
            </p>
            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus size={18} />}
              onClick={() => router.push('/planos/novo')}
            >
              Criar meu primeiro plano
            </Button>
            <div className={styles.emptyGuarantee}>
              <ShieldCheck size={16} className={styles.emptyGuaranteeIcon} />
              <span>O rascunho será privado por padrão.</span>
            </div>
          </div>
        ) : (
          /* Tabela de Rascunhos (Frame 3) */
          <div className={styles.tableContainer}>
            <div className={styles.tableHeader}>
              <span className={styles.colPlan}>Plano</span>
              <span className={styles.colDate}>Última atualização</span>
              <span className={styles.colStatus}>Status</span>
              <span className={styles.colAction}></span>
            </div>

            {plans.map((plan) => (
              <Link
                key={plan.id}
                href={`/planos/${plan.id}`}
                className={styles.planRow}
              >
                <div className={styles.planInfo}>
                  <h3 className={styles.planTitle}>{plan.titulo}</h3>
                  <span className={styles.planMeta}>{formatPlanMeta(plan)}</span>
                </div>

                <div className={styles.planDate}>{formatDate(plan.updatedAt)}</div>

                <div className={styles.planStatusBadges}>
                  <Badge variant="draft">RASCUNHO</Badge>
                  {plan.aiAssisted && (
                    <Badge variant="ai" icon={<Sparkles size={13} />}>
                      Auxílio por IA
                    </Badge>
                  )}
                </div>

                <div className={styles.chevronWrapper}>
                  <ChevronRight size={20} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
