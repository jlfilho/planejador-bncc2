# Feature Specification: Planejador BNCC para Professores

**Feature Branch**: `001-planejador-bncc`

**Created**: 2026-10-01

**Status**: Draft

**Input**: User description: "Desenvolver o Planejador BNCC para uso de professores. O professor entra com uma conta de demonstração previamente cadastrada. Após o login, consulta habilidades BNCC por nível, ano quando aplicável, eixo, código ou texto e seleciona uma ou mais habilidades. Informa uma instrução pedagógica, duração em minutos e se utilizará recursos digitais. Ao confirmar, visualiza um estado de preparação. O serviço de IA recebe a solicitação. Se a resposta for válida, a aplicação salva um plano privado em estado RASCUNHO, com indicação de auxílio por IA. O professor vê o Markdown, pode editá-lo, visualizar sua apresentação, salvar explicitamente e consultar a lista de seus rascunhos. Se a geração falhar, os campos são preservados e nenhum plano parcial é salvo. Uma nova tentativa é iniciada somente por ação do professor. Outro professor não pode ler nem editar o rascunho. Incluir login, logout, sessão, catálogo mínimo e duas contas de demonstração para testar o acesso privado. Sem cadastro público nem administração. Sem PDF, finalização, versionamento de planos ou publicação pública deles. Defina histórias priorizadas e critérios de aceitação verificáveis. Ainda não implemente código."

## Clarifications

### Session 2026-10-01
- Q: Como o sistema deve responder a uma tentativa de acesso direto a um plano de aula pertencente a outro professor? → A: Retornar erro 404 ("Plano não encontrado"), ocultando se o plano existe e registrando log de auditoria no backend para evitar enumeração de dados.
- Q: Qual deve ser a política de duração e expiração da sessão autenticada das contas de demonstração? → A: Duração de 8 horas por cookie HttpOnly seguro (SameSite=Lax), com encerramento por expiração de turno ou logout explícito.
- Q: Quais limites e regras de validação devem ser aplicados aos campos de instrução pedagógica e duração da aula no formulário de geração? → A: Duração entre 15 e 360 minutos; instrução pedagógica obrigatória com 10 a 1.000 caracteres.
- Q: Qual deve ser o tempo limite (timeout) para a chamada ao serviço de IA e qual a mensagem de feedback caso esse limite seja atingido? → A: Timeout de 45 segundos com aborto imediato no backend, preservação de todos os campos e alerta orientando nova tentativa manual.
- Q: Qual deve ser o formato e a estrutura exigida na resposta do serviço de IA para o backend validar e persistir o rascunho? → A: Objeto JSON estrito com titulo (string até 100 caracteres) e conteudo_markdown (corpo pedagógico estruturado em Markdown).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Autenticação de Docente e Controle de Sessão Privada (Priority: P1)

Como professor da educação básica, quero acessar a aplicação utilizando uma conta de demonstração previamente configurada e manter minha sessão protegida, para poder planejar minhas aulas com privacidade e segurança sobre meus dados e planos.

**Why this priority**: A autenticação é o alicerce fundamental de segurança, soberania docente e privacidade exigido pela constituição do projeto. Nenhuma operação de planejamento individualizado ou isolamento de planos pode existir sem a identificação do docente.

**Independent Test**: Pode ser testado de forma totalmente autônoma acessando a tela de login com uma das contas de demonstração válidas, confirmando o redirecionamento para o painel privado com sessão ativa, e testando o logout e a rejeição de credenciais incorretas.

**Acceptance Scenarios**:

1. **Given** um professor não autenticado na tela de login, **When** insere as credenciais válidas de uma conta de demonstração, **Then** o sistema estabelece a sessão do docente com validade de 8 horas em cookie seguro (`HttpOnly`, `SameSite=Lax`) e o redireciona ao painel principal exibindo seu nome e identificação.
2. **Given** um usuário não autenticado na tela de login, **When** tenta submeter credenciais inválidas ou inexistentes, **Then** o sistema exibe mensagem de erro amigável sem revelar detalhes internos e não concede acesso.
3. **Given** um professor autenticado em qualquer tela protegida, **When** clica na opção de logout, **Then** a sessão ativa é terminada e o usuário é redirecionado à tela de login, não conseguindo mais acessar telas privadas pelo histórico do navegador.

---

### User Story 2 - Consulta e Seleção de Habilidades da BNCC (Priority: P2)

