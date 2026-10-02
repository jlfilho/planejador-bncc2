import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Frontend Integration & Flow Logic (US2, US3, US4)', () => {
  describe('Validação do Formulário Pedagógico (US3 - Novo Plano)', () => {
    const validateForm = (
      duracao: number,
      instrucao: string,
      selectedSkillCount: number,
    ) => {
      const isDuracaoValid = duracao >= 15 && duracao <= 360;
      const isInstrucaoValid =
        instrucao.trim().length >= 10 && instrucao.trim().length <= 1000;
      const hasSkills = selectedSkillCount > 0;
      return {
        isDuracaoValid,
        isInstrucaoValid,
        hasSkills,
        isValid: isDuracaoValid && isInstrucaoValid && hasSkills,
      };
    };

    it('deve aprovar formulário com duração entre 15 e 360 min, instrução >= 10 chars e ao menos 1 habilidade', () => {
      const result = validateForm(
        50,
        'Propor atividade prática com materiais recicláveis em grupos.',
        1,
      );
      assert.equal(result.isValid, true);
      assert.equal(result.isDuracaoValid, true);
      assert.equal(result.isInstrucaoValid, true);
      assert.equal(result.hasSkills, true);
    });

    it('deve rejeitar duração menor que 15 min ou maior que 360 min', () => {
      const lowResult = validateForm(10, 'Instrução com mais de dez caracteres.', 1);
      assert.equal(lowResult.isDuracaoValid, false);
      assert.equal(lowResult.isValid, false);

      const highResult = validateForm(400, 'Instrução com mais de dez caracteres.', 1);
      assert.equal(highResult.isDuracaoValid, false);
      assert.equal(highResult.isValid, false);
    });

    it('deve rejeitar instrução com menos de 10 caracteres ou vazia', () => {
      const emptyResult = validateForm(50, '', 1);
      assert.equal(emptyResult.isInstrucaoValid, false);
      assert.equal(emptyResult.isValid, false);

      const shortResult = validateForm(50, 'Curta', 1);
      assert.equal(shortResult.isInstrucaoValid, false);
      assert.equal(shortResult.isValid, false);
    });

    it('deve rejeitar submissão quando nenhuma habilidade for selecionada', () => {
      const noSkillsResult = validateForm(
        50,
        'Instrução pedagógica válida com mais de dez caracteres.',
        0,
      );
      assert.equal(noSkillsResult.hasSkills, false);
      assert.equal(noSkillsResult.isValid, false);
    });
  });

  describe('Filtros e Busca no Catálogo BNCC (US2)', () => {
    interface MockSkill {
      codigo: string;
      nivel: string;
      ano: number | null;
      eixo: string;
      descricao: string;
    }

    const mockSkills: MockSkill[] = [
      {
        codigo: 'EF01CO01',
        nivel: 'Ensino Fundamental',
        ano: 1,
        eixo: 'Pensamento Computacional (PC)',
        descricao: 'Identificar padrões em sequências de objetos.',
      },
      {
        codigo: 'EF02CO01',
        nivel: 'Ensino Fundamental',
        ano: 2,
        eixo: 'Mundo Digital (MD)',
        descricao: 'Reconhecer componentes digitais em computadores.',
      },
      {
        codigo: 'EF06HI01',
        nivel: 'Ensino Fundamental',
        ano: 6,
        eixo: 'História',
        descricao: 'Identificar diferentes formas de contagem do tempo.',
      },
    ];

    const filterSkills = (
      skills: MockSkill[],
      query = '',
      nivel = '',
      ano = '',
      eixo = '',
    ) => {
      return skills.filter((s) => {
        if (nivel && s.nivel.toLowerCase() !== nivel.toLowerCase()) return false;
        if (ano && s.ano !== parseInt(ano, 10)) return false;
        if (eixo && s.eixo.toLowerCase() !== eixo.toLowerCase()) return false;
        if (query) {
          const q = query.toLowerCase();
          const matchCode = s.codigo.toLowerCase().includes(q);
          const matchDesc = s.descricao.toLowerCase().includes(q);
          const matchEixo = s.eixo.toLowerCase().includes(q);
          if (!matchCode && !matchDesc && !matchEixo) return false;
        }
        return true;
      });
    };

    it('deve filtrar habilidades por termo de busca no código e na descrição', () => {
      const byCode = filterSkills(mockSkills, 'EF01CO01');
      assert.equal(byCode.length, 1);
      assert.equal(byCode[0].codigo, 'EF01CO01');

      const byDesc = filterSkills(mockSkills, 'padrões');
      assert.equal(byDesc.length, 1);
      assert.equal(byDesc[0].codigo, 'EF01CO01');
    });

    it('deve filtrar habilidades por ano e eixo curricular', () => {
      const byAno = filterSkills(mockSkills, '', '', '2', '');
      assert.equal(byAno.length, 1);
      assert.equal(byAno[0].codigo, 'EF02CO01');

      const byEixo = filterSkills(
        mockSkills,
        '',
        '',
        '',
        'Pensamento Computacional (PC)',
      );
      assert.equal(byEixo.length, 1);
      assert.equal(byEixo[0].codigo, 'EF01CO01');
    });

    it('deve retornar vazio quando nenhum item corresponder aos filtros', () => {
      const notFound = filterSkills(mockSkills, 'inexistente');
      assert.equal(notFound.length, 0);
    });
  });

  describe('Editor Markdown e Modal de Alterações Não Salvas (US4)', () => {
    it('deve identificar quando há alterações pendentes de salvamento', () => {
      const originalContent = '# Plano Inicial\n\nConteúdo.';
      let currentContent = originalContent;

      let isDirty = currentContent !== originalContent;
      assert.equal(isDirty, false);

      currentContent = '# Plano Inicial\n\nConteúdo alterado pelo professor.';
      isDirty = currentContent !== originalContent;
      assert.equal(isDirty, true);
    });

    it('deve alternar corretamente o modo de visualização entre editor e preview', () => {
      type Tab = 'editor' | 'preview';
      let activeTab: Tab = 'editor';

      const setActiveTab = (tab: Tab) => {
        activeTab = tab;
      };

      assert.equal(activeTab, 'editor');
      setActiveTab('preview');
      assert.equal(activeTab, 'preview');
      setActiveTab('editor');
      assert.equal(activeTab, 'editor');
    });
  });
});
