# Contract: Gestão e Geração de Planos de Aula

**Prefixo Base**: `/api/plans`  
**Protocolo**: HTTPS / HTTP  
**Acesso**: Exige autenticação (`Authorization: Bearer <accessToken>`)  
**Isolamento Estrito**: Toda leitura e mutação é filtrada pelo `userId` da sessão ativa. O acesso a planos de terceiros retorna **404 Not Found** com ocultação semântica de existência.

---

## 1. `GET /api/plans`

Lista todos os rascunhos pertencentes exclusivamente ao docente autenticado.

### Requisição
* **Headers**:
  * `Authorization: Bearer <accessToken>`
* **Query Parameters**:
  * `q` *(opcional, string)*: Busca textual por título do plano ou componente/código de habilidade.

### Respostas

#### Sucesso (`200 OK`)
```json
{
  "total": 1,
  "items": [
    {
      "id": "e4a2c1f9-3d7b-489e-8c01-7b9a5e2f3d4a",
      "titulo": "Água e vida no território",
      "duracao": 50,
      "recursosDigitais": true,
      "status": "RASCUNHO",
      "aiAssisted": true,
      "createdAt": "2026-10-02T13:45:00.000Z",
      "updatedAt": "2026-10-02T13:50:00.000Z",
      "skills": [
        {
          "codigo": "EF01CO01",
          "nivel": "Ensino Fundamental",
          "ano": 1,
          "eixo": "Pensamento Computacional (PC)"
        }
      ]
    }
  ]
}
```

---

## 2. `GET /api/plans/:id`

Recupera os detalhes completos de um plano de aula do docente, incluindo o corpo em Markdown.

### Requisição
* **Headers**:
  * `Authorization: Bearer <accessToken>`
* **Parâmetros de Rota**:
  * `id`: UUID do plano.

### Respostas

#### Sucesso (`200 OK`)
```json
{
  "id": "e4a2c1f9-3d7b-489e-8c01-7b9a5e2f3d4a",
  "titulo": "Água e vida no território",
  "instrucao": "Proponha uma investigação sobre o uso da água na escola...",
  "duracao": 50,
  "recursosDigitais": true,
  "conteudoMarkdown": "# Água e vida no território\n\n## Objetivos específicos\n- Compreender etapas do ciclo da água...\n\n## Introdução — 8 min\nApresente duas imagens...\n\n## Desenvolvimento — 32 min\nEm grupos, mapear pontos...\n\n## Avaliação — 10 min\nBilhete de saída.",
  "status": "RASCUNHO",
  "aiAssisted": true,
  "createdAt": "2026-10-02T13:45:00.000Z",
  "updatedAt": "2026-10-02T13:50:00.000Z",
  "skills": [
    {
      "id": "7a3e8b12-9c4d-4e5f-8a0b-1c2d3e4f5a6b",
      "codigo": "EF01CO01",
      "nivel": "Ensino Fundamental",
      "ano": 1,
      "eixo": "Pensamento Computacional (PC)",
      "descricao": "Organizar objetos físicos ou digitais..."
    }
  ]
}
```

#### Recurso Inexistente ou Pertencente a Outro Docente (`404 Not Found`)
* Retorna 404 independentemente de o ID existir no banco para outro usuário, registrando log de segurança interno:
```json
{
  "statusCode": 404,
  "message": "Plano não encontrado.",
  "error": "Not Found"
}
```

---

## 3. `POST /api/plans/generate`

Dispara a criação de rascunho com apoio de IA intermediada pelo workflow n8n.

### Requisição
* **Headers**:
  * `Authorization: Bearer <accessToken>`
  * `Content-Type: application/json`
  * `X-Requested-With: XMLHttpRequest`
* **Body**:
  ```json
  {
    "skillCodes": ["EF01CO01"],
    "instrucao": "Proponha uma investigação prática de organização e classificação de materiais em grupos.",
    "duracao": 50,
    "recursosDigitais": true,
    "tituloProvisorio": "Organização e Padrões na Sala de Aula"
  }
  ```

### Regras de Validação de Entrada
* `skillCodes`: Array com ao menos 1 código válido existente na base.
* `instrucao`: String obrigatória com tamanho entre 10 e 1.000 caracteres.
* `duracao`: Número inteiro obrigatório entre 15 e 360 minutos.
* `recursosDigitais`: Booleano obrigatório.
* `tituloProvisorio`: String opcional até 100 caracteres.

### Respostas

#### Sucesso Atômico (`201 Created`)
* Retorna o plano gerado e persistido no estado `RASCUNHO`:
```json
{
  "id": "e4a2c1f9-3d7b-489e-8c01-7b9a5e2f3d4a",
  "titulo": "Organização e Padrões na Sala de Aula",
  "instrucao": "Proponha uma investigação prática...",
  "duracao": 50,
  "recursosDigitais": true,
  "conteudoMarkdown": "# Organização e Padrões na Sala de Aula\n\n## Objetivos específicos...",
  "status": "RASCUNHO",
  "aiAssisted": true,
  "createdAt": "2026-10-02T13:45:00.000Z",
  "updatedAt": "2026-10-02T13:45:00.000Z",
  "skills": [
    {
      "codigo": "EF01CO01",
      "nivel": "Ensino Fundamental",
      "ano": 1,
      "eixo": "Pensamento Computacional (PC)"
    }
  ]
}
```

#### Falha no Serviço de IA / Timeout (`502 Bad Gateway` ou `504 Gateway Timeout`)
* Nenhum plano é salvo no banco de dados (`Plan` não é criado). O registro `AiRun` é marcado como `FAILED`.
* A resposta instrui a interface a manter os campos preservados:
```json
{
  "statusCode": 502,
  "message": "Não foi possível gerar. Nenhum plano foi salvo. Você pode tentar novamente.",
  "error": "AI_GENERATION_FAILED"
}
```

---

## 4. `PUT /api/plans/:id`

Salva alterações manuais explícitas efetuadas pelo professor no editor de Markdown.

### Requisição
* **Headers**:
  * `Authorization: Bearer <accessToken>`
  * `Content-Type: application/json`
  * `X-Requested-With: XMLHttpRequest`
* **Parâmetros de Rota**:
  * `id`: UUID do plano.
* **Body**:
  ```json
  {
    "titulo": "Água e vida no território (Revisado)",
    "conteudoMarkdown": "# Água e vida no território\n\n## Objetivos específicos revisados..."
  }
  ```

### Respostas

#### Sucesso (`200 OK`)
```json
{
  "id": "e4a2c1f9-3d7b-489e-8c01-7b9a5e2f3d4a",
  "titulo": "Água e vida no território (Revisado)",
  "conteudoMarkdown": "# Água e vida no território\n\n## Objetivos específicos revisados...",
  "status": "RASCUNHO",
  "updatedAt": "2026-10-02T14:10:00.000Z"
}
```

#### Tentativa de Edição em Plano Alheio (`404 Not Found`)
```json
{
  "statusCode": 404,
  "message": "Plano não encontrado.",
  "error": "Not Found"
}
```
