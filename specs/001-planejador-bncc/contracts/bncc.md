# Contract: Catálogo de Habilidades da BNCC

**Prefixo Base**: `/api/bncc`  
**Protocolo**: HTTPS / HTTP  
**Acesso**: Exige autenticação (`Authorization: Bearer <accessToken>`)  
**Modo**: Estritamente somente leitura (sem rotas de criação, edição ou exclusão expostas).

---

## 1. `GET /api/bncc/skills`

Consulta o catálogo oficial de habilidades da BNCC com suporte a filtros combinados e busca textual.

### Requisição
* **Headers**:
  * `Authorization: Bearer <accessToken>`
* **Query Parameters**:
  * `q` *(opcional, string)*: Termo para busca por código da habilidade ou termos contidos na descrição. Ex: `agua`, `EF01CO01`.
  * `nivel` *(opcional, string)*: Filtro por nível educacional. Ex: `Ensino Fundamental`.
  * `ano` *(opcional, integer)*: Filtro por ano escolar. Ex: `1`, `2`, `5`.
  * `eixo` *(opcional, string)*: Filtro por componente/área ou eixo temático. Ex: `Pensamento Computacional (PC)`.

### Respostas

#### Sucesso (`200 OK`)
```json
{
  "total": 2,
  "items": [
    {
      "id": "7a3e8b12-9c4d-4e5f-8a0b-1c2d3e4f5a6b",
      "codigo": "EF01CO01",
      "nivel": "Ensino Fundamental",
      "ano": 1,
      "eixo": "Pensamento Computacional (PC)",
      "descricao": "Organizar objetos físicos ou digitais considerando diferentes características para esta organização, explicitando semelhanças (padrões) e diferenças.",
      "explicacao": "Objetos de um mesmo conjunto podem ser organizados e agrupados de diferentes maneiras, enfatizando as características desejadas.",
      "exemplos": "O professor pode pedir que os alunos organizem um conjunto de personagens por gênero, cor dos olhos..."
    },
    {
      "id": "8b4f9c23-0d5e-5f6a-9b1c-2d3e4f5a6b7c",
      "codigo": "EF01CO02",
      "nivel": "Ensino Fundamental",
      "ano": 1,
      "eixo": "Pensamento Computacional (PC)",
      "descricao": "Identificar e seguir sequências de passos aplicados no dia a dia para resolver problemas.",
      "explicacao": "O objetivo é que os alunos possam identificar passos que fazem parte da execução de uma tarefa.",
      "exemplos": "O professor pode fornecer sequências de passos para resolver problemas como construir origamis simples..."
    }
  ]
}
```

---

## 2. `GET /api/bncc/skills/:codigo`

Obtém o detalhe de uma habilidade específica pelo seu código oficial.

### Requisição
* **Headers**:
  * `Authorization: Bearer <accessToken>`
* **Parâmetros de Rota**:
  * `codigo`: Código alfanumérico da BNCC (ex: `EF01CO01`).

### Respostas

#### Sucesso (`200 OK`)
```json
{
  "id": "7a3e8b12-9c4d-4e5f-8a0b-1c2d3e4f5a6b",
  "codigo": "EF01CO01",
  "nivel": "Ensino Fundamental",
  "ano": 1,
  "eixo": "Pensamento Computacional (PC)",
  "descricao": "Organizar objetos físicos ou digitais considerando diferentes características para esta organização, explicitando semelhanças (padrões) e diferenças.",
  "explicacao": "Objetos de um mesmo conjunto podem ser organizados e agrupados de diferentes maneiras, enfatizando as características desejadas.",
  "exemplos": "O professor pode pedir que os alunos organizem um conjunto de personagens por gênero, cor dos olhos..."
}
```

#### Não Encontrado (`404 Not Found`)
```json
{
  "statusCode": 404,
  "message": "Habilidade BNCC não encontrada para o código informado.",
  "error": "Not Found"
}
```
