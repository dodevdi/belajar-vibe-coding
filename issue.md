# 📋 Fitur: Get Current User (GET /api/users/current)

## Deskripsi

Membuat endpoint untuk mendapatkan data user yang sedang login berdasarkan token di header `Authorization`. Token dikirim dalam format `Bearer <token>`. Jika token valid (ada di tabel `sessions`), API mengembalikan data user. Jika tidak valid atau tidak ada, API mengembalikan error `"Unauthorized"`.

---

## Spesifikasi API

### `GET /api/users/current` — Get Current User

**Request Headers:**

```
Authorization: Bearer <token>
```

> `<token>` adalah UUID yang didapat saat login (`POST /api/users/login`), tersimpan di tabel `sessions`.

**Response Body (Success) — Status 200:**

```json
{
  "data": {
    "id": 1,
    "name": "dodi",
    "email": "dodi@localhost",
    "created_at": "2026-11-23T10:00:00.000Z"
  }
}
```

> Catatan: **jangan** mengembalikan field `password` di response.

**Response Body (Error — Token tidak valid / tidak ada) — Status 401:**

```json
{
  "error": "Unauthorized"
}
```

---

## Struktur Folder & File

```
src/
├── db/
│   ├── index.ts            # Koneksi database (tidak perlu diubah)
│   └── schema.ts           # Schema Drizzle (tidak perlu diubah)
├── routes/
│   └── users-route.ts      # Routing ElysiaJS (perlu ditambah endpoint GET /current)
├── services/
│   └── users-service.ts    # Logic bisnis (perlu ditambah fungsi getCurrentUser)
└── index.ts                # Entry point server (tidak perlu diubah)
```

**Konvensi penamaan file:**
- File di folder `routes/` menggunakan format: `<nama>-route.ts`
- File di folder `services/` menggunakan format: `<nama>-service.ts`

---

## Tahapan Implementasi

### Tahap 1: Tambahkan Fungsi Get Current User di Service Layer

Edit file `src/services/users-service.ts`, tambahkan fungsi baru:

1. **`getCurrentUser(token)`**
   - Terima parameter `token` (string).
   - Cari session berdasarkan `token` di tabel `sessions` menggunakan Drizzle ORM (`SELECT` dengan `WHERE token = ?`).
   - Jika session tidak ditemukan → throw error `"Unauthorized"` dengan status 401.
   - Jika session ditemukan:
     - Ambil `user_id` dari session tersebut.
     - Cari data user di tabel `users` berdasarkan `user_id` (`SELECT` dengan `WHERE id = ?`).
     - Jika user tidak ditemukan → throw error `"Unauthorized"` dengan status 401.
     - Jika user ditemukan → return objek user **tanpa field `password`**, yaitu hanya: `id`, `name`, `email`, `created_at`.

---

### Tahap 2: Tambahkan Endpoint di Route

Edit file `src/routes/users-route.ts`, tambahkan endpoint baru:

1. Daftarkan endpoint `GET /current` yang:
   - Membaca header `Authorization` dari request.
   - Parsing token dari format `Bearer <token>`:
     - Ambil value dari header `Authorization`.
     - Jika header tidak ada atau tidak dimulai dengan `"Bearer "` → set status 401, return `{ "error": "Unauthorized" }`.
     - Ambil token dengan memotong prefix `"Bearer "` (7 karakter pertama).
   - Memanggil fungsi `getCurrentUser(token)` dari service layer.
   - Jika berhasil → return `{ "data": { id, name, email, created_at } }` dengan status 200.
   - Jika error (Unauthorized) → set status 401, return `{ "error": "Unauthorized" }`.

---

### Tahap 3: Testing Manual

Jalankan server:

```bash
bun run dev
```

**Prasyarat:** Pastikan sudah ada user dan session. Registrasi lalu login:

```bash
# Registrasi
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Dodi", "email": "dodi@localhost", "password": "rahasia"}'

# Login (catat token dari response)
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email": "dodi@localhost", "password": "rahasia"}'
```

**Test get current user berhasil:**

```bash
curl -X GET http://localhost:3000/api/users/current \
  -H "Authorization: Bearer <token-dari-login>"
```

Expected response (status 200):
```json
{
  "data": {
    "id": 1,
    "name": "Dodi",
    "email": "dodi@localhost",
    "created_at": "2026-11-23T10:00:00.000Z"
  }
}
```

**Test tanpa header Authorization:**

```bash
curl -X GET http://localhost:3000/api/users/current
```

Expected response (status 401): `{ "error": "Unauthorized" }`

**Test dengan token tidak valid:**

```bash
curl -X GET http://localhost:3000/api/users/current \
  -H "Authorization: Bearer token-asal-asalan"
```

Expected response (status 401): `{ "error": "Unauthorized" }`

---

## Checklist Penyelesaian

- [x] Fungsi `getCurrentUser` ditambahkan di `src/services/users-service.ts`
- [x] Endpoint `GET /current` ditambahkan di `src/routes/users-route.ts`
- [x] Response sukses mengembalikan data user **tanpa field password** dengan status 200
- [x] Response error mengembalikan `{ "error": "Unauthorized" }` dengan status 401 jika token tidak valid
- [x] Response error mengembalikan `{ "error": "Unauthorized" }` dengan status 401 jika header Authorization tidak ada
- [x] Response error mengembalikan `{ "error": "Unauthorized" }` dengan status 401 jika token tidak ditemukan di tabel sessions
