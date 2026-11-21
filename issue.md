# 📋 Fitur: Registrasi User Baru

## Deskripsi

Membuat fitur registrasi user baru dengan endpoint `POST /api/users`. Password user di-hash menggunakan **bcrypt** sebelum disimpan ke database. Jika email sudah terdaftar, API mengembalikan pesan error.

---

## Spesifikasi Tabel Database

### Tabel `users`

| Kolom        | Tipe           | Constraint                     |
|--------------|----------------|--------------------------------|
| `id`         | INTEGER        | PRIMARY KEY, AUTO INCREMENT    |
| `name`       | VARCHAR(255)   | NOT NULL                       |
| `email`      | VARCHAR(255)   | NOT NULL, UNIQUE               |
| `password`   | VARCHAR(255)   | NOT NULL (hash bcrypt)         |
| `created_at` | TIMESTAMP      | DEFAULT CURRENT_TIMESTAMP      |

---

## Spesifikasi API

### `POST /api/users` — Registrasi User Baru

**Request Body:**

```json
{
  "name": "Dodi",
  "email": "dodi@localhost",
  "password": "rahasia"
}
```

**Response Body (Success) — Status 200:**

```json
{
  "data": "OK"
}
```

**Response Body (Error — Email sudah terdaftar) — Status 400:**

```json
{
  "error": "Email sudah terdaftar"
}
```

---

## Struktur Folder & File

```
src/
├── db/
│   ├── index.ts            # Koneksi database (sudah ada)
│   └── schema.ts           # Definisi schema Drizzle (perlu diupdate)
├── routes/
│   └── users-route.ts      # Routing ElysiaJS untuk endpoint users
├── services/
│   └── users-service.ts    # Logic bisnis: validasi & simpan user
└── index.ts                # Entry point server (perlu diupdate)
```

**Konvensi penamaan file:**
- File di folder `routes/` menggunakan format: `<nama>-route.ts`
- File di folder `services/` menggunakan format: `<nama>-service.ts`

---

## Tahapan Implementasi

### Tahap 1: Install Dependency Tambahan

Install library bcrypt untuk hashing password:

```bash
bun add bcryptjs
bun add -d @types/bcryptjs
```

> Gunakan `bcryptjs` (versi pure JS) agar kompatibel dengan Bun tanpa perlu native build.

---

### Tahap 2: Update Schema Database

Edit file `src/db/schema.ts`:

- Tambahkan kolom `password` bertipe `varchar(255)`, NOT NULL, pada tabel `users`.
- Pastikan kolom `email` memiliki constraint UNIQUE.
- Kolom yang harus ada: `id`, `name`, `email`, `password`, `created_at`.

Setelah schema diupdate, jalankan:

```bash
bun run db:generate
bun run db:migrate
```

---

### Tahap 3: Buat Service Layer

Buat file baru `src/services/users-service.ts`.

File ini berisi fungsi-fungsi logic bisnis:

1. **`registerUser(name, email, password)`**
   - Cek apakah email sudah ada di database menggunakan Drizzle ORM (`SELECT` dengan `WHERE email = ?`).
   - Jika email sudah ada → throw error atau return objek error `"Email sudah terdaftar"`.
   - Jika email belum ada:
     - Hash password menggunakan `bcryptjs` dengan salt rounds 10.
     - Insert data user baru ke tabel `users` (name, email, hashed password).
     - Return `"OK"`.

---

### Tahap 4: Buat Route

Buat file baru `src/routes/users-route.ts`.

File ini berisi definisi endpoint ElysiaJS:

1. Buat instance `Elysia` dengan prefix `/api/users`.
2. Daftarkan endpoint `POST /` yang:
   - Menerima request body dengan validasi menggunakan `t.Object()`:
     - `name`: `t.String({ minLength: 1 })`
     - `email`: `t.String({ format: "email" })`
     - `password`: `t.String({ minLength: 1 })`
   - Memanggil fungsi `registerUser()` dari service layer.
   - Jika berhasil → return `{ "data": "OK" }`.
   - Jika error (email sudah terdaftar) → set status 400, return `{ "error": "Email sudah terdaftar" }`.

---

### Tahap 5: Daftarkan Route ke Server

Edit file `src/index.ts`:

- Import `usersRoute` dari `src/routes/users-route.ts`.
- Daftarkan route menggunakan `.use(usersRoute)`.

---

### Tahap 6: Testing Manual

Jalankan server:

```bash
bun run dev
```

Test endpoint menggunakan curl atau tool HTTP client:

**Test registrasi berhasil:**

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Dodi", "email": "dodi@localhost", "password": "rahasia"}'
```

Expected response: `{ "data": "OK" }`

**Test registrasi gagal (email duplikat):**

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Dodi", "email": "dodi@localhost", "password": "rahasia"}'
```

Expected response (status 400): `{ "error": "Email sudah terdaftar" }`

---

## Checklist Penyelesaian

- [x] Dependency `bcryptjs` dan `@types/bcryptjs` terinstall
- [x] Schema tabel `users` sudah include kolom `password`
- [x] Migration database berhasil dijalankan
- [x] File `src/services/users-service.ts` dibuat dengan fungsi `registerUser`
- [x] File `src/routes/users-route.ts` dibuat dengan endpoint `POST /api/users`
- [x] Route terdaftar di `src/index.ts`
- [x] Test registrasi berhasil mengembalikan `{ "data": "OK" }`
- [x] Test email duplikat mengembalikan `{ "error": "Email sudah terdaftar" }` dengan status 400
