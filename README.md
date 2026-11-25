# Belajar Vibe Coding — Backend API

Aplikasi backend RESTful API untuk manajemen pengguna (*user management*) dan autentikasi berbasis *session token* (`Bearer Token`). Proyek ini dibangun menggunakan **Bun**, **ElysiaJS**, **Drizzle ORM**, dan **MySQL** dengan pendekatan arsitektur berlapis (*layered architecture*) yang memisahkan layer routing, business logic, utility, dan akses database.

---

## 📚 Daftar Isi

- [Tentang Aplikasi](#-tentang-aplikasi)
- [Technology Stack & Library](#-technology-stack--library)
- [Arsitektur & Struktur Folder](#-arsitektur--struktur-folder)
- [Schema Database](#-schema-database)
- [Daftar Endpoint API](#-daftar-endpoint-api)
- [Cara Setup Project](#-cara-setup-project)
- [Cara Menjalankan Aplikasi](#-cara-menjalankan-aplikasi)
- [Cara Menjalankan Test & Typecheck](#-cara-menjalankan-test--typecheck)

---

## 📖 Tentang Aplikasi

Aplikasi ini menyediakan layanan backend untuk:
1. **Registrasi Pengguna** dengan validasi input ketat dan penyimpanan password terenkripsi menggunakan `bcrypt`.
2. **Autentikasi Login** yang menghasilkan token sesi acak berbasis UUID (`crypto.randomUUID()`) dan menyimpannya ke database.
3. **Informasi Pengguna Aktif (`Current User`)** yang dilindungi oleh autentikasi `Authorization: Bearer <token>` tanpa mengekspos field sensitif seperti password.
4. **Logout** yang menghapus sesi token aktif dari database sehingga token tidak dapat digunakan kembali.
5. **CRUD Users Dasar** (`/users`) untuk pengelolaan data resource user secara langsung.

---

## 🛠️ Technology Stack & Library

### Core Stack
| Teknologi | Keterangan |
|-----------|------------|
| **Runtime** | [Bun](https://bun.sh/) (JavaScript/TypeScript runtime & test runner) |
| **Bahasa** | TypeScript (`strict: true`, target `ESNext`) |
| **Web Framework** | [ElysiaJS](https://elysiajs.com/) (`^1.4.32`) |
| **Database** | MySQL |
| **ORM & Migration** | [Drizzle ORM](https://orm.drizzle.team/) (`^0.45.4`) & Drizzle Kit (`^0.31.11`) |

### Dependencies & Libraries
| Package | Versi | Fungsi |
|---------|-------|--------|
| `elysia` | `^1.4.32` | HTTP framework, routing, middleware error handling, & validasi request (`t` / TypeBox) |
| `drizzle-orm` | `^0.45.4` | Query builder type-safe dan pemetaan schema tabel MySQL |
| `mysql2` | `^3.24.6` | Driver koneksi MySQL (`mysql2/promise` connection pool) |
| `bcryptjs` | `^3.0.3` | Hashing dan verifikasi password user (cost factor `10`) |
| `drizzle-kit` | `^0.31.11` | CLI untuk generate file migrasi SQL dan mengeksekusi migrasi *(devDependency)* |
| `@types/bcryptjs` | `^2.4.6` | Type definition TypeScript untuk `bcryptjs` *(devDependency)* |
| `@types/bun` | `latest` | Type definition untuk API bawaan Bun dan `bun:test` *(devDependency)* |

---

## 🏗️ Arsitektur & Struktur Folder

Aplikasi ini menerapkan **Layered Architecture** untuk memisahkan tanggung jawab antar komponen:

1. **Entry Point (`src/index.ts`)**: Menginisialisasi server Elysia, menangani error global (`NOT_FOUND`, `VALIDATION`, `PARSE`, `500`), menggabungkan semua modul route, serta menjalankan listener HTTP pada `PORT`.
2. **Route / Presentation Layer (`src/routes/`)**: Mendefinisikan path endpoint, skema validasi input (menggunakan Elysia `t`), ekstraksi header otorisasi, serta mengonversi error bisnis (`UserServiceError`) menjadi HTTP status code yang sesuai.
3. **Service / Business Logic Layer (`src/services/`)**: Menangani aturan bisnis inti (validasi email unik, hashing password, pencocokan kredensial, pembuatan/penghapusan session) tanpa terikat langsung dengan objek HTTP request/response.
4. **Utility Layer (`src/utils/`)**: Berisi fungsi helper yang dapat digunakan ulang di berbagai route (seperti parsing `Bearer` token).
5. **Database Layer (`src/db/`)**: Mengelola connection pool MySQL dan mendefinisikan struktur tabel serta tipe data hasil inferensi Drizzle.
6. **Migrations (`drizzle/`)**: Menyimpan riwayat skema database dalam bentuk file migrasi SQL dan metadata snapshot JSON.
7. **Tests (`tests/`)**: Berisi integration/unit test untuk setiap endpoint menggunakan `bun:test`.

### Konvensi Penamaan File
- Menggunakan gaya **kebab-case** dengan suffix peran file, misalnya:
  - Route: `<resource>-route.ts` (contoh: `users-route.ts`)
  - Service: `<resource>-service.ts` (contoh: `users-service.ts`)
  - Test: `<resource>-<fitur>.test.ts` (contoh: `users-registration.test.ts`, `users-login.test.ts`)

### Struktur Direktori
```text
belajar-vibe-coding/
├── drizzle/                        # File migrasi SQL & metadata snapshot Drizzle
│   ├── meta/                       # Snapshot JSON & _journal.json
│   ├── 0000_past_dagger.sql
│   ├── 0001_typical_toad_men.sql
│   ├── 0002_magenta_tombstone.sql
│   └── 0003_boring_mauler.sql
├── src/
│   ├── db/
│   │   ├── index.ts                # Inisialisasi mysql2 pool & instance Drizzle db
│   │   └── schema.ts               # Definisi tabel MySQL (users & sessions)
│   ├── routes/
│   │   ├── index.ts                # Penggabung sub-route CRUD dasar
│   │   ├── users-route.ts          # Endpoint API auth & profile (/api/users/*)
│   │   └── users.ts                # Endpoint CRUD dasar (/users/*)
│   ├── services/
│   │   └── users-service.ts        # Business logic registrasi, login, current user, logout
│   ├── utils/
│   │   └── auth.ts                 # Helper extractBearerToken untuk validasi header Auth
│   └── index.ts                    # Entry point aplikasi & global error handler
├── tests/
│   ├── users-current.test.ts       # Test suite GET /api/users/current
│   ├── users-login.test.ts         # Test suite POST /api/users/login
│   ├── users-logout.test.ts        # Test suite DELETE /api/users/logout
│   └── users-registration.test.ts  # Test suite POST /api/users
├── .editorconfig                   # Standarisasi indentasi (2 spaces), charset UTF-8, LF
├── .env.example                    # Template environment variables
├── .gitignore
├── bun.lock
├── drizzle.config.ts               # Konfigurasi Drizzle Kit (dialect MySQL & path migrasi)
├── package.json                    # Metadata project, dependencies, dan npm/bun scripts
└── tsconfig.json                   # Konfigurasi compiler TypeScript
```

---

## 🗄️ Schema Database

Skema database didefinisikan di `src/db/schema.ts` untuk database MySQL dan terdiri dari dua tabel utama:

### 1. Tabel `users`
Menyimpan data akun pengguna terdaftar.

| Kolom | Tipe Data (MySQL) | Constraint | Keterangan |
|-------|-------------------|------------|------------|
| `id` | `serial` (`bigint unsigned`) | `PRIMARY KEY`, `AUTO_INCREMENT` | ID unik pengguna |
| `name` | `varchar(255)` | `NOT NULL` | Nama lengkap pengguna |
| `email` | `varchar(255)` | `NOT NULL`, `UNIQUE` | Alamat email unik pengguna |
| `password` | `varchar(255)` | `NOT NULL` | Hash password menggunakan `bcryptjs` |
| `created_at` | `timestamp` | `NOT NULL`, `DEFAULT now()` | Waktu pembuatan akun |

### 2. Tabel `sessions`
Menyimpan token sesi aktif milik pengguna yang sedang login.

| Kolom | Tipe Data (MySQL) | Constraint | Keterangan |
|-------|-------------------|------------|------------|
| `id` | `serial` (`bigint unsigned`) | `PRIMARY KEY`, `AUTO_INCREMENT` | ID unik sesi |
| `token` | `varchar(255)` | `NOT NULL`, `UNIQUE` | Token sesi UUID yang dikirim sebagai Bearer token |
| `user_id` | `bigint unsigned` | `NOT NULL`, `FOREIGN KEY -> users(id)` | Referensi ID pemilik sesi |
| `created_at` | `timestamp` | `NOT NULL`, `DEFAULT now()` | Waktu sesi dibuat |

**Relasi:** Satu `users` dapat memiliki banyak `sessions` (*One-to-Many*), memungkinkan pengguna login dari beberapa perangkat secara bersamaan dan logout per sesi token.

---

## 📡 Daftar Endpoint API

Server berjalan secara default di `http://localhost:3000`.

### Global Health Check
- **`GET /`**
  - **Response `200 OK`**:
    ```json
    { "status": "ok" }
    ```

### Auth & User Management (`/api/users`)

#### 1. Registrasi User Baru
- **Endpoint**: `POST /api/users`
- **Validasi Body (JSON)**:
  - `name`: string (`minLength: 1`, `maxLength: 255`)
  - `email`: string (format email valid, `maxLength: 255`)
  - `password`: string (`minLength: 1`, `maxLength: 255`)
- **Contoh Request**:
  ```json
  {
    "name": "Budi Santoso",
    "email": "budi@example.com",
    "password": "passwordRahasia123"
  }
  ```
- **Response `200 OK`**:
  ```json
  { "data": "OK" }
  ```
- **Error Responses**:
  - `400 Bad Request`: `{ "error": "Email sudah terdaftar" }` jika email duplikat.
  - `400 Bad Request`: `{ "status": 400, "message": "Validation Error", "details": [...] }` jika format/panjang input tidak sesuai.

#### 2. Login User
- **Endpoint**: `POST /api/users/login`
- **Validasi Body (JSON)**:
  - `email`: string (format email valid)
  - `password`: string (`minLength: 1`)
- **Contoh Request**:
  ```json
  {
    "email": "budi@example.com",
    "password": "passwordRahasia123"
  }
  ```
- **Response `200 OK`**: Mengembalikan UUID session token.
  ```json
  { "data": "550e8400-e29b-41d4-a716-446655440000" }
  ```
- **Error Responses**:
  - `401 Unauthorized`: `{ "error": "Email atau password salah" }` jika email tidak ditemukan atau password tidak cocok.
  - `400 Bad Request`: Jika validasi input gagal.

#### 3. Get Current User
- **Endpoint**: `GET /api/users/current`
- **Header Wajib**: `Authorization: Bearer <token>`
- **Response `200 OK`**: Mengembalikan profil user aktif tanpa field `password`.
  ```json
  {
    "data": {
      "id": 1,
      "name": "Budi Santoso",
      "email": "budi@example.com",
      "createdAt": "2026-11-25T03:00:00.000Z",
      "created_at": "2026-11-25T03:00:00.000Z"
    }
  }
  ```
- **Error Responses**:
  - `401 Unauthorized`: `{ "error": "Unauthorized" }` jika header tidak ada, skema bukan `Bearer`, atau token tidak valid/sudah logout.

#### 4. Logout User
- **Endpoint**: `DELETE /api/users/logout`
- **Header Wajib**: `Authorization: Bearer <token>`
- **Response `200 OK`**: Menghapus session dari database sehingga token tidak berlaku lagi.
  ```json
  { "data": "OK" }
  ```
- **Error Responses**:
  - `401 Unauthorized`: `{ "error": "Unauthorized" }` jika header tidak valid atau token tidak ditemukan di database.

### Users CRUD Dasar (`/users`)
Endpoint CRUD langsung ke tabel `users` (didefinisikan di `src/routes/users.ts`):
- `GET /users` — Mengambil seluruh daftar user.
- `GET /users/:id` — Mengambil detail user berdasarkan `id` numerik (`404` jika tidak ditemukan).
- `POST /users` — Membuat user baru (`name`, `email`, optional `password`) dengan response `201`.
- `PUT /users/:id` — Memperbarui `name` / `email` user berdasarkan `id`.
- `DELETE /users/:id` — Menghapus user berdasarkan `id`.

### Format Global Error
Selain error bisnis (`UserServiceError`), `src/index.ts` menangani error level framework secara seragam:
- **`404 Not Found`**: `{ "status": 404, "message": "Route not found" }`
- **`400 Validation Error`**: `{ "status": 400, "message": "Validation Error", "details": [...] }`
- **`400 Bad Request` (Malformed JSON / Parse Error)**: `{ "status": 400, "message": "Bad Request" }`
- **`500 Internal Server Error`**: `{ "status": 500, "message": "..." }`

---

## ⚙️ Cara Setup Project

### 1. Prasyarat
Pastikan perangkat sudah terinstal:
- **[Bun](https://bun.sh/)** (cek dengan `bun --version`)
- **MySQL Server** yang aktif (port default `3306`)

### 2. Clone & Install Dependensi
```bash
git clone https://github.com/dodevdi/belajar-vibe-coding.git
cd belajar-vibe-coding
bun install
```

### 3. Konfigurasi Environment Variable
Salin template `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Sesuaikan nilai di `.env` sesuai konfigurasi MySQL lokal Anda:
```env
PORT=3000
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=root
DATABASE_PASSWORD=
DATABASE_NAME=belajar_vibe_coding
```

### 4. Buat Database & Jalankan Migrasi
Buat database di MySQL terlebih dahulu:
```sql
CREATE DATABASE IF NOT EXISTS belajar_vibe_coding;
```
Lalu terapkan file migrasi Drizzle yang sudah tersedia di folder `drizzle/`:
```bash
bun run db:migrate
```
*(Opsional)* Jika Anda mengubah skema di `src/db/schema.ts`, generate migrasi baru terlebih dahulu sebelum migrate:
```bash
bun run db:generate
bun run db:migrate
```

---

## ▶️ Cara Menjalankan Aplikasi

- **Mode Development** (dengan hot-reload `bun --watch`):
  ```bash
  bun run dev
  ```
- **Mode Production**:
  ```bash
  bun run start
  ```

Jika berhasil, terminal akan menampilkan:
```text
🦊 Elysia server is running at http://localhost:3000
```

---

## 🧪 Cara Test Aplikasi

Pengujian dijalankan menggunakan test runner bawaan Bun (`bun:test`). Karena test berinteraksi langsung dengan database MySQL melalui `app.handle(...)`, pastikan **MySQL server berjalan** dan **migrasi database sudah diterapkan** sebelum menjalankan test.

### Menjalankan Seluruh Test Suite
```bash
bun test
# atau
bun run test
```

### Menjalankan File Test Tertentu
```bash
bun test tests/users-registration.test.ts
bun test tests/users-login.test.ts
bun test tests/users-current.test.ts
bun test tests/users-logout.test.ts
```

### Menjalankan Type Checking
Pastikan tidak ada error TypeScript di seluruh proyek:
```bash
bun run typecheck
# atau
bun check
```

### Cakupan Test Saat Ini (31 Skenario)
Setiap file test membersihkan datanya melalui `beforeAll` dan `afterAll` serta memakai email unik sehingga terisolasi dan idempoten:
- `tests/users-registration.test.ts` — 10 skenario (registrasi sukses, duplikat email, validasi field kosong/missing/format/maxLength 255, verifikasi hash bcrypt, payload kosong/bukan JSON).
- `tests/users-login.test.ts` — 9 skenario (login sukses, format UUID token, session tersimpan di DB, email tidak terdaftar, password salah, validasi field/format, payload kosong/bukan JSON).
- `tests/users-current.test.ts` — 6 skenario (data profil valid, field password tidak bocor, header Auth kosong/non-Bearer, token invalid, token yang sudah logout).
- `tests/users-logout.test.ts` — 6 skenario (logout sukses, session terhapus di DB, token tidak dapat dipakai ulang ke `/current`, header Auth kosong/non-Bearer, token invalid).
