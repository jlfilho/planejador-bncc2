# Implementation Plan: Planejador BNCC para Professores

**Branch**: `001-planejador-bncc` | **Data**: 2026-10-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification de `/specs/001-planejador-bncc/spec.md`, contrato n8n em `docs/contracts/n8n.md`, catálogo de habilidades em `docs/data/bncc-recorte.json` e Design System aprovado em `docs/design-reference.md`.

---

## Summary

O Planejador BNCC é uma aplicação web voltada para professores da educação básica, estruturada em monorepo pnpm com frontend em **Next.js 15 (App Router)** e backend em **NestJS 11** com **Prisma ORM** e **PostgreSQL 16** via Docker Compose. O sistema permite ao docente autenticar-se em sessão privada de 8 horas com contas de demonstração, consultar o catálogo de habilidades da BNCC com filtros combinados, selecionar habilidades e solicitar a geração assistida por IA de um rascunho de plano de aula via webhook n8n com resiliência atômica e timeout de 45 segundos. O professor pode visualizar, editar em Markdown estruturado, validar em pré-visualização formatada e salvar explicitamente suas propostas em ambiente seguro e com isolamento estrito entre usuários. A interface é construída com CSS puro e tokens do Design System extraído do Figma (sem Tailwind), atendendo aos 9 frames aprovados e aos critérios de acessibilidade e responsividade da Constituição do projeto.

---

## Technical Context

* **Linguagem / Runtime**: TypeScript 5.7+ / Node.js v22.20.0 LTS
* **Gerenciador de Pacotes**: pnpm v12.6.0 (com lockfile `pnpm-lock.yaml`)
* **Frontend**: Next.js 15 (App Router), React 19, CSS Modules com CSS Custom Properties (Tokens)
* **Backend**: NestJS 11, Fastify/Express, Zod, `@nestjs/jwt`, `bcrypt`
* **Persistência / Banco de Dados**: PostgreSQL 16 via Docker Compose, Prisma ORM v6
* **Estilização**: CSS Puro baseado nos tokens do Design System Figma (`docs/design/design_system.png`), sem Tailwind CSS
* **Renderização Markdown**: `react-markdown`, `remark-gfm` e `rehype-sanitize` (sanitização estrita contra XSS)
* **Integração IA (n8n)**: Cliente HTTP dedicado no backend com `x-api-key`, timeout rígido de 45s via `AbortSignal.timeout(45000)`, `requestId` para rastreabilidade e modo mock local (`N8N_MOCK_MODE=true`)
* **Testes**: Jest / Vitest para unitários; Supertest para integração de API; testes de isolamento de tenant e atomicidade de IA
* **Ambiente de Execução Local**:
  * Frontend: `http://localhost:3000`
  * Backend API: `http://localhost:3001`
  * PostgreSQL: `localhost:5432` (Docker)
* **Metas de Desempenho**:
  * Login e carregamento de painel em menos de 5 segundos (SC-001)
  * Busca e filtragem no catálogo BNCC em menos de 1 segundo (SC-002)
  * Alternância entre editor Markdown e preview em menos de 200 ms (SC-006)
  * Timeout máximo de chamada externa de IA em 45 segundos (FR-011)

---

## Constitution Check

*GATE: Avaliação contra a Constituição do Planejador BNCC (v1.0.0).*

| Princípio | Avaliação / Conformidade | Status |
| :--- | :--- | :---: |
| **I. Especificação Prévia e Critérios de Aceitação** | Especificação viva aprovada em `spec.md` com 5 User Stories priorizadas (US1 a US5), 17 Requisitos Funcionais (FR-001 a FR-017) e Critérios de Aceitação verificáveis. | **PASS** |
| **II. Separação de Camadas e Isolamento de Segredos** | A API NestJS atua como fronteira de dados exclusiva. O frontend não possui chaves de API, credenciais do n8n ou senhas de banco de dados. Acesso via JWT em memória e cookies HttpOnly. | **PASS** |
| **III. Autenticação e Autorização Estrita por Docente** | Sessão de 8 horas (turno escolar). Toda consulta e mutação de planos aplica filtro obrigatório `where: { userId }`. Tentativas de acesso a planos alheios retornam `404 Not Found` omitindo existência. | **PASS** |
| **IV. IA como Assistente e Soberania Docente** | Todo plano nasce exclusivamente com status `RASCUNHO` e flag `Auxílio por IA`. A interface deixa explícito que o controle pedagógico e a decisão final são do professor, com editor livre e salvamento voluntário. | **PASS** |
| **V. Validação Rigorosa e Atomicidade de Operações** | Validação estrita via Zod em todas as camadas. Ciclo `AiRun` atômico: em falha do n8n ou timeout, o `AiRun` marca `FAILED`, **nenhum plano é criado** e os campos são mantidos na UI para ação manual. | **PASS** |
| **VI. Persistência com Migrations e Seeds Reproduzíveis** | Banco PostgreSQL gerenciado por migrações determinísticas do Prisma. Seed idempotente com as duas contas de demonstração e o catálogo `docs/data/bncc-recorte.json`. | **PASS** |
| **VII. Fidelidade ao Design System e Responsividade** | Uso exclusivo dos tokens de cores, tipografia (Inter/Roboto Mono), espaçamentos e raios extraídos dos 9 frames do Figma em `tokens.css`. Sem Tailwind CSS. Adaptações de layout fluidas e WCAG AA. | **PASS** |
| **VIII. Testes Críticos, Documentação e Higiene** | Suítes de testes unitários e de integração (`test` e `test:integration`). Comandos reais documentados em `quickstart.md`. Arquivos `.env` ignorados no Git. | **PASS** |

