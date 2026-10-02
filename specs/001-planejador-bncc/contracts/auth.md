# Contract: Autenticação e Gestão de Sessão

**Prefixo Base**: `/api/auth`  
**Protocolo**: HTTPS (ou HTTP em ambiente local)  
**Formato de Dados**: JSON (`Content-Type: application/json`)  
**CORS**: Restrito à origem da aplicação web (`http://localhost:3000`) com `credentials: true`  
**Proteção CSRF**: Cookies com `SameSite=Lax`, cabeçalho `X-Requested-With: XMLHttpRequest` em requisições de mutação, e validação de `Origin`/`Referer`.

---

## 1. `POST /api/auth/login`

Autentica o docente utilizando credenciais de demonstração pré-configuradas.

### Requisição
* **Headers**:
  * `Content-Type: application/json`
  * `X-Requested-With: XMLHttpRequest`
* **Body**:
  ```json
  {
    "email": "ana.souza@escola.gov.br",
    "password": "senha-segura-demo"
  }
  ```

### Validações de Entrada
* `email`: String obrigatória, formato válido de e-mail.
* `password`: String obrigatória, mínimo 6 caracteres.

### Respostas

#### Sucesso (`200 OK`)
* **Set-Cookie**:
  ```
  refreshToken=<jwt_ou_token_opaco>; Path=/api/auth; HttpOnly; SameSite=Lax; Max-Age=28800; [Secure]
  ```
  *(Nota: `Secure` é ativo em produção e omitido em localhost)*
* **Body**:
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 900,
    "user": {
      "id": "c1f7a28e-5b1b-4f5a-9481-67823f99d201",
      "name": "Profª Ana Souza",
      "email": "ana.souza@escola.gov.br",
      "role": "DOCENTE"
    }
  }
  ```

#### Erro de Credenciais (`401 Unauthorized`)
* Mensagem amigável sem revelar se o e-mail ou a senha estavam incorretos:
  ```json
  {
    "statusCode": 401,
    "message": "Credenciais inválidas. Verifique seu e-mail e senha.",
    "error": "Unauthorized"
  }
  ```

---

## 2. `POST /api/auth/refresh`

Renova o Access Token expirado utilizando o Refresh Token persistido no cookie seguro `HttpOnly`. Aplica rotação de token.

### Requisição
* **Headers**:
  * `X-Requested-With: XMLHttpRequest`
* **Cookie**: `refreshToken=<token>`
* **Body**: Vazio (`{}`)

### Respostas

#### Sucesso (`200 OK`)
* **Set-Cookie**: Novo `refreshToken` rotacionado.
* **Body**:
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 900,
    "user": {
      "id": "c1f7a28e-5b1b-4f5a-9481-67823f99d201",
      "name": "Profª Ana Souza",
      "email": "ana.souza@escola.gov.br",
      "role": "DOCENTE"
    }
  }
  ```

#### Erro de Sessão Expirada / Token Revogado (`401 Unauthorized`)
* **Set-Cookie**: Limpa o cookie (`Max-Age=0`).
* **Body**:
  ```json
  {
    "statusCode": 401,
    "message": "Sessão expirada. Faça login novamente.",
    "error": "Unauthorized"
  }
  ```

---

## 3. `POST /api/auth/logout`

Encerra a sessão ativa do docente, revoga o hash no banco e limpa o cookie no navegador.

### Requisição
* **Headers**:
  * `Authorization: Bearer <accessToken>` *(opcional)*
  * `X-Requested-With: XMLHttpRequest`
* **Cookie**: `refreshToken=<token>`

### Respostas

#### Sucesso (`200 OK`)
* **Set-Cookie**: `refreshToken=; Path=/api/auth; HttpOnly; SameSite=Lax; Max-Age=0`
* **Body**:
  ```json
  {
    "success": true,
    "message": "Sessão encerrada com sucesso."
  }
  ```

---

## 4. `GET /api/auth/me`

Retorna os dados do docente autenticado atual.

### Requisição
* **Headers**:
  * `Authorization: Bearer <accessToken>`

### Respostas

#### Sucesso (`200 OK`)
```json
{
  "user": {
    "id": "c1f7a28e-5b1b-4f5a-9481-67823f99d201",
    "name": "Profª Ana Souza",
    "email": "ana.souza@escola.gov.br",
    "role": "DOCENTE"
  }
}
```

#### Não Autenticado (`401 Unauthorized`)
```json
{
  "statusCode": 401,
  "message": "Token de acesso inválido ou expirado.",
  "error": "Unauthorized"
}
```
