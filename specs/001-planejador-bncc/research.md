# Research: Planejador BNCC para Professores

**Branch**: `001-planejador-bncc` | **Data**: 2026-10-02 | **Spec**: [spec.md](./spec.md)

Este documento consolida as decisões arquiteturais, justificativas e padrões tecnológicos adotados para o planejamento técnico do Planejador BNCC, em total conformidade com a Constituição do projeto e com os requisitos do usuário.

---

## 1. Monorepo e Gerenciador de Pacotes

### Decisão
Monorepo gerenciado via **pnpm workspace** (versão 12.6.0+, Node.js v22.20.0 LTS) com lockfile compartilhado (`pnpm-lock.yaml`).
Estrutura composta por duas aplicações principais:
* `apps/web`: Frontend em **Next.js 15 (App Router)** com React 19 e TypeScript.
* `apps/api`: Backend em **NestJS 11** com TypeScript, Fastify/Express e Prisma ORM.

### Racional
* O monorepo pnpm oferece deduplicação eficiente via hardlinks, instalação rápida, isolamento de dependências e execução coordenada de scripts no root (`pnpm dev`, `pnpm build`, `pnpm test`).
* Next.js 15 com App Router permite componentes de servidor e cliente otimizados, roteamento semântico e consumo direto da API NestJS.
* NestJS 11 fornece arquitetura modular empresarial com injeção de dependência, pipes de validação (Zod/class-validator), interceptors para logging/rastreabilidade e guards de autorização declarativos.

### Alternativas Consideradas
* *Repositórios separados*: Rejeitado por aumentar atrito no versionamento sincronizado de contratos de API e modelos de dados.
* *npm/yarn workspaces*: Rejeitado devido ao desempenho superior e confiabilidade do isolamento de dependências do pnpm.

---

## 2. Estilização e Design System (Sem Tailwind)

### Decisão
**CSS Puro com CSS Modules e Variáveis Customizadas (CSS Custom Properties)** estruturado em tokens de design (`tokens.css`) centralizados, consumidos diretamente por componentes React reutilizáveis.

### Racional
* A exigência do usuário veda expressamente o uso de Tailwind CSS.
* Os tokens confirmados na extração do Figma (`#173A63`, `#245F9E`, `#F5F7FA`, `#172333`, `#58677A`, etc.) são mapeados em variáveis globais (`--color-navy`, `--color-primary`, `--color-bg-neutral`, etc.), garantindo fidelidade absoluta de 100% ao arquivo de referência do Figma (`fwD6CCqR2mNbQIaALPA7IL`).
* CSS Modules fornecem escopo local e evitam colisões de nomes sem sobrecarga de runtime.

### Mapeamento dos Tokens Principais
* **Cores**:
  * Brand Navy: `--color-navy-900: #173A63`, `--color-navy-800: #1E4E84`
  * Primary Blue: `--color-primary: #245F9E`, `--color-primary-light: #2F73B8`
  * Blue Tint / Process: `--color-blue-tint: #F1F7FD`, `--color-blue-process: #EAF3FC`, `--color-blue-border: #DCEBFA`
  * Superfícies: `--color-bg-page: #F5F7FA`, `--color-bg-card: #FFFFFF`, `--color-bg-subtle: #F8FAFC`
  * Bordas: `--color-border-neutral: #D8E0EA`, `--color-border-muted: #AEBBCB`
  * Textos: `--color-text-main: #172333`, `--color-text-muted: #58677A`, `--color-text-disabled: #8A95A3`
  * Status:
    * Sucesso: `--color-success-text: #247A55`, `--color-success-bg: #E9F6EF`
    * Alerta: `--color-warning-text: #A45B12`, `--color-warning-bg: #FFF4DE`
    * Erro: `--color-error-text: #B43A3A`, `--color-error-bg: #FDECEC`
* **Tipografia**:
  * UI: `font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;`
  * Editor Markdown: `font-family: 'Roboto Mono', monospace;`
* **Sombras**:
  * Card: `--shadow-card: 0px 2px 10px 0px rgba(23, 58, 99, 0.07);`
  * Modal: `--shadow-modal: 0px 14px 38px 0px rgba(16, 36, 61, 0.14);`

---

## 3. Banco de Dados, Persistência e Seeds

### Decisão
**PostgreSQL 16** orquestrado via Docker Compose e modelado com **Prisma ORM v6**.