---

## Project Structure

A estrutura física do monorepo pnpm será organizada da seguinte forma:

```text
planejador-bncc/
├── .specify/                         # Configurações de governança e constitution
├── docs/
│   ├── contracts/
│   │   └── n8n.md                    # Contrato original do n8n
│   ├── data/
│   │   └── bncc-recorte.json         # Catálogo oficial de habilidades
│   ├── design/                       # Capturas dos 9 frames aprovados do Figma
│   └── design-reference.md           # Referência e links do Figma
├── specs/
│   └── 001-planejador-bncc/
│       ├── spec.md                   # Especificação de requisitos (US1 a US5)
│       ├── plan.md                   # Este plano de implementação
│       ├── research.md               # Decisões técnicas e arquiteturais (Phase 0)
│       ├── data-model.md             # Modelagem de dados, ERD e Prisma schema (Phase 1)
│       ├── quickstart.md             # Guia de inicialização e cenários de teste (Phase 1)
│       └── contracts/                # Contratos REST e de integração (Phase 1)
│           ├── auth.md               # Contrato de autenticação e sessão
│           ├── bncc.md               # Contrato do catálogo BNCC
│           ├── plans.md              # Contrato de gestão e criação de planos
│           └── n8n-integration.md    # Contrato de comunicação com n8n
├── apps/
│   ├── api/                          # Backend NestJS (porta 3001)
│   │   ├── prisma/
│   │   │   ├── schema.prisma         # Esquema do banco de dados PostgreSQL
│   │   │   ├── migrations/           # Migrações determinísticas
│   │   │   └── seed.ts               # Seed idempotente (contas demo + BNCC)
│   │   ├── src/
│   │   │   ├── auth/                 # Módulo de autenticação (JWT, refresh, cookies, guards)
│   │   │   ├── bncc/                 # Módulo de habilidades BNCC (somente leitura)
│   │   │   ├── plans/                # Módulo de planos de aula (CRUD, autorização, IDOR)
│   │   │   ├── ai/                   # Cliente HTTP n8n (resiliência, mock, timeout, Zod)
│   │   │   ├── common/               # Interceptors, filtros de erro, decorators
│   │   │   └── main.ts               # Ponto de entrada com CORS e cookie parser
│   │   ├── test/                     # Testes de integração e e2e (Supertest)
│   │   └── package.json
│   └── web/                          # Frontend Next.js 15 (porta 3000)
│       ├── src/
│       │   ├── app/                  # App Router
│       │   │   ├── login/            # Tela de Login com demo accounts (Frame 2)
│       │   │   ├── planos/           # Meus Planos lista e estado vazio (Frames 3 e 4)
│       │   │   │   ├── novo/         # Novo Plano formulário, loading e erro (Frames 5, 6, 7)
│       │   │   │   └── [id]/         # Editor Markdown e preview com modal de saída (Frames 8 e 9)
│       │   │   ├── layout.tsx        # Shell de layout com sidebar e topbar
│       │   │   └── page.tsx          # Redirecionamento inicial autenticado
│       │   ├── components/           # Componentes reutilizáveis (botões, badges, modal, chips)
│       │   ├── context/              # Contexto de autenticação (access token em memória)
│       │   ├── services/             # Clientes de API (fetch tipado com auto-refresh)
│       │   └── styles/               # CSS Modules e tokens globais (tokens.css)
│       └── package.json
├── docker-compose.yml                # Serviço PostgreSQL 16 local
├── pnpm-workspace.yaml               # Configuração do workspace pnpm
├── package.json                      # Scripts coordenados da raiz (dev, build, test, lint)
└── pnpm-lock.yaml                    # Lockfile unificado
```