Como professor autenticado, quero consultar o catálogo curricular da Base Nacional Comum Curricular (BNCC) aplicando filtros por nível de ensino, ano escolar, componente curricular/eixo, código da habilidade ou busca textual, e selecionar as habilidades pertinentes, para fundamentar pedagogicamente minha proposta de aula.

**Why this priority**: A conformidade com a BNCC é o núcleo pedagógico do planejador. Sem a capacidade de consultar e selecionar habilidades curriculares oficiais, o plano gerado perde sua validade referencial.

**Independent Test**: Pode ser testado na interface de criação de plano filtrando habilidades por código específico (ex: `EF05CI02`) ou termo livre (ex: "água"), selecionando uma ou mais habilidades e verificando que elas são adicionadas à lista de habilidades selecionadas com tags visuais removíveis.

**Acceptance Scenarios**:

1. **Given** um professor na tela de criação de plano, **When** digita o código ou termo descritivo de uma habilidade no campo de busca do catálogo, **Then** a lista de habilidades exibe apenas os registros correspondentes contendo código, nível e descrição.
2. **Given** o catálogo com resultados filtrados, **When** o professor clica para selecionar uma habilidade, **Then** a habilidade é adicionada à área de seleção como um chip visual contendo seu código e botão de remoção.
3. **Given** uma ou mais habilidades selecionadas, **When** o professor clica no ícone de remoção de um chip, **Then** a respectiva habilidade é removida da seleção e o catálogo atualiza seu estado visual correspondente.

---

### User Story 3 - Solicitação de Rascunho com Assistência de IA e Tratamento de Falha Atômica (Priority: P3)

Como professor autenticado com habilidades selecionadas, quero informar as diretrizes da aula (instrução pedagógica, duração em minutos e recursos digitais) e solicitar a geração do rascunho com apoio de IA, visualizando o estado de preparação e tendo a garantia de que falhas não criarão planos corrompidos ou parciais.

**Why this priority**: A assistência por IA acelera a elaboração do plano docente, mas requer resiliência absoluta e atomicidade estrita: falhas de conectividade ou timeouts não podem deixar resíduos no banco nem apagar o esforço de digitação do professor.

**Independent Test**: Pode ser testado com sucesso simulando uma resposta válida da IA para verificar o plano salvo com status `RASCUNHO` e badge `Auxílio por IA`; e testado em caso de erro forçando falha no serviço de IA para verificar que os campos do formulário continuam preenchidos, nenhum plano parcial é salvo no banco e o botão de tentar novamente fica disponível para ação do docente.

**Acceptance Scenarios**:

1. **Given** um professor com ao menos uma habilidade selecionada, instrução preenchida (10 a 1.000 caracteres), duração válida (15 a 360 minutos) e indicador de recursos digitais definido, **When** confirma a solicitação de geração, **Then** a interface apresenta imediatamente um estado visual de preparação (indicador de progresso/loading explicativo) enquanto a IA processa a solicitação em segundo plano.
2. **Given** uma solicitação em andamento, **When** o serviço de IA responde com sucesso dentro do formato esperado, **Then** a aplicação salva atomicamente um plano privado no banco de dados com status `RASCUNHO`, identificação de `Auxílio por IA` vinculado exclusivamente ao professor, e redireciona para a tela do editor de plano.
3. **Given** uma solicitação em andamento, **When** o serviço de IA falha por timeout (45 segundos), erro de rede ou resposta malformada, **Then** a aplicação encerra o estado de preparação, não persiste nenhum plano no banco de dados, exibe a mensagem de erro ("Não foi possível gerar. Nenhum plano foi salvo. Você pode tentar novamente.") e mantém preservadas todas as habilidades e campos digitados no formulário para que o professor possa tentar novamente quando desejar.
4. **Given** uma falha na geração com os campos preservados, **When** o professor não clica explicitamente em gerar novamente, **Then** o sistema permanece inerte, sem disparar qualquer retentativa automática em segundo plano.

---

### User Story 4 - Visualização, Edição e Salvamento Explícito do Markdown (Priority: P4)

Como professor proprietário de um rascunho de aula, quero ler a estrutura gerada em formato Markdown, alternar para a pré-visualização formatada, editar livremente o conteúdo pedagógico e salvar as alterações explicitamente, para exercer minha soberania docente e adequar o plano à realidade da minha turma.

