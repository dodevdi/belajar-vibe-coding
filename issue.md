# 📋 Fitur: Login User (POST /api/users/login)

## Deskripsi

Membuat fitur login user dengan endpoint `POST /api/users/login`. Ketika login berhasil, sistem membuat session baru dengan token UUID dan menyimpannya ke tabel `sessions`. Token dikembalikan ke client sebagai response. Jika email atau password salah, API mengembalikan pesan error.

---

## Spesifikasi Tabel Database

### Tabel `sessions` (baru)

| Kolom        | Tipe           | Constraint                     |
|--------------|----------------|--------------------------------|
| `id`         | INTEGER        | PRIMARY KEY, AUTO INCREMENT    |
| `token`      | VARCHAR(255)   | NOT NULL (isinya UUID)         |
| `user_id`    | INTEGER        | FOREIGN KEY → `users.id`       |
| `created_at` | TIMESTAMP      | DEFAULT CURRENT_TIMESTAMP      |

---

## Spesifikasi API

### `POST /api/users/login` — Login User

**Request Body:**

```json
{
  "email": "dodi@localhost",
  "password": "rahasia"
}
```

**Response Body (Success) — Status 200:**

```json
{
  "data": "token"
}
```

> Nilai `"token"` adalah string UUID yang baru di-generate, contoh: `"550e8400-e29b-41d4-a716-446655440000"`

**Response Body (Error — Email atau password salah) — Status 401:**

```json
{
  "error": "Email atau password salah"
}
```

---

## Struktur Folder & File

```
src/
├── db/
│   ├── index.ts            # Koneksi database (sudah ada)
│   └── schema.ts           # Definisi schema Drizzle (perlu ditambah tabel sessions)
├── routes/
│   └── users-route.ts      # Routing ElysiaJS (perlu ditambah endpoint login)
├── services/
│   └── users-service.ts    # Logic bisnis (perlu ditambah fungsi loginUser)
└── index.ts                # Entry point server (tidak perlu diubah)
```

**Konvensi penamaan file:**
- File di folder `routes/` menggunakan format: `<nama>-route.ts`
- File di folder `services/` menggunakan format: `<nama>-service.ts`

---

## Tahapan Implementasi

### Tahap 1: Update Schema Database

Edit file `src/db/schema.ts`:

- Tambahkan definisi tabel baru `sessions` menggunakan Drizzle ORM dengan kolom:
  - `id` — serial, primary key
  - `token` — varchar(255), not null
  - `userId` — integer, foreign key yang mereferensi `users.id`
  - `createdAt` — timestamp, default now
- Pastikan relasi foreign key dari `sessions.userId` ke `users.id` terdefinisi.

Setelah schema diupdate, jalankan:

```bash
bun run db:generate
bun run db:migrate
```

---

### Tahap 2: Tambahkan Fungsi Login di Service Layer

Edit file `src/services/users-service.ts`, tambahkan fungsi baru:

1. **`loginUser(email, password)`**
   - Cari user berdasarkan `email` di tabel `users` menggunakan Drizzle ORM (`SELECT` dengan `WHERE email = ?`).
   - Jika user tidak ditemukan → throw error `"Email atau password salah"`.
   - Jika user ditemukan:
     - Bandingkan `password` yang dikirim dengan hash password di database menggunakan `bcryptjs` (`bcrypt.compare()`).
     - Jika password tidak cocok → throw error `"Email atau password salah"`.
     - Jika password cocok:
       - Generate token UUID baru menggunakan `crypto.randomUUID()` (bawaan runtime, tidak perlu install package tambahan).
       - Insert data session baru ke tabel `sessions` (token, user_id).
       - Return token UUID tersebut.

---

### Tahap 3: Tambahkan Endpoint Login di Route

Edit file `src/routes/users-route.ts`, tambahkan endpoint baru:

1. Daftarkan endpoint `POST /login` yang:
   - Menerima request body dengan validasi menggunakan `t.Object()`:
     - `email`: `t.String()` (dengan pattern validasi email)
     - `password`: `t.String({ minLength: 1 })`
   - Memanggil fungsi `loginUser()` dari service layer.
   - Jika berhasil → return `{ "data": "<token UUID>" }` dengan status 200.
   - Jika error (email/password salah) → set status 401, return `{ "error": "Email atau password salah" }`.

---

### Tahap 4: Testing Manual

Jalankan server:

```bash
bun run dev
```

**Prasyarat:** Pastikan sudah ada user terdaftar di database. Jika belum, registrasi dulu:

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Dodi", "email": "dodi@localhost", "password": "rahasia"}'
```

**Test login berhasil:**

```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email": "dodi@localhost", "password": "rahasia"}'
```

Expected response (status 200): `{ "data": "550e8400-e29b-41d4-a716-446655440000" }` (UUID random)

**Test login gagal (password salah):**

```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email": "dodi@localhost", "password": "salah"}'
```

Expected response (status 401): `{ "error": "Email atau password salah" }`

**Test login gagal (email tidak terdaftar):**

```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email": "tidak@ada", "password": "rahasia"}'
```

Expected response (status 401): `{ "error": "Email atau password salah" }`

---

## Checklist Penyelesaian

- [x] Tabel `sessions` didefinisikan di `src/db/schema.ts` dengan FK ke `users.id`
- [x] Migration database berhasil di-generate dan dijalankan
- [x] Fungsi `loginUser` ditambahkan di `src/services/users-service.ts`
- [x] Endpoint `POST /login` ditambahkan di `src/routes/users-route.ts`
- [x] Test login berhasil mengembalikan `{ "data": "<token>" }` dengan status 200
- [x] Test login dengan password salah mengembalikan `{ "error": "Email atau password salah" }` dengan status 401
- [x] Test login dengan email tidak terdaftar mengembalikan `{ "error": "Email atau password salah" }` dengan status 401
