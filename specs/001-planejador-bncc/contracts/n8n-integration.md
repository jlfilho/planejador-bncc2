# Contract: Integração Backend NestJS ⇄ Workflow n8n

**Referência Original**: [`docs/contracts/n8n.md`](file:///c:/Users/libor/Desktop/workspace/planejador-bncc/docs/contracts/n8n.md)  
**Camada**: Backend (`apps/api`) exclusivo — o cliente frontend jamais acessa esta interface nem possui conhecimento de suas credenciais.  
**Modo Mock Local**: Configurado através de `N8N_MOCK_MODE=true` para testes automatizados e desenvolvimento offline sem dependência ou consumo do workflow compartilhado.

---

## 1. Definição do Endpoint e Transporte

* **Método**: `POST`
* **URL**: Configurável via variável de ambiente `N8N_WEBHOOK_URL` (ex: `http://localhost:5678/webhook/gerar-plano` ou webhook cloud).
* **Autenticação**: Cabeçalho HTTP `x-api-key` contendo `process.env.N8N_API_KEY`.
* **Headers**:
  * `Content-Type: application/json`
  * `x-api-key: <N8N_API_KEY>`
  * `x-request-id: <UUID>` *(para rastreabilidade e correlação nos logs do n8n)*
* **Timeout Rígido**: **45.000 ms (45 segundos)** via `AbortSignal.timeout(45000)`. Se a requisição exceder esse tempo, a chamada é abortada imediatamente.
* **Política de Retentativa**: **Zero retentativas automáticas**. Falhas encerram o ciclo e retornam o controle para nova tentativa manual do docente.

---

## 2. Payload da Mensagem de Requisição

```json
{
  "sessao": "ana.souza@escola.gov.br",
  "habilidade": "EF01CO01 — Organizar objetos físicos ou digitais considerando diferentes características para esta organização, explicitando semelhanças (padrões) e diferenças.",
  "instrucao": "Proponha uma atividade prática investigativa em grupos de 4 alunos.",
  "duracao": 50,
  "recursos_digitais": true
}
```

### Tipagem dos Campos
* `sessao` (`string`): E-mail do usuário autenticado obtido na sessão ativa.
* `habilidade` (`string`): Concatenação de código e descrição no formato exato: `"<CODIGO> — <descrição oficial>"`. Caso múltiplas habilidades tenham sido selecionadas, cada uma é formatada nesse padrão e unida por quebra de linha dupla (`\n\n`).
* `instrucao` (`string`): Texto com as diretrizes pedagógicas (10 a 1.000 caracteres).
* `duracao` (`integer`): Tempo em minutos (15 a 360).
* `recursos_digitais` (`boolean`): Indicador de uso de recursos digitais.

---

## 3. Payload da Resposta de Sucesso

Conforme formalizado em `docs/contracts/n8n.md`:

```json
{
  "success": true,
  "sessao": "ana.souza@escola.gov.br",
  "habilidade": "EF01CO01 — Organizar objetos físicos ou digitais considerando diferentes características para esta organização, explicitando semelhanças (padrões) e diferenças.",
  "answer": "# Organização de Objetos no Espaço Escolar\n\n## Objetivos específicos\n- Identificar atributos e critérios de classificação em pares.\n\n## Introdução — 10 min\nDistribuição de materiais diversos e discussão sobre semelhanças.\n\n## Desenvolvimento — 30 min\nOrganização prática dos objetos pelos estudantes e registro dos padrões.\n\n## Avaliação — 10 min\nSocialização das categorias criadas e fechamento pedagógico.",
  "format": "markdown"
}
```

---

## 4. Validação Estrita da Resposta no Backend (Schema Zod)

O backend valida a resposta recebida contra o seguinte esquema antes de qualquer processamento:

```typescript
import { z } from 'zod';

export const N8nSuccessResponseSchema = z.object({
  success: z.literal(true),
  sessao: z.string().min(1),
  habilidade: z.string().min(1),
  answer: z.string().min(10), // Markdown estruturado
  format: z.literal('markdown'),
});

export type N8nSuccessResponse = z.infer<typeof N8nSuccessResponseSchema>;
```

### Regras de Tratamento de Falha
* Se o status HTTP for diferente de `200`;
* Se `success` for `false` ou ausente;
* Se o schema Zod falhar na validação;
* Se ocorrer timeout (45s) ou erro de conexão:

O cliente lança `N8nIntegrationException`, a transação com o banco de dados **não persiste nenhum plano**, a tabela `AiRun` registra o erro como `FAILED`, e o controller retorna HTTP 502/504 com mensagem orientadora para a interface.

---

## 5. Modo Mock Local (`N8N_MOCK_MODE=true`)

Quando a variável de ambiente `N8N_MOCK_MODE=true` estiver ativa:
* O cliente HTTP não realiza requisições de rede externas.
* Retorna deterministicamente uma resposta de sucesso estruturada em Markdown válida compatível com a habilidade enviada em ~800ms.
* Suporta simulação de falha controlada via flag ou instrução específica nos testes unitários e de integração (`test:integration`).