**Why this priority**: A constituição do projeto estabelece que a saída da IA é estritamente um rascunho editável sob controle docente. O professor deve ter ferramentas fluidas de leitura e edição com salvamento seguro sob demanda.

**Independent Test**: Pode ser testado abrindo um rascunho existente, alterando o texto no editor Markdown, alternando para a aba de pré-visualização para validar a formatação rica, acionando o botão "Salvar rascunho" e recarregando a página para confirmar que as edições foram persistidas.

**Acceptance Scenarios**:

1. **Given** um professor na tela de visualização do seu rascunho, **When** alterna entre a aba "Editor Markdown" e a aba "Pré-visualização", **Then** o sistema exibe o código-fonte Markdown na primeira e a renderização formatada correspondente (títulos, listas, seções pedagógicas) na segunda de forma imediata.
2. **Given** o editor Markdown ativo, **When** o professor modifica o texto pedagógico e clica em "Salvar", **Then** as alterações são gravadas no banco de dados, uma notificação de sucesso é exibida e o status permanece `RASCUNHO`.
3. **Given** o professor com alterações não salvas no editor, **When** tenta fechar ou navegar para outra tela, **Then** um diálogo de confirmação ("Sair sem salvar?") alerta que as alterações recentes serão perdidas caso confirme a saída.

---

### User Story 5 - Gestão de Meus Planos e Isolamento Estrito entre Docentes (Priority: P5)

Como professor autenticado, quero acessar a listagem de todos os meus rascunhos criados e ter a certeza inegociável de que nenhum outro professor tem acesso de leitura ou edição aos meus planos, para manter a organização e o sigilo do meu planejamento pedagógico.

**Why this priority**: Garante o ciclo de vida e a consulta contínua do trabalho do docente, além de validar o princípio de segurança e autorização estrita da constituição em um ambiente multi-docente testável via contas de demonstração.

**Independent Test**: Pode ser testado criando um rascunho com o "Professor Demo 1", verificando-o na tela "Meus Planos", efetuando logout, autenticando-se com o "Professor Demo 2" e checando que a lista está vazia para o segundo professor, e que tentativas de acessar a URL do plano do primeiro resultam em erro de acesso negado.

**Acceptance Scenarios**:

1. **Given** o Professor Demo 1 autenticado com rascunhos salvos, **When** acessa a página "Meus planos", **Then** visualiza a lista com seus planos contendo título, habilidades associadas, data/hora da última atualização e badges de status (`RASCUNHO` e `Auxílio por IA`).
2. **Given** o Professor Demo 2 autenticado na aplicação, **When** acessa a página "Meus planos", **Then** visualiza exclusivamente os planos criados por ele próprio, sem qualquer exibição de planos criados pelo Professor Demo 1.
3. **Given** o Professor Demo 2 autenticado, **When** tenta acessar diretamente via endereço URL ou requisição direta o identificador de um plano de titularidade do Professor Demo 1, **Then** o sistema bloqueia o acesso imediatamente com erro 404 ("Plano não encontrado"), ocultando se o recurso existe, gerando log de auditoria no backend e redirecionando para "Meus planos".

---

### Edge Cases