### Racional
* O PostgreSQL é um SGBD relacional robusto com suporte nativo a transações ACID estritas, essenciais para a atomicidade da criação de planos e controle de concorrência.
* O Prisma fornece migrações determinísticas (`prisma migrate dev`), geração de tipos TypeScript sincronizados e transações interativas (`prisma.$transaction`).
* O seed será implementado de forma **idempotente** (`prisma/seed.ts`), carregando:
  1. As duas contas de demonstração locais (`ana.souza@escola.gov.br` e `marcos.lima@escola.gov.br`), lendo credenciais de variáveis de ambiente locais com senhas hasheadas via `bcrypt`.
  2. O catálogo oficial da BNCC extraído de `docs/data/bncc-recorte.json` utilizando `upsert` baseado no campo único `codigo`.

### Alternativas Consideradas
* *SQLite local*: Rejeitado pela Constituição (Princípio VI) e exigência de Docker Compose com PostgreSQL.
* *TypeORM / MikroORM*: Rejeitado por maior complexidade de configuração e menor ergonomia de geração de tipos estritos se comparado ao Prisma.

---

## 4. Arquitetura de Autenticação e Segurança de Sessão

### Decisão
Estratégia de autenticação híbrida com **Access Token curto em memória** e **Refresh Token em Cookie seguro (`HttpOnly`)**, persistindo no banco apenas o hash do refresh token e o hash da senha:

1. **Access Token**:
   * Token JWT assinado contendo `userId`, `email`, `nome`.
   * Tempo de vida curto: **15 minutos**.
   * Armazenamento no frontend: estritamente **em memória** (React Context/State). Nunca gravado em `localStorage` ou `sessionStorage` para mitigar ataques XSS.
2. **Refresh Token**:
   * Token criptográfico de alta entropia (ou JWT assinado com secret específico).
   * Tempo de vida: **8 horas** (duração exata do turno escolar, conforme FR-001).
   * Armazenamento: Cookie HTTP seguro com atributos:
     * `HttpOnly: true` (inacessível a scripts do browser).
     * `SameSite: Lax` (proteção primária contra CSRF).
     * `Secure: process.env.NODE_ENV === 'production'` (em localhost, `Secure: false` para permitir HTTP local sem certificado SSL).
     * `Path: /api/auth` (restringindo o envio do cookie apenas às rotas de autenticação da API).
3. **Persistência no Banco**:
   * Senhas: Hash com `bcrypt` (fator de custo 10).
   * Refresh Token: Somente o hash (`SHA-256` ou `bcrypt`) gravado na tabela `Session` / `RefreshToken`. Em caso de logout ou novo login, o token anterior é invalidado.
4. **Proteção contra CSRF**:
   * Cookies configurados com `SameSite=Lax`.
   * Validação estrita de cabeçalho `Origin` / `Referer` no backend contra a origem configurada da web (`http://localhost:3000`).
   * Exigência do cabeçalho customizado `X-Requested-With: XMLHttpRequest` em requisições de mutação para bloquear envio acidental cross-site.
5. **CORS**:
   * Restrito estritamente a `http://localhost:3000` (e origens autorizadas em produção), com `credentials: true`.

---

## 5. Integração com o Workflow n8n e Resiliência

### Decisão
Cliente HTTP dedicado no backend (`N8nClient`) consumindo o webhook externo com autenticação via cabeçalho `x-api-key`, timeout rígido de 45 segundos, rastreabilidade via `requestId` e modo Mock local.

### Racional do Contrato (`docs/contracts/n8n.md`)
* **Payload de Envio**:
  ```json
  {
    "sessao": "email-usuario",
    "habilidade": "CODIGO — descrição oficial fornecida pelo instrutor",
    "instrucao": "Criar uma atividade introdutória em dupla.",
    "duracao": 50,
    "recursos_digitais": true
  }
  ```
* **Payload de Resposta**:
  ```json
  {
    "success": true,
    "sessao": "email-usuario",
    "habilidade": "CODIGO — descrição oficial fornecida pelo instrutor",
    "answer": "# Plano de aula\nConteúdo do rascunho...",
    "format": "markdown"
  }
  ```

### Diretrizes de Implementação
1. **Cabeçalho de Autenticação**: Envio de `x-api-key: process.env.N8N_API_KEY`.
2. **Timeout Configurável**: Default fixado em **45.000 ms** (45s conforme FR-011) via `AbortSignal.timeout(45000)`.
3. **Sem Retry Automático**: Proibido expressamente pela spec (FR-012). Falhas encerram o fluxo imediatamente e exigem ação manual do docente.
4. **Rastreabilidade**: Geração de `requestId` (UUID v4) anexado aos logs estruturados de auditoria do backend.
5. **Modo Mock Local (`N8N_MOCK_MODE=true`)**:
   * Permite executar testes automatizados e desenvolvimento local sem conexão de rede externa e sem consumir o workflow compartilhado do n8n.
   * Responde realisticamente com planos pedagógicos válidos em Markdown ou simula falhas/timeouts controlados.
