# Quickstart: Validação e Execução do Planejador BNCC

**Branch**: `001-planejador-bncc` | **Data**: 2026-10-02 | **Spec**: [spec.md](./spec.md)

Este guia descreve os pré-requisitos, a inicialização do ambiente monorepo, a execução dos serviços e os cenários passo a passo para validação ponta a ponta dos fluxos do sistema.

---

## 1. Pré-requisitos de Ambiente

* **Node.js**: v22.20.0 LTS (ou 20.x+)
* **pnpm**: v12.6.0 (ou 9.x / 10.x com lockfile)
* **Docker & Docker Compose**: Docker 28.x+ e Docker Compose v2.39+

---

## 2. Configuração e Inicialização Rápida

### 2.1. Clonar e Instalar Dependências
```bash
# Na raiz do repositório:
pnpm install
```

### 2.2. Configurar Arquivos de Ambiente (.env)
```bash
# Copiar arquivos de exemplo para ambiente local:
# No Windows PowerShell:
Copy-Item .env.example .env
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env.local

# No Linux / macOS / Bash:
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

### 2.3. Inicializar o Banco de Dados PostgreSQL (Docker Compose)
```bash
# Subir o container PostgreSQL na porta 5432:
docker compose up -d postgres
```

### 2.4. Executar Migrações e Seeds do Prisma
```bash
# Executar as migrações no banco de dados e popular dados iniciais:
pnpm --filter @planejador/api prisma:migrate
pnpm --filter @planejador/api prisma:seed
```
*O seed carrega de forma idempotente as duas contas de demonstração e o catálogo de habilidades a partir de `docs/data/bncc-recorte.json`.*

### 2.5. Iniciar os Serviços em Modo de Desenvolvimento
```bash
# Inicia apps/api (localhost:3001) e apps/web (localhost:3000) simultaneamente:
pnpm dev
```

* **Frontend Web**: [http://localhost:3000](http://localhost:3000)
* **Backend API**: [http://localhost:3001](http://localhost:3001)
* **Banco de Dados PostgreSQL**: `localhost:5432`

---

## 3. Scripts Principais na Raiz do Repositório

O monorepo disponibiliza os seguintes comandos coordenados:

| Comando | Descrição |
| :--- | :--- |
| `pnpm dev` | Inicia o backend (`apps/api`) na porta 3001 e o frontend (`apps/web`) na porta 3000 em modo watch. |
| `pnpm build` | Compila o build de produção de todas as aplicações e pacotes do monorepo. |
| `pnpm lint` | Executa o linter (ESLint) em todo o monorepo. |
| `pnpm typecheck` | Executa a verificação estrita de tipos do TypeScript sem emitir arquivos (`tsc --noEmit`). |
| `pnpm test` | Executa a suíte de testes unitários rápidos em memória (Jest/Vitest). |
| `pnpm test:integration` | Executa a suíte de testes de integração ponta a ponta (API, transações de banco e modo mock n8n). |

---

## 4. Cenários de Validação Ponta a Ponta

### Cenário 1: Autenticação de Docente e Controle de Sessão Privada (US1)
1. **Acessar**: [http://localhost:3000/login](http://localhost:3000/login).
2. **Testar Rejeição**: Digite `email-invalido@escola.gov.br` com senha incorreta.
   * *Resultado esperado*: Exibição do banner de erro em vermelho (`#FDECEC`) com mensagem: *"Credenciais inválidas. Verifique seu e-mail e senha."*
3. **Login com Conta de Demonstração**: Clique no botão "Usar conta" do card da **Profª Ana Souza** ou digite `ana.souza@escola.gov.br`.
   * *Resultado esperado*: Redirecionamento para o painel principal (`/planos`), exibição do nome e avatar no topo, e emissão de cookie `refreshToken` com atributo `HttpOnly`.

### Cenário 2: Consulta e Seleção de Habilidades BNCC (US2)
1. **Acessar**: [http://localhost:3000/planos/novo](http://localhost:3000/planos/novo).
2. **Filtrar Catálogo**: Digite `"computacional"` ou o código `"EF01CO01"` no campo de busca.
   * *Resultado esperado*: Filtragem instantânea exibindo a habilidade com o badge de código oficial e metadados curriculares.
3. **Selecionar e Remover**:
   * Marque o checkbox da habilidade `EF01CO01`.
   * *Resultado esperado*: A habilidade aparece no painel lateral direito na área "Habilidades selecionadas" como um chip removível com o botão `[x]`. Ao clicar no `[x]`, o chip é removido e o checkbox é desmarcado.

### Cenário 3: Solicitação de Rascunho com IA e Tratamento de Falha Atômica (US3)
1. **Simulação de Sucesso** (com `N8N_MOCK_MODE=true`):
   * Selecione a habilidade `EF01CO01`.
   * Preencha instrução: *"Criar uma atividade prática de organização em pares."* (10 a 1000 caracteres).
   * Preencha duração: `50` (15 a 360 minutos).
   * Marque recursos digitais como "Sim".
   * Clique em "Gerar rascunho com IA".
   * *Resultado esperado*: Exibição imediata do banner de preparação (`#EAF3FC`) com spinner e barra de progresso visual. Após a resposta, redirecionamento para o editor do plano (`/planos/[id]`) com o status `RASCUNHO` e o badge `Auxílio por IA`.
2. **Simulação de Falha / Timeout**:
   * Submeta com o mock configurado para simular falha de conexão.
   * *Resultado esperado*: Encerramento do estado de preparação, nenhum plano salvo na base de dados (`GET /api/plans` continua sem o plano), exibição do alerta de erro em vermelho: *"Não foi possível gerar. Nenhum plano foi salvo. Você pode tentar novamente."*, e **todos os campos preenchidos e habilidades permanecem intactos** para retentativa manual.

### Cenário 4: Edição, Visualização e Salvamento Explícito do Markdown (US4)
1. **No Editor de Plano** (`/planos/[id]`):
   * Alterne entre as abas "Editor Markdown" e "Pré-visualização".
   * *Resultado esperado*: Na visualização dividida ou na aba de preview, os títulos, listas e tempos aparecem formatados esteticamente conforme o Design System.
2. **Modificação e Salvamento**:
   * Altere uma frase no editor Markdown.
   * Clique no botão "Salvar alterações".
   * *Resultado esperado*: Banner verde de confirmação (`#E9F6EF`) informando *"Alterações salvas com sucesso"*, persistindo os dados no PostgreSQL.
3. **Diálogo de Saída com Alterações Pendentes**:
   * Digite mais um texto sem salvar e clique no botão "Sair" ou tente navegar para "Meus planos".
   * *Resultado esperado*: Abertura do modal centralizado *"Sair sem salvar?"*, prevenindo a perda acidental de dados.

### Cenário 5: Isolamento Estrito entre Docentes (US5)
1. Com a sessão da **Profª Ana Souza**, copie a URL de um rascunho criado (ex: `/planos/<id-do-plano>`).
2. Efetue logout clicando no botão do cabeçalho.
3. Faça login com a segunda conta de demonstração (**Prof. Marcos Lima**).
4. Verifique a tela `/planos`:
   * *Resultado esperado*: A listagem de Marcos está vazia ou contém apenas os seus próprios planos, sem exibir qualquer plano de Ana.
5. Cole no navegador o endereço direto do rascunho de Ana (`/planos/<id-do-plano-de-ana>`):
   * *Resultado esperado*: A API responde com **404 Not Found** ("Plano não encontrado"), ocultando se o identificador existe, e o frontend redireciona com segurança para a lista de planos.