- **Entrada de duração inválida**: Se o professor informar valor fora da faixa de 15 a 360 minutos, valor não inteiro ou deixar o campo vazio, a interface bloqueia o disparo e exibe mensagem de alerta no campo ("Informe uma duração válida entre 15 e 360 minutos").
- **Tentativa de geração sem habilidades selecionadas**: Se o professor tentar confirmar a geração sem ter selecionado ao menos uma habilidade da BNCC, a ação é bloqueada com mensagem de orientação pedagógica.
- **Instrução pedagógica fora dos limites**: Se a instrução for deixada vazia ou contiver menos de 10 caracteres ou mais de 1.000 caracteres, a aplicação bloqueia o envio com mensagem orientadora ("A instrução deve conter entre 10 e 1.000 caracteres").
- **Timeout ou indisponibilidade da IA durante a preparação**: A aplicação encerra o indicador de carregamento após tempo limite de 45 segundos, aborta a transação no backend sem salvar registros, restaura a visão do formulário com os valores intactos e apresenta o alerta semântico de erro ("Não foi possível gerar. Nenhum plano foi salvo. Você pode tentar novamente.").
- **Tentativa de manipulação direta de identificador de plano (IDOR)**: Qualquer requisição que tente ler, atualizar ou deletar um plano cujo proprietário não corresponda ao usuário da sessão atual é respondida com código 404 ("Plano não encontrado") e gera registro de auditoria no backend.
- **Sessão expirada durante edição de Markdown**: Se a sessão expirar enquanto o docente edita, uma tentativa de salvamento solicita reautenticação sem descartar os dados em memória antes do redirecionamento seguro.
- **Busca por habilidade sem correspondência**: Se nenhum código ou descrição atender aos filtros pesquisados, o catálogo exibe feedback de "Nenhuma habilidade encontrada para os critérios informados", permitindo limpar os filtros.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE fornecer mecanismo de autenticação baseado em sessão para duas contas de demonstração pré-cadastradas no sistema, utilizando cookie seguro (`HttpOnly`, `SameSite=Lax`) com tempo de expiração fixado em 8 horas (duração do turno escolar) ou encerramento por logout explícito.
- **FR-002**: O sistema DEVE disponibilizar ação de encerramento de sessão (logout) que invalide a sessão ativa do professor e redirecione para a tela de login.
- **FR-003**: O sistema NÃO DEVE incluir tela ou fluxo de autocadastro público de novos usuários, nem painéis administrativos para gerenciamento geral do sistema.
- **FR-004**: O sistema DEVE disponibilizar um catálogo com conjunto mínimo representativo de habilidades da BNCC estruturado com: nível de ensino (ex: Ensino Fundamental), ano escolar (quando aplicável, ex: 5º ano), componente curricular/área (ex: Ciências, Geografia, Língua Portuguesa), código oficial (ex: `EF05CI02`) e texto descritivo oficial da habilidade.
- **FR-005**: O sistema DEVE permitir a pesquisa e filtragem no catálogo de habilidades por código, componente, nível, ano ou palavras-chave contidas na descrição da habilidade.
- **FR-006**: O sistema DEVE permitir a seleção e desseleção de uma ou mais habilidades curriculares para o plano, exibindo as habilidades selecionadas como chips com botão de remoção individual.
- **FR-007**: O sistema DEVE fornecer campos de formulário e validar rigorosamente tanto no cliente quanto no backend:
  - Instrução pedagógica (texto orientador obrigatório com tamanho entre 10 e 1.000 caracteres);
  - Duração estimada da aula (campo numérico inteiro obrigatório entre 15 e 360 minutos);
  - Indicador de utilização de recursos digitais (controle de alternância booleano).
- **FR-008**: Ao submeter o formulário de geração com parâmetros válidos, o sistema DEVE exibir um estado de preparação com indicador de progresso e mensagem contextual informativa.
- **FR-009**: O backend da aplicação DEVE intermediar de forma exclusiva a comunicação com o serviço de IA, garantindo que segredos, credenciais e chaves de API nunca sejam expostos ao cliente.
- **FR-010**: Se o serviço de IA retornar uma resposta estruturada válida em formato JSON estrito contendo os campos `titulo` (string com até 100 caracteres) e `conteudo_markdown` (texto em Markdown estruturado com objetivos, introdução, desenvolvimento e avaliação), o backend DEVE persistir atomicamente um novo plano de aula no estado `RASCUNHO`, com indicador de `Auxílio por IA`, vinculado unicamente ao professor logado.
- **FR-011**: Se o serviço de IA apresentar falha, timeout (limite máximo de 45 segundos) ou payload corrompido, o backend DEVE abortar a operação imediatamente, NÃO persistir nenhum plano parcial ou inconsistente no banco de dados, retornar status adequado para a interface encerrar o estado de preparação, exibir alerta semântico de erro ("Não foi possível gerar. Nenhum plano foi salvo. Você pode tentar novamente.") e manter rigorosamente preservados todos os campos e habilidades preenchidos no formulário.
- **FR-012**: O sistema DEVE exigir intervenção e clique manual do professor para reiniciar o processo de geração após uma falha, proibindo tentativas automáticas repetitivas em segundo plano.
- **FR-013**: O sistema DEVE disponibilizar uma tela de visualização e edição do plano que inclua:
  - Editor textual de Markdown;
  - Aba de pré-visualização com formatação legível do conteúdo (títulos, listas, orientações didáticas);
  - Botão de salvamento explícito.
