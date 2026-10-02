# Planejador Pedagógico BNCC

Sistema integrado de planejamento de aulas alinhado à Base Nacional Comum Curricular (BNCC), com autonomia docente, geração assistida por IA via workflows n8n e controle seguro de rascunhos em Markdown.

---

## 1. Arquitetura do Monorepo

O projeto é estruturado como um monorepo gerenciado por `pnpm` (workspaces):

```text
planejador-bncc/
├── apps/
│   ├── api/             # Backend NestJS 11 + Prisma ORM + JWT + Cliente n8n
│   └── web/             # Frontend Next.js 15 (App Router) + Design System Figma
├── docker-compose.yml   # PostgreSQL 16 Alpine
├── docs/                # Contratos n8n, design reference e recorte BNCC
└── specs/               # Especificações, tarefas e quickstart (Spec-Kit)
```

---

## 2. Portas e Serviços Locais

| Serviço | Porta Local | Protocolo | Descrição |
| :--- | :--- | :--- | :--- |
| **Frontend Web** | `3000` | HTTP | Interface do usuário ([http://localhost:3000](http://localhost:3000)) |
| **Backend API** | `3001` | HTTP | API RESTful ([http://localhost:3001](http://localhost:3001)) |
| **Banco de Dados** | `5432` | PostgreSQL | Instância PostgreSQL gerenciada via Docker Compose |

---

## 3. Variáveis de Ambiente e Arquivos `.env`

Por motivos de segurança, nenhum arquivo contendo credenciais ou segredos reais é versionado. Copie os modelos fornecidos para inicialização:

### No Windows PowerShell:
```powershell
Copy-Item .env.example .env
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env.local
```

### No Linux / macOS / Bash:
```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

### Variáveis Principais (sem segredos):

| Arquivo | Variável | Exemplo Local | Finalidade |
| :--- | :--- | :--- | :--- |
| `.env` / `apps/api/.env` | `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/planejador_bncc` | String de conexão com o banco |
| `apps/api/.env` | `PORT` | `3001` | Porta do servidor NestJS |
| `apps/api/.env` | `N8N_MOCK_MODE` | `true` | Habilita mock determinístico do n8n sem chamada externa |
| `apps/api/.env` | `JWT_ACCESS_SECRET` | *(chave randômica local)* | Assinatura do token de acesso (memória) |
| `apps/api/.env` | `JWT_REFRESH_SECRET` | *(chave randômica local)* | Assinatura do token de renovação (cookie) |
| `apps/web/.env.local` | `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | URL base do backend para chamadas no navegador |

---

## 4. Segurança de Sessão: Cookies `HttpOnly` (Localhost vs Produção)

A arquitetura adota o modelo de autenticação com separação de responsabilidades:
- **Access Token**: Mantido exclusivamente em memória no cliente (`AuthProvider`). Expira em 15 minutos.
- **Refresh Token**: Armazenado em cookie com flag `HttpOnly`, inacessível via JavaScript (`document.cookie`), prevenindo ataques de XSS.

### Configuração do Atributo `secure` nos Cookies:
- **Ambiente Local (Desenvolvimento HTTP)**:
  O cookie é emitido com `secure: false` quando executado em `http://localhost`. Caso `secure: true` fosse forçado sem certificado TLS/HTTPS local, os navegadores rejeitariam a gravação do cookie de sessão.
- **Ambiente de Produção (HTTPS Obrigatório)**:
  Em produção (Cloud / Kubernetes / Vercel / Railway), a aplicação deve obrigatoriamente operar sob HTTPS e a flag de cookies deve ser ajustada para `secure: true` e `sameSite: 'lax'` (ou `'strict'`), impedindo o tráfego de credenciais em canais não criptografados.

---

## 5. Configuração e Gerenciamento do Docker

O banco de dados PostgreSQL é configurado via `docker-compose.yml`:

```bash
# Iniciar o container do PostgreSQL em background:
docker compose up -d postgres

# Verificar se o banco está ativo e saudável:
docker compose ps

# Parar o container mantendo o volume de dados:
docker compose stop

# Encerrar e remover containers (os dados persistem no volume 'pgdata'):
docker compose down

# Encerrar e destruir o banco de dados completamente (reset total):
docker compose down -v
```

---

## 6. Inicialização Rápida e Seeds

```bash
# 1. Instalar dependências
pnpm install

# 2. Subir banco de dados
docker compose up -d postgres

# 3. Executar migrações do schema
pnpm --filter @planejador/api prisma:migrate

# 4. Popular banco com dados iniciais (contas demo e recorte BNCC)
pnpm --filter @planejador/api prisma:seed

# 5. Iniciar backend e frontend em desenvolvimento
pnpm dev
```

### Contas de Demonstração Pré-cadastradas:
- **Professora Ana Souza**: `ana.souza@escola.gov.br` / `senha-demo-ana` (Área: Ciências)
- **Professor Marcos Lima**: `marcos.lima@escola.gov.br` / `senha-demo-marcos` (Área: História)

---

## 7. Comandos de Verificação e Scripts de Qualidade

Todos os comandos são coordenados na raiz do monorepo:

| Comando | Descrição |
| :--- | :--- |
| `pnpm dev` | Inicia o backend (`apps/api`) na porta 3001 e o frontend (`apps/web`) na porta 3000 |
| `pnpm test` | Executa todos os testes unitários e testes de fluxos da interface |
| `pnpm test:integration` | Executa a suíte de integração e2e (isolamento de docentes, resiliência IA e atomicidade) |
| `pnpm lint` | Valida regras de código e formatação (ESLint) em todo o monorepo |
| `pnpm typecheck` | Executa a validação estrita de tipos do TypeScript (`tsc --noEmit`) |
| `pnpm build` | Compila o build de produção otimizado das aplicações |

---

## 8. Resiliência da Integração com IA (n8n)

A integração com o workflow n8n é projetada com garantia de **atomicidade**:
1. O backend inicia um registro na tabela `AiRun` com status `PENDING`.
2. Em caso de sucesso da IA, o rascunho é persistido na tabela `Plan` como `RASCUNHO` e o `AiRun` é atualizado para `SUCCEEDED`.
3. Em caso de falha de conexão, resposta malformada ou timeout no webhook, o `AiRun` é atualizado para `FAILED` com a mensagem do erro, e **nenhum registro é criado na tabela `Plan`**, garantindo que o banco de dados nunca armazene planos corrompidos ou inconsistentes.
