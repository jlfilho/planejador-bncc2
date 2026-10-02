'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Search, ChevronDown, Lock } from 'lucide-react';
import { apiFetch } from '../../services/api';
import { Input, Badge, Checkbox } from '../ui';
import styles from '../../app/planos/novo/novo.module.css';

export interface BnccSkillItem {
  id: string;
  codigo: string;
  nivel: string;
  ano?: number | null;
  eixo: string;
  descricao: string;
  explicacao?: string | null;
  exemplos?: string | null;
}

interface BnccApiResponse {
  total: number;
  items: BnccSkillItem[];
}

interface BnccCatalogProps {
  selectedSkills: BnccSkillItem[];
  onToggleSkill: (skill: BnccSkillItem) => void;
  disabled?: boolean;
}

export const BnccCatalog: React.FC<BnccCatalogProps> = ({
  selectedSkills,
  onToggleSkill,
  disabled = false,
}) => {
  const [skills, setSkills] = useState<BnccSkillItem[]>([]);
  const [search, setSearch] = useState('');
  const [nivel, setNivel] = useState('');
  const [ano, setAno] = useState('');
  const [eixo, setEixo] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchSkills = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('q', search.trim());
      if (nivel) params.set('nivel', nivel);
      if (ano) params.set('ano', ano);
      if (eixo) params.set('eixo', eixo);

      const qs = params.toString();
      const endpoint = qs ? `/api/bncc/skills?${qs}` : '/api/bncc/skills';
      const data = await apiFetch<BnccApiResponse | BnccSkillItem[]>(endpoint);
      if (Array.isArray(data)) {
        setSkills(data);
      } else if (data && Array.isArray((data as BnccApiResponse).items)) {
        setSkills((data as BnccApiResponse).items);
      } else {
        setSkills([]);
      }
    } catch {
      setSkills([]);
    } finally {
      setIsLoading(false);
    }
  }, [search, nivel, ano, eixo]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSkills();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchSkills]);

  const handleClearFilters = () => {
    setSearch('');
    setNivel('');
    setAno('');
    setEixo('');
  };

  const isSelected = (skill: BnccSkillItem) =>
    selectedSkills.some((s) => s.codigo === skill.codigo);

  return (
    <div className={styles.catalogColumn}>
      {/* Cabeçalho da Seção */}
      <div className={styles.sectionHeader}>
        <div className={styles.sectionHeaderContent}>
          <h2 className={styles.sectionTitle}>Habilidades da BNCC</h2>
          <p className={styles.sectionSubtitle}>
            Catálogo oficial em modo somente leitura. Selecione uma ou mais
            habilidades.
          </p>
        </div>
        <Badge variant="neutral" icon={<Lock size={12} />}>
          Somente leitura
        </Badge>
      </div>

      {/* Campo de Busca */}
      <Input
        label="Buscar habilidades"
        placeholder="Busque por código ou por termos da descrição"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        leftIcon={<Search size={18} />}
        hint="Busque por código ou por termos da descrição."
        disabled={disabled}
      />

      {/* Linha de Filtros */}
      <div className={styles.filtersRow}>
        <div className={styles.filterSelectContainer}>
          <label className={styles.filterLabel}>Nível</label>
          <div className={styles.selectWrapper}>
            <select
              className={styles.select}
              value={nivel}
              onChange={(e) => setNivel(e.target.value)}
              disabled={disabled}
            >
              <option value="">Todos os níveis</option>
              <option value="Ensino Fundamental">Ensino Fundamental</option>
              <option value="Educação Infantil">Educação Infantil</option>
              <option value="Ensino Médio">Ensino Médio</option>
            </select>
            <ChevronDown size={18} className={styles.selectIcon} />
          </div>
        </div>

        <div className={styles.filterSelectContainer}>
          <label className={styles.filterLabel}>Ano</label>
          <div className={styles.selectWrapper}>
            <select
              className={styles.select}
              value={ano}
              onChange={(e) => setAno(e.target.value)}
              disabled={disabled}
            >
              <option value="">Todos os anos</option>
              <option value="1">1º ano</option>
              <option value="2">2º ano</option>
              <option value="3">3º ano</option>
              <option value="4">4º ano</option>
              <option value="5">5º ano</option>
              <option value="6">6º ano</option>
              <option value="7">7º ano</option>
              <option value="8">8º ano</option>
              <option value="9">9º ano</option>
            </select>
            <ChevronDown size={18} className={styles.selectIcon} />
          </div>
        </div>

        <div className={styles.filterSelectContainer}>
          <label className={styles.filterLabel}>Eixo</label>
          <div className={styles.selectWrapper}>
            <select
              className={styles.select}
              value={eixo}
              onChange={(e) => setEixo(e.target.value)}
              disabled={disabled}
            >
              <option value="">Todos os eixos</option>
              <option value="Pensamento Computacional (PC)">
                Pensamento Computacional
              </option>
              <option value="Mundo Digital (MD)">Mundo Digital</option>
              <option value="Cultura Digital (CD)">Cultura Digital</option>
              <option value="Matéria e energia">Matéria e energia</option>
              <option value="Vida e evolução">Vida e evolução</option>
            </select>
            <ChevronDown size={18} className={styles.selectIcon} />
          </div>
        </div>
      </div>

      {/* Resumo dos Resultados e Limpar */}
      <div className={styles.resultsSummaryBar}>
        <span className={styles.resultsCount}>
          {isLoading
            ? 'Buscando habilidades...'
            : `${skills.length} ${
                skills.length === 1
                  ? 'habilidade encontrada'
                  : 'habilidades encontradas'
              }`}
        </span>
        {(search || nivel || ano || eixo) && (
          <button
            type="button"
            className={styles.clearFiltersBtn}
            onClick={handleClearFilters}
            disabled={disabled}
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Lista de Habilidades */}
      <div className={styles.skillsList}>
        {!isLoading && Array.isArray(skills) && skills.length === 0 && (
          <p className={styles.emptySkillsWarning}>
            Nenhuma habilidade encontrada com os filtros selecionados.
          </p>
        )}
        {Array.isArray(skills) &&
          skills.map((skill) => {
            const selected = isSelected(skill);
          return (
            <div
              key={skill.id}
              className={`${styles.skillCard} ${
                selected ? styles.skillCardSelected : ''
              }`}
              onClick={() => !disabled && onToggleSkill(skill)}
            >
              <Checkbox
                checked={selected}
                onChange={() => !disabled && onToggleSkill(skill)}
                disabled={disabled}
              />
              <div className={styles.skillCardContent}>
                <div className={styles.skillMetaRow}>
                  <Badge variant="skill">{skill.codigo}</Badge>
                  {skill.ano && (
                    <>
                      <span className={styles.skillMetaText}>
                        {skill.ano}º ano
                      </span>
                      <span className={styles.skillMetaDot}>•</span>
                    </>
                  )}
                  <span className={styles.skillMetaText}>{skill.eixo}</span>
                </div>
                <p className={styles.skillDescription}>{skill.descricao}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