- **FR-014**: O sistema DEVE persistir as alterações realizadas no Markdown somente quando o professor acionar explicitamente a opção de salvar, emitindo confirmação visual de sucesso.
- **FR-015**: O sistema DEVE exibir a lista de "Meus Planos" contendo exclusivamente os rascunhos criados pelo professor autenticado, com título, habilidades, data de atualização e indicadores visuais de status.
- **FR-016**: O sistema DEVE impor verificação estrita de propriedade em toda operação sobre planos de aula; qualquer tentativa de acesso direto ou manipulação de plano pertencente a outro docente DEVE resultar em erro 404 ("Plano não encontrado"), omitindo a existência do recurso e registrando evento de auditoria no backend.
- **FR-017**: O sistema NÃO DEVE incluir nesta versão: geração ou exportação em arquivo PDF, fluxo de finalização/conclusão de status além de rascunho, histórico ou controle de versão de planos, nem publicação em catálogo público compartilhado.

### Key Entities *(include if feature involves data)*

- **Docente (Teacher)**: Representa o professor autenticado no sistema via credencial pré-configurada. Possui identificador único, nome de exibição, e-mail/identificador de login de demonstração e controle de sessão ativa.
- **Habilidade BNCC (BNCC Skill)**: Representa a competência ou habilidade pedagógica oficial. Contém código identificador oficial (ex: `EF05CI02`), nível educacional, ano escolar (opcional), componente curricular/área do conhecimento e descrição da habilidade.
- **Plano de Aula (Lesson Plan)**: Representa a proposta didática estruturada. Pertence obrigatoriamente a um Docente proprietário. Possui identificador único, título do plano (extraído da resposta da IA ou atualizado pelo professor, com limite de 100 caracteres), coleção de Habilidades BNCC associadas, duração estimada (minutos), indicação de uso de recursos digitais, instruções orientadoras do docente, conteúdo didático completo em Markdown (`conteudo_markdown`), status de ciclo de vida (`RASCUNHO`), flag de auxílio de IA (`true`), data de criação e data de última atualização.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O professor consegue efetuar login com uma conta de demonstração e acessar o painel principal em menos de 5 segundos.
- **SC-002**: A busca e filtragem no catálogo de habilidades da BNCC retorna resultados relevantes em menos de 1 segundo para qualquer critério pesquisado (código, nível, componente ou texto livre).
- **SC-003**: 100% dos rascunhos gerados com sucesso por IA são atribuídos exclusivamente ao docente autenticado com status `RASCUNHO` e indicação visual de `Auxílio por IA`.
- **SC-004**: Em 100% das ocorrências de falha ou timeout do serviço de IA, nenhum plano parcial ou inconsistente é criado no banco de dados, e todos os campos digitados pelo professor permanecem intactos na interface.
- **SC-005**: 100% das tentativas de acesso ou alteração de planos de outro docente via alteração direta de identificadores ou requisições são bloqueadas pelo sistema de autorização.
- **SC-006**: A alternância entre o editor Markdown e a pré-visualização renderizada ocorre de maneira instantânea (inferior a 200ms), sem recarregamento de página.
- **SC-007**: O professor consegue editar o conteúdo em Markdown e salvar explicitamente a versão atualizada com confirmação visual imediata.

## Assumptions

- **Público e Ambientes**: A aplicação será utilizada por professores da educação básica através de navegadores web modernos em computadores de mesa, notebooks, tablets e celulares, respeitando as diretrizes de acessibilidade e responsividade estabelecidas na constituição do projeto.
- **Contas de Demonstração**: O sistema disporá de duas contas de demonstração pré-configuradas (ex: `prof.ana@escola.gov.br` e `prof.carlos@escola.gov.br` ou equivalentes) com credenciais fixas e documentadas, permitindo a validação cabal do isolamento entre usuários sem dependência de formulários de cadastro.
- **Catálogo Mínimo de Habilidades**: O catálogo pré-carregado no ambiente contará com uma amostragem autêntica e representativa de habilidades da BNCC (cobrindo anos iniciais e finais do Ensino Fundamental em disciplinas como Ciências, Língua Portuguesa e Geografia) suficiente para testes ricos de pesquisa e planejamento.
- **Soberania do Professor e Rascunho**: O plano gerado é concebido deliberadamente como ponto de partida (rascunho), necessitando da leitura, ajuste e validação explícita do professor antes de qualquer utilização real em sala de aula.
- **Fronteiras e Escopo Excluído**: Recursos secundários como download em PDF, publicação em repositório comunitário, fluxos de aprovação institucional ou aprovação administrativa estão deliberadamente excluídos desta entrega para concentrar esforços na usabilidade, segurança e integridade do fluxo principal.
