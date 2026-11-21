# 📋 Project Setup: Bun + ElysiaJS + Drizzle + MySQL

## Deskripsi

Membuat project backend API baru menggunakan **Bun** sebagai runtime, **ElysiaJS** sebagai web framework, **Drizzle ORM** untuk database layer, dan **MySQL** sebagai database.

---

## Issue 1: Inisialisasi Project

- Jalankan `bun init` di folder project
- Install dependency utama:
  - `elysia` — web framework
  - `drizzle-orm` — ORM
  - `mysql2` — MySQL driver
- Install dev dependency:
  - `drizzle-kit` — CLI tool untuk migrasi & generate schema Drizzle
- Setup script di `package.json`:
  - `dev` — jalankan server dalam mode development (watch/hot-reload)
  - `db:generate` — generate migration file dari schema Drizzle
  - `db:migrate` — jalankan migration ke database
- Buat struktur folder dasar:
  ```
  src/
  ├── index.ts          # Entry point, setup ElysiaJS server
  ├── db/
  │   ├── index.ts      # Koneksi database (Drizzle + mysql2)
  │   └── schema.ts     # Definisi tabel Drizzle
  ├── routes/
  │   └── index.ts      # Kumpulan route API
  └── drizzle.config.ts # Konfigurasi Drizzle Kit
  ```

---

## Issue 2: Setup Koneksi Database

- Buat file konfigurasi Drizzle (`drizzle.config.ts`) yang membaca credential dari environment variable
- Buat file koneksi database (`src/db/index.ts`) menggunakan `mysql2` + `drizzle-orm`
- Buat file `.env.example` dengan variabel:
  - `DATABASE_HOST`
  - `DATABASE_PORT`
  - `DATABASE_USER`
  - `DATABASE_PASSWORD`
  - `DATABASE_NAME`
- Tambahkan `.env` ke `.gitignore`

---

## Issue 3: Definisi Schema & Migrasi

- Buat minimal 1 tabel contoh di `src/db/schema.ts` (misalnya tabel `users` dengan kolom `id`, `name`, `email`, `created_at`)
- Generate migration file menggunakan Drizzle Kit
- Pastikan migration bisa dijalankan dan tabel terbuat di MySQL

---

## Issue 4: Setup ElysiaJS Server

- Buat entry point di `src/index.ts`
- Setup ElysiaJS app dengan:
  - Port dari environment variable (default `3000`)
  - Route health check: `GET /` → `{ status: "ok" }`
- Pastikan server bisa dijalankan dengan `bun run dev`

---

## Issue 5: CRUD API Dasar

- Buat route CRUD untuk tabel contoh (`users`):
  - `GET /users` — ambil semua data
  - `GET /users/:id` — ambil data by ID
  - `POST /users` — tambah data baru
  - `PUT /users/:id` — update data
  - `DELETE /users/:id` — hapus data
- Semua route menggunakan Drizzle ORM untuk query ke database
- Gunakan fitur validation bawaan ElysiaJS (`t.Object(...)`) untuk validasi request body

---

## Issue 6: Error Handling & Finishing

- Tambahkan global error handler di ElysiaJS
- Pastikan response error konsisten (format JSON dengan `message` dan `status`)
- Tambahkan `README.md` dengan instruksi:
  - Cara install dependency
  - Cara setup database
  - Cara menjalankan migration
  - Cara menjalankan server
