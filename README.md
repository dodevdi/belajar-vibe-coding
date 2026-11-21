# Belajar Vibe Coding - Backend API

Proyek backend RESTful API menggunakan **Bun**, **ElysiaJS**, **Drizzle ORM**, dan **MySQL**.

## 🚀 Fitur & Stack

- **Runtime**: [Bun](https://bun.sh/)
- **Framework**: [ElysiaJS](https://elysiajs.com/)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Database**: MySQL (`mysql2`)
- **Validasi**: Schema validation bawaan ElysiaJS (`TypeBox`)

---

## 📁 Struktur Folder

```text
├── drizzle/              # Folder migrasi SQL hasil generate Drizzle
├── src/
│   ├── db/
│   │   ├── index.ts      # Koneksi database MySQL dengan Drizzle ORM
│   │   └── schema.ts     # Definisi schema tabel database
│   ├── routes/
│   │   ├── index.ts      # Router utama penggabung semua sub-routes
│   │   └── users.ts      # CRUD endpoints untuk resource users
│   └── index.ts          # Entry point server ElysiaJS
├── .env.example          # Template konfigurasi environment variable
├── drizzle.config.ts     # Konfigurasi Drizzle Kit (migrasi & schema)
├── package.json          # Dependency dan script runner
└── tsconfig.json         # Konfigurasi TypeScript untuk Bun
```

---

## 🛠️ Instalasi & Menjalankan Proyek

### 1. Prasyarat
Pastikan [Bun](https://bun.sh/) sudah terinstal di komputer:
```bash
bun --version
```

### 2. Install Dependensi
```bash
bun install
```

### 3. Setup Environment Variable
Salin file `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Sesuaikan konfigurasi database MySQL:
```env
PORT=3000
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=root
DATABASE_PASSWORD=your_password
DATABASE_NAME=belajar_vibe_coding
```

### 4. Setup Database & Migrasi
Buat database di MySQL terlebih dahulu jika belum ada:
```sql
CREATE DATABASE IF NOT EXISTS belajar_vibe_coding;
```

Jalankan perintah generate file migrasi SQL:
```bash
bun run db:generate
```

Jalankan migrasi ke database MySQL:
```bash
bun run db:migrate
```

### 5. Menjalankan Server
Mode Development (dengan hot-reload):
```bash
bun run dev
```

Mode Production:
```bash
bun run start
```

Server akan aktif secara default di `http://localhost:3000`.

---

## 📡 Daftar Endpoint API

### Health Check
- `GET /` — Cek status server (`{ "status": "ok" }`)

### Users CRUD
- `GET /users` — Ambil semua daftar user
- `GET /users/:id` — Ambil detail user berdasarkan ID
- `POST /users` — Tambah user baru
  - Body (JSON):
    ```json
    {
      "name": "John Doe",
      "email": "john@example.com"
    }
    ```
- `PUT /users/:id` — Perbarui data user
  - Body (JSON, opsional):
    ```json
    {
      "name": "John Updated",
      "email": "john.updated@example.com"
    }
    ```
- `DELETE /users/:id` — Hapus user berdasarkan ID
