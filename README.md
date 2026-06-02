# Quilombo MVP

> **Atenção:** Este repositório contém um **MVP de demonstração**, não a versão definitiva do produto.
>
> O projeto foi originalmente concebido com **Java + Spring Boot** no back-end e **Next.js** no front-end. Os repositórios da versão final, ainda em desenvolvimento, são:
> - Back-end: [ArrudaFreitas/quilombo-backend](https://github.com/ArrudaFreitas/quilombo-backend)
> - Front-end: [ArrudaFreitas/quilombo-frontend](https://github.com/ArrudaFreitas/quilombo-frontend)
>
> Este MVP foi construído previamente como **molde do resultado esperado**. Por falta de tempo para concluir a migração para a stack definitiva, ele está sendo disponibilizado para a apresentação acadêmica — que retratará o processo de desenvolvimento do Quilombo como produto final, usando este MVP para a demonstração de funcionalidades.

---

## O que é o Quilombo?

Plataforma multi-tenant para comunidades quilombolas criarem e gerenciarem suas próprias páginas institucionais. Cada comunidade recebe um subdomínio (`<slug>.quilombo.localhost`) com página pública customizável e painel de administração próprio.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Back-end | Python 3.12+, FastAPI, SQLite |
| Front-end | React 18, Vite 5, React Router 7 |
| Proxy reverso | nginx |
| Autenticação | Mock de OAuth (Google) — adequado para demo |

---

## Requisitos técnicos

**Com Docker (recomendado):**
- Docker e Docker Compose

**Sem Docker:**
- Python 3.12 ou superior
- Node.js 20 ou superior
- nginx instalado e disponível no `PATH`

---

## Guia de instalação e execução

A aplicação usa subdomínios locais na porta **8090**. Independente do método escolhido, configure o `/etc/hosts` primeiro.

### Passo 0 — Configurar o `/etc/hosts`

Adicione as entradas abaixo para que os subdomínios resolvam localmente:

```
127.0.0.1  quilombo.localhost
127.0.0.1  kalunga.quilombo.localhost
127.0.0.1  palmares.quilombo.localhost
127.0.0.1  frechal.quilombo.localhost
```

---

### Opção A — Docker (recomendado)

Com Docker instalado, um único comando sobe todos os serviços:

```bash
docker compose up --build
```

O banco é populado automaticamente com dados de demo na primeira inicialização.

**Parar:**

```bash
docker compose down
```

---

### Opção B — Execução manual

A aplicação roda com **três processos simultâneos** (uvicorn, vite e nginx).

#### 1. Back-end (FastAPI + uvicorn)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

python seed.py                     # popula o banco com dados de exemplo
uvicorn main:app --reload          # sobe a API na porta 8000
```

#### 2. Front-end (Vite)

Em outro terminal:

```bash
cd frontend
npm install
npm run dev                        # sobe na porta 5173
```

#### 3. Proxy reverso (nginx)

Em outro terminal:

```bash
nginx -c $(pwd)/nginx.conf -t     # valida a config
nginx -c $(pwd)/nginx.conf        # sobe na porta 8090
```

**Parar o nginx:**

```bash
nginx -c $(pwd)/nginx.conf -s stop
```

---

### Acessar

| URL | Descrição |
|-----|-----------|
| `http://quilombo.localhost:8090` | Lista de comunidades (home) |
| `http://kalunga.quilombo.localhost:8090` | Página institucional da comunidade Kalunga |
| `http://kalunga.quilombo.localhost:8090/admin` | Painel de administração |

> No painel de admin, use o e-mail `admin.kalunga@example.com` (ou o e-mail definido no `seed.py`) para simular o login com Google.

---

## Estrutura do projeto

```
.
├── backend/
│   ├── main.py          # entrypoint FastAPI
│   ├── db.py            # schema SQLite e helpers de conexão
│   ├── tenancy.py       # resolução do tenant via subdomínio
│   ├── seed.py          # dados iniciais para demo
│   ├── requirements.txt
│   └── routes/
│       ├── public.py    # endpoints públicos
│       ├── auth.py      # autenticação (mock OAuth)
│       └── admin.py     # endpoints de administração
├── frontend/
│   ├── src/
│   │   ├── api.js               # cliente HTTP
│   │   ├── App.jsx              # roteamento
│   │   ├── pages/
│   │   │   ├── Home.jsx         # listagem de comunidades
│   │   │   ├── community/       # página institucional pública
│   │   │   └── admin/           # painel de administração
│   │   └── styles/              # temas institucionais (CSS)
│   └── vite.config.js
├── nginx.conf           # proxy reverso — execução manual
├── nginx.docker.conf    # proxy reverso — docker compose
├── docker-compose.yml
├── LICENSE
└── README.md
```

---

## Licença

MIT — veja [LICENSE](./LICENSE).
