# 🚀 Hono API Service

Modern REST API built with **Hono.js** on **Node.js 24+** — scalable, type-safe, testable, and production-ready.

![Node.js](https://img.shields.io/badge/Node.js-24+-green)
![TypeScript](https://img.shields.io/badge/TypeScript-7.0+-blue)
![Hono](https://img.shields.io/badge/Hono-4.12+-orange)
![Vitest](https://img.shields.io/badge/Vitest-4.1+-yellow)
![License](https://img.shields.io/badge/License-MIT-lightgrey)

---

## 📋 Daftar Isi

- [Tech Stack](#-tech-stack)
- [Requirements](#-requirements)
- [Struktur Proyek](#-struktur-proyek)
- [Environment Variables](#env-vars)
- [Menjalankan Project](#-menjalankan-project)
- [API Documentation / Swagger](#-api-documentation--swagger)
- [Testing](#-testing)
- [Linting, Formatting, dan Quality Check](#-linting-formatting-dan-quality-check)
- [Penambahan Module Baru](#-development-module-baru)
- [Useful Commands](#-useful-commands)

---

## 🛠 Tech Stack

| Package                                                                                  | Fungsi                                       |
| ---------------------------------------------------------------------------------------- | -------------------------------------------- |
| [Hono](https://hono.dev)                                                                 | Web framework ringan dan cepat               |
| [@hono/node-server](https://github.com/honojs/node-server)                               | Adapter Hono untuk Node.js runtime           |
| [@hono/zod-openapi](https://github.com/honojs/middleware/tree/main/packages/zod-openapi) | Generate OpenAPI spec dari Zod schema        |
| [@hono/swagger-ui](https://github.com/honojs/middleware/tree/main/packages/swagger-ui)   | Swagger UI embedded di Hono                  |
| [Zod](https://zod.dev)                                                                   | Schema validation dan type inference         |
| [Drizzle ORM](https://orm.drizzle.team)                                                  | Type-safe ORM untuk PostgreSQL               |
| [pg](https://node-postgres.com)                                                          | PostgreSQL client                            |
| [redis](https://github.com/redis/node-redis)                                             | Redis client                                 |
| [BullMQ](https://docs.bullmq.io)                                                         | Queue/job processing berbasis Redis          |
| [AWS SDK S3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3)           | AWS S3 / S3-compatible storage seperti MinIO |
| [Pino](https://getpino.io)                                                               | Structured logger                            |
| [Vitest](https://vitest.dev)                                                             | Unit dan integration test                    |
| [Oxlint](https://oxc.rs/docs/guide/usage/linter)                                         | Linter cepat berbasis Rust                   |
| [Oxfmt](https://github.com/oxc-project/oxc)                                              | Formatter                                    |
| [tsx](https://github.com/privatenumber/tsx)                                              | TypeScript runner untuk development          |
| [tsdown](https://tsdown.dev)                                                             | Bundler TypeScript untuk production build    |

---

## ✅ Requirements

### Local Development

| Tool       | Minimum | Keterangan                 |
| ---------- | ------: | -------------------------- |
| Node.js    |     24+ | Sesuai `engines.node >=24` |
| pnpm       |         | Package manager            |
| PostgreSQL |     14+ | Database utama             |
| Redis      |      7+ | Cache, rate limit, queue   |

---

## 📁 Struktur Proyek

```text
root-project/
├── .env                         # Environment variables
├── .env.example                 # Template environment variables local
├── drizzle.config.ts            # Konfigurasi Drizzle ORM
├── oxlint.json                  # Konfigurasi Oxlint
├── oxfmt.json                   # Konfigurasi Oxfmt formatter
├── tsdown.config.ts             # Konfigurasi production bundling
├── vitest.config.ts             # Konfigurasi testing Vitest
├── tsconfig.json                # Konfigurasi TypeScript
├── server.ts                    # Entrypoint production bundling
├── package.json
├── test/                        # Global test folder
│   ├── helpers/
│   │   ├── api-case-factory.ts
│   │   ├── factory.ts
│   │   └── setup.ts
│   └── integration/
│       └── api.test.ts
└── src/
    ├── config/
    │   ├── env.ts
    │   ├── openapi-tags.ts
    │   └── swagger.ts
    ├── db/
    │   └── schema/
    ├── docs/
    ├── libs/
    │   ├── logger.ts
    │   ├── postgresql.ts
    │   ├── redis.ts
    │   └── s3.ts
    ├── middlewares/
    ├── modules/
    │   └── blog/
    │       ├── blog.controller.ts
    │       ├── blog.dto.ts
    │       ├── blog.openapi.ts
    │       ├── blog.repository.ts
    │       ├── blog.routes.ts
    │       ├── blog.service.ts
    │       ├── blog.test.ts
    │       └── index.ts
    ├── routes/
    │   └── routes.ts
    ├── shared/
    ├── app.ts                   # Inisialisasi Hono, middleware, route mounting
    └── index.ts                 # Entrypoint development server
```

---

## ⚙️ Environment Variables <a id="env-vars"></a>

Buat file `.env` dari template:

### Linux/macOS

```bash
cp .env.example .env
```

### Windows PowerShell

```powershell
Copy-Item .env.example .env
```

Contoh isi `.env`:

```env
NODE_ENV=development

APP_HOST=http://localhost
APP_PORT=9001
APP_NAME="Service Ebelanja WebFront Hono"
LOG_LEVEL=debug

# API routing:
# API_PATH=api + API_VERSION=v1       => /api/v1/blog/list
# API_PATH=frontend + API_VERSION=    => /frontend/blog/list
# API_PATH=frontend + API_VERSION=v1  => /frontend/v1/blog/list
API_PATH=frontend
API_VERSION=
DOCS_PATH=api/docs

# PostgreSQL
DATABASE_URL=postgresql://postgres:postgres@localhost:5434/ebelanja_db
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
DATABASE_ENABLE_LOGGING=false

DB_HOST=localhost
DB_PORT=5434
DB_NAME=ebelanja_db
DB_USERNAME=postgres
DB_PASSWORD=postgres

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6380
REDIS_PASSWORD=
REDIS_URL=redis://localhost:6380

# AWS S3 / MinIO
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
AWS_S3_ENDPOINT=
```

> Jangan commit file `.env` jika berisi credential asli.

---

## 🚀 Menjalankan Project

### 1. Install dependency

```bash
pnpm install
```

### 2. Jalankan PostgreSQL dan Redis lokal

Pastikan PostgreSQL dan Redis lokal berjalan sesuai konfigurasi `.env`.

Contoh default dokumentasi ini:

| Service    | Host             |
| ---------- | ---------------- |
| PostgreSQL | `localhost:5434` |
| Redis      | `localhost:6380` |

### 3. Jalankan development server

```bash
pnpm run dev
```

Server berjalan di:

```txt
http://localhost:9001
```

## 📖 API Documentation / Swagger

Swagger UI tersedia di:

```txt
http://localhost:9001/api/docs
```

OpenAPI JSON tersedia di:

```txt
http://localhost:9001/api/docs/openapi.json
```

Download OpenAPI JSON:

```bash
curl http://localhost:9001/api/docs/openapi.json -o openapi.json
```

### Catatan penting untuk Swagger `servers.url`

Jika OpenAPI paths sudah mengandung prefix seperti:

```txt
/frontend/blog/list
/api/v1/blog/list
```

maka `servers.url` di Swagger sebaiknya memakai:

```ts
servers: [
  {
    url: "/",
    description: "Current Server",
  },
];
```

Jangan set `servers.url` menjadi `/api/v1` jika path OpenAPI sudah berisi `/api/v1`, karena akan menyebabkan URL dobel:

```txt
/api/v1/api/v1/blog/list
```

---

## 🧪 Testing

Project menggunakan Vitest untuk unit test dan integration test.

### Menjalankan semua test

```bash
pnpm test
```

### Watch mode

```bash
pnpm run test:watch
```

### Coverage

```bash
pnpm run test:cov
```

### Test module saja

```bash
pnpm run test:modules
```

### Test global folder `/test`

```bash
pnpm run test:global
```

### Test integration saja

```bash
pnpm run test:integration
```

### Test module tertentu

```bash
pnpm run test:module -- src/modules/blog/
```

### Test file tertentu

```bash
pnpm run test:module -- src/modules/blog/blog.test.ts
```

### Struktur test yang disarankan

```txt
src/modules/blog/blog.test.ts        # Unit/module route test
test/integration/api.test.ts         # Global integration test via app.request()
test/helpers/setup.ts                # Global setup Vitest
test/helpers/api-case-factory.ts     # Generator request test dari OpenAPI
test/helpers/factory.ts              # Barrel export helper
```

### Catatan integration test

Integration test global memakai:

```ts
app.request();
```

Jadi tidak perlu menjalankan HTTP server secara nyata.

Test ini membaca OpenAPI JSON dari:

```txt
/api/docs/openapi.json
```

lalu mengetes endpoint yang terdokumentasi.

---

## 🔍 Linting, Formatting, dan Quality Check

| Perintah                | Fungsi                                |
| ----------------------- | ------------------------------------- |
| `pnpm run typecheck`    | Validasi TypeScript tanpa emit file   |
| `pnpm run lint`         | Jalankan Oxlint                       |
| `pnpm run lint:fix`     | Auto-fix lint issue yang didukung     |
| `pnpm run format`       | Format kode dengan Oxfmt              |
| `pnpm run format:check` | Cek format tanpa mengubah file        |
| `pnpm run check`        | `typecheck` + `lint` + `format:check` |
| `pnpm run check:fix`    | `typecheck` + `lint:fix` + `format`   |

---

---

## 📝 Development Module Baru

Checklist menambah module baru:

```text
✅ 1. Buat folder src/modules/xxx/
✅ 2. Buat xxx.dto.ts      → Zod schemas spesifik module
✅ 3. Buat xxx.controller.ts, xxx.service.ts, xxx.repository.ts
✅ 4. Buat xxx.routes.ts   → OpenAPIHono + .openapi()
✅ 5. Buat xxx.openapi.ts  → export xxxTag + route definitions
✅ 6. Buat xxx.test.ts     → Unit tests
✅ 7. Buat dan Export module di src/modules/xxx/index.ts

📝 8. Edit src/config/openapi-tags.ts:
       import { xxxTag }
       tambah ke allTags[]

📝 9. Edit src/routes/routes.ts:
       import { xxxRoutes }
       tambah routes.route('/xxx', xxxRoutes)
```

Tidak perlu edit file berikut setiap tambah module baru:

```txt
❌ src/config/swagger.ts  → JANGAN EDIT
❌ src/app.ts             → JANGAN EDIT
```

selama module baru sudah diregister di:

```txt
src/routes/routes.ts
```

---

---

## ✅ Useful Commands

```bash
# Development
pnpm install
pnpm run dev

# Production build
pnpm run build
pnpm start

# Test
pnpm test
pnpm run test:modules
pnpm run test:global
pnpm run test:integration
pnpm run test:cov

# Quality
pnpm run typecheck
pnpm run lint
pnpm run format
pnpm run check

```

---

## 📌 Default Endpoint Penting

Jika `.env` menggunakan:

```env
API_PATH=frontend
API_VERSION=
DOCS_PATH=api/docs
```

maka endpoint utama menjadi:

```txt
POST /frontend/blog/list
POST /frontend/blog/front
POST /frontend/blog/detail
```

Dokumentasi API:

```txt
GET /api/docs
GET /api/docs/openapi.json
```

Jika `.env` menggunakan:

```env
API_PATH=api
API_VERSION=v1
```

maka endpoint menjadi:

```txt
POST /api/v1/blog/list
POST /api/v1/blog/front
POST /api/v1/blog/detail
```
