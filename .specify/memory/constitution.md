<!--
Sync Impact Report:
- Version change: Initial Template -> 1.0.0
- List of modified principles:
  - [PRINCIPLE_1_NAME] -> I. Especificação Prévia e Critérios de Aceitação
  - [PRINCIPLE_2_NAME] -> II. Separação de Camadas e Isolamento de Segredos
  - [PRINCIPLE_3_NAME] -> III. Autenticação e Autorização Estrita por Docente
  - [PRINCIPLE_4_NAME] -> IV. IA como Assistente e Soberania Docente
  - [PRINCIPLE_5_NAME] -> V. Validação Rigorosa e Atomicidade de Operações
  - Added: VI. Persistência Estruturada com Migrations e Seeds Reproduzíveis
  - Added: VII. Fidelidade ao Design System, Acessibilidade e Responsividade
  - Added: VIII. Testes Críticos, Documentação e Higiene de Versionamento
- Added sections:
  - Diretrizes de Qualidade, Segurança e Conformidade (Section 2)
  - Fluxo de Desenvolvimento e Governança de Código (Section 3)
- Removed sections: Nenhuma
- Follow-up TODOs: Nenhuma
-->

# Planejador BNCC Constitution

## Core Principles

### I. Especificação Prévia e Critérios de Aceitação
O comportamento do sistema e os critérios de aceitação DEVEM ser formalmente definidos e aprovados em especificação antes de qualquer escrita de código. Nenhuma funcionalidade é implementada sem cenários claros, verificáveis e mensuráveis.

### II. Separação de Camadas e Isolamento de Segredos
A arquitetura DEVE manter clara segregação entre frontend, API backend e integrações externas (provedores de IA). Chaves de API, credenciais e segredos residem exclusivamente no ambiente seguro do backend e NUNCA DEVEM ser expostos em bundles do cliente ou respostas públicas.

### III. Autenticação e Autorização Estrita por Docente
O docente DEVE ser autenticado previamente e cada operação de leitura, criação, edição ou exclusão DEVE validar autorização estrita em nível de registro. O sistema DEVE garantir que um professor acesse unicamente seus próprios planos e dados.

### IV. IA como Assistente e Soberania Docente
Todo conteúdo gerado por modelos de inteligência artificial DEVE ser tratado como rascunho preliminar e editável, sujeito obrigatoriamente à revisão, ajuste e validação do professor. A IA sugere e apoia; o controle pedagógico e a decisão final permanecem sempre com o docente.

### V. Validação Rigorosa e Atomicidade de Operações
Todas as entradas do usuário e respostas de integrações externas DEVEM ser validadas contra esquemas rígidos antes do processamento. Falhas de comunicação, timeouts ou respostas corrompidas de provedores externos NÃO DEVEM persistir planos parciais ou inconsistentes no banco de dados.

### VI. Persistência Estruturada com Migrations e Seeds Reproduzíveis
O esquema do banco de dados DEVE ser gerenciado e versionado exclusivamente através de migrações determinísticas e auditáveis. O repositório DEVE fornecer seeds reproduzíveis dos dados da BNCC para garantir uniformidade e previsibilidade em todos os ambientes de desenvolvimento e teste.

### VII. Fidelidade ao Design System, Acessibilidade e Responsividade
As interfaces DEVEM utilizar estritamente os componentes, tokens de cor, tipografia e espaçamentos estabelecidos no Design System de referência (Figma). O layout DEVE ser responsivo para desktop, tablet e dispositivos móveis, em total conformidade com o nível WCAG AA de acessibilidade (contraste adequado, semântica e suporte a teclado).

### VIII. Testes Críticos, Documentação e Higiene de Versionamento
Comportamentos críticos de negócio, fluxos de autorização e integrações DEVEM possuir testes automatizados e comandos de execução documentados. Todos os artefatos de governança e código DEVEM ser versionados no Git, sendo TERMINANTEMENTE PROIBIDO versionar arquivos de ambiente (`.env`), senhas ou credenciais de produção.

## Diretrizes de Qualidade, Segurança e Conformidade

- **Segurança e Menor Privilégio**: Rotas de API e consultas a banco aplicam isolamento de tenant/docente por padrão. Sanitização ativa contra injeções e ataques de superfície.
- **Resiliência em Chamadas de IA**: Integrações externas possuem limites de timeout declarados, rechecagem de payload e estados visuais explícitos (progresso, erro acionável) para o usuário.
- **Acessibilidade e Usabilidade**: Foco visível em todos os controles interativos, contraste mínimo de 4.5:1 para texto normal e conformidade com leitores de tela.

## Fluxo de Desenvolvimento e Governança de Código

- **Ciclo Spec-Driven Development**: Todo ciclo de trabalho segue o encadeamento estruturado de especificação, planejamento, tarefas e implementação antes de merges.
- **Critérios de Revisão**: Pull requests e revisões DEVEM verificar a aderência a todos os 8 princípios centrais, cobertura dos testes críticos e ausência de vazamento de segredos.
- **Rastreabilidade**: Mudanças de requisitos devem atualizar os documentos de especificação correspondentes para manter a sincronia entre documentação viva e base de código.

## Governance

- **Soberania**: Esta constituição é o documento máximo de engenharia do Planejador BNCC e tem precedência sobre qualquer decisão tática discordante.
- **Procedimento de Emenda**: Qualquer alteração, inclusão ou revogação de princípios exige registro explícito da justificativa, consenso do time e atualização formal do documento.
- **Versionamento Semântico**:
  - **MAJOR**: Alterações ou remoções incompatíveis de princípios ou estruturas de governança.
  - **MINOR**: Inclusão de novos princípios, seções ou expansões materiais das diretrizes existentes.
  - **PATCH**: Ajustes redacionais, correções tipográficas e refinamentos de clareza sem impacto de escopo.
- **Auditoria de Conformidade**: Cada marco de entrega deve demonstrar conformidade com os princípios estipulados.

**Version**: 1.0.0 | **Ratified**: 2026-10-01 | **Last Amended**: 2026-10-01