6. **Isolamento de Segredos**: O frontend jamais conhece a URL do n8n nem sua chave de API. A rota `POST /api/plans/generate` da API NestJS intermedeia todo o processo.

---

## 6. Ciclo de Vida da Geração de IA e Atomicidade (AiRun + Plan)

### Decisão
Máquina de estados explícita com transação atômica Prisma:

```
[Início] ──> AiRun criado (PENDING)
                 │
                 ├── [Sucesso n8n] ──> Prisma $transaction:
                 │                         1. Plan criado (status: RASCUNHO, ai_assisted: true)
                 │                         2. AiRun atualizado (SUCCEEDED)
                 │                     ──> Retorna Plano criado para a UI
                 │
                 └── [Falha n8n / Timeout] ──> AiRun atualizado (FAILED, error_message)
                                               ──> NENHUM Plan criado no banco
                                               ──> Lança exceção HTTP 502/504
                                               ──> UI exibe alerta e preserva campos
```

### Racional
* Garante atomicidade total: ou o plano é criado com sucesso completo e registrado como `SUCCEEDED`, ou nada parcial é persistido.
* Preserva auditoria de chamadas no `AiRun` com tempo de execução, status e referências de erro.

---

## 7. Autorização Estrita e Proteção contra IDOR

### Decisão
Toda consulta ou mutação de planos de aula na API aplica filtro de tenant obrigatório `where: { id: planId, userId: req.user.id }`.

### Racional
* Se o plano pertencer a outro docente ou não existir, a API retorna **404 Not Found** com a mensagem padronizada `"Plano não encontrado"` (FR-016).
* Omitir a existência do recurso impede ataques de enumeração de identificadores (IDOR) e vazamento de informações entre professores.
* Eventos de tentativa de acesso não autorizado são logados no backend para fins de segurança e auditoria.

---

## 8. Renderização e Sanitização Segura de Markdown

### Decisão
No frontend (`apps/web`), renderização através de **`react-markdown` + `remark-gfm`** combinada com sanitização estrita via **`rehype-sanitize`**.

### Racional
* A IA ou uma edição manual não pode injetar elementos HTML perigosos (`<script>`, `<iframe>`, atributos `onload`, `javascript:` URLs).
* `rehype-sanitize` aplica uma lista branca estrita de tags tipográficas permitidas (`h1`, `h2`, `h3`, `p`, `ul`, `ol`, `li`, `strong`, `em`, `blockquote`, `code`, `pre`), garantindo imunidade a ataques de Cross-Site Scripting (XSS).

---

## 9. Mapeamento de Integração com os 9 Frames do Figma

| Frame | Node ID | Rota Frontend | Responsividade / Comportamento |
| :--- | :---: | :--- | :--- |
| **1. Design System** | `2:11440` | Global (`tokens.css`, UI kit) | Base de tokens, botões, badges, inputs, tipografia e sombras compartilhadas. |
| **2. Login — Credenciais inválidas** | `2:11755` | `/login` | Desktop: 2 colunas (institucional 600px + form 520px). Mobile: empilhamento com prioridade ao formulário de login. Cards com ação rápida "Usar conta". |
| **3. Meus planos — Rascunhos** | `2:11830` | `/planos` | Tabela responsiva de rascunhos. Em telas pequenas (<768px), converte linhas de tabela em cards individuais. |
| **4. Meus planos — Estado vazio** | `2:11932` | `/planos` (sem dados) | Card centralizado com ilustração SVG, texto acolhedor e CTA "+ Criar primeiro plano". |
| **5. Novo plano — Formulário** | `2:11990` | `/planos/novo` | Desktop: 2 colunas (Catálogo BNCC flexível + Contexto 430px). Mobile: empilhamento vertical (1º catálogo com busca, 2º contexto pedagógico). |
| **6. Novo plano — Preparando** | `2:12155` | `/planos/novo` (loading) | Banner `#EAF3FC` com spinner animado, barra de progresso visual, bloqueio de inputs e trava contra reenvio. |
| **7. Novo plano — Falha** | `2:12329` | `/planos/novo` (erro) | Banner `#FDECEC` com mensagem clara, restauração dos dados intactos e botão ativo "Tentar gerar novamente". |
| **8. Rascunho — Editor e Preview** | `2:12495` | `/planos/[id]` | Desktop: split-view lado a lado (Editor à esquerda, Preview formatado à direita). Mobile/Tablet: abas comutáveis "Editor Markdown" e "Pré-visualização". Barra de ferramentas superior e toast de salvamento. |
| **9. Rascunho — Confirmação de saída** | `2:12608` | `/planos/[id]` (modal) | Modal flutuante centralizado (540px) sobre backdrop escurecido. Alerta de alterações não salvas com opção "Continuar editando" ou "Sair sem salvar". |