---

## Mapeamento dos 9 Frames do Figma e Telas da Aplicação

| Frame Figma | Node ID | Rota no App Router | Componentes e Estados Mapeados |
| :--- | :---: | :--- | :--- |
| **Design System** | `2:11440` | `apps/web/src/styles/tokens.css` | Cores institucionais, neutros, alertas, tipografia Inter/Roboto Mono, sombras e border-radius. |
| **Login (Credenciais inválidas)** | `2:11755` | `/login` | Painel institucional lateral, formulário de login com banner de erro `#FDECEC` e cards de preenchimento rápido "Usar conta". |
| **Meus planos (Rascunhos)** | `2:11830` | `/planos` | Barra superior com identificação docente, busca textual, contador de planos e tabela/lista com badges `RASCUNHO` e `Auxílio por IA`. |
| **Meus planos (Estado vazio)** | `2:11932` | `/planos` | Ilustração SVG amigável, mensagem instrutiva e botão CTA "+ Criar primeiro plano". |
| **Novo plano (Formulário)** | `2:11990` | `/planos/novo` | Catálogo BNCC com busca e filtros, seleção com chips removíveis, campos de instrução e duração com validação inline e botão de geração. |
| **Novo plano (Preparando)** | `2:12155` | `/planos/novo` | Banner `#EAF3FC` com animação de progresso, spinner, bloqueio de reenvio duplo e atenuação do formulário. |
| **Novo plano (Falha)** | `2:12329` | `/planos/novo` | Banner `#FDECEC` informando falha atômica, preservação integral de todos os campos digitados e botão manual "Tentar gerar novamente". |
| **Rascunho (Editor e Preview)** | `2:12495` | `/planos/[id]` | Cabeçalho do rascunho com metadados e status, split-view (toolbar + editor Markdown monoespaçado à esquerda, renderização sanitizada à direita), banner verde de salvamento. |
| **Rascunho (Confirmação saída)** | `2:12608` | `/planos/[id]` | Modal centralizado flutuante (540px) com alerta de perda de edições não salvas, botão de continuar e botão destrutivo de saída. |

---

## Complexity Tracking

| Decisão Arquitetural | Por que é necessária | Alternativa Mais Simples Rejeitada |
| :--- | :--- | :--- |
| **Token de acesso em memória + Refresh em cookie HttpOnly** | Protege contra XSS (não acessível por script) e garante a conformidade com o turno de 8 horas estabelecido no requisito FR-001. | *Token armazenado em localStorage*: Rejeitado por vulnerabilidade a vazamento em ataques de script cross-site. |
| **Entidade separada `AiRun` com máquina de estados** | Garante rastreabilidade, auditoria de duração/erros e assegura que nenhuma falha persista planos parciais, permitindo transações ACID atômicas. | *Criação direta do plano na tabela `Plan`*: Rejeitada por risco de deixar registros corrompidos em caso de falha a meio da chamada. |
| **Modo Mock Local no Cliente n8n** | Permite executar a suíte de testes automatizados e o desenvolvimento diário sem consumir webhooks de produção ou depender de conectividade externa. | *Chamadas reais em testes*: Rejeitadas por lentidão, instabilidade de rede e consumo desnecessário de cotas de IA. |
| **CSS Modules e Tokens em vez de Tailwind** | Atende estritamente à determinação do usuário de fidelidade ao Design System sem acrescentar dependência do framework Tailwind. | *Tailwind CSS*: Rejeitado por instrução explícita do usuário. |

---

## Próximos Passos (Workflow speckit)

1. **Phase 0 & 1 Concluídas**:
   * `research.md`: Decisões arquiteturais fundamentadas.
   * `data-model.md`: Modelo relacional, entidades e esquema Prisma.
   * `contracts/`: Especificação das APIs REST e da integração com o n8n.
   * `quickstart.md`: Comandos reais e cenários de teste ponta a ponta.
   * `plan.md`: Plano de implementação aprovado.
2. **Próxima Fase**:
   * Executar `/speckit-tasks` para decompor este plano em tarefas atômicas e ordenadas em `tasks.md`.
   * Executar `/speckit-implement` para codificação estrita baseada nas tarefas.
