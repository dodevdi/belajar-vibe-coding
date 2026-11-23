# 📋 Fitur: Logout User (DELETE /api/users/logout)

## Deskripsi

Membuat endpoint untuk logout user. Ketika logout berhasil, data session dengan token tersebut dihapus dari tabel `sessions`. Jika token tidak valid atau tidak ada, API mengembalikan error `"Unauthorized"`.

---

## Spesifikasi API

### `DELETE /api/users/logout` — Logout User

**Request Headers:**

```
Authorization: Bearer <token>
```

> `<token>` adalah UUID yang didapat saat login (`POST /api/users/login`), tersimpan di tabel `sessions`.

**Response Body (Success) — Status 200:**

```json
{
  "data": "OK"
}
```

> Ketika berhasil logout, data session dengan token tersebut **harus dihapus** dari tabel `sessions`.

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
│   └── users-route.ts      # Routing ElysiaJS (perlu ditambah endpoint DELETE /logout)
├── services/
│   └── users-service.ts    # Logic bisnis (perlu ditambah fungsi logoutUser)
└── index.ts                # Entry point server (tidak perlu diubah)
```

**Konvensi penamaan file:**
- File di folder `routes/` menggunakan format: `<nama>-route.ts`
- File di folder `services/` menggunakan format: `<nama>-service.ts`

---

## Tahapan Implementasi

### Tahap 1: Tambahkan Fungsi Logout di Service Layer

Edit file `src/services/users-service.ts`, tambahkan fungsi baru:

1. **`logoutUser(token)`**
   - Terima parameter `token` (string).
   - Cari session berdasarkan `token` di tabel `sessions` menggunakan Drizzle ORM (`SELECT` dengan `WHERE token = ?`).
   - Jika session tidak ditemukan → throw error `"Unauthorized"` dengan status 401.
   - Jika session ditemukan:
     - Hapus session tersebut dari tabel `sessions` (`DELETE` dengan `WHERE token = ?`).
     - Return `"OK"`.

---

### Tahap 2: Tambahkan Endpoint Logout di Route

Edit file `src/routes/users-route.ts`, tambahkan endpoint baru:

1. Daftarkan endpoint `DELETE /logout` yang:
   - Membaca header `Authorization` dari request.
   - Parsing token dari format `Bearer <token>`:
     - Ambil value dari header `Authorization`.
     - Jika header tidak ada atau tidak dimulai dengan `"Bearer "` → set status 401, return `{ "error": "Unauthorized" }`.
     - Ambil token dengan memotong prefix `"Bearer "` (7 karakter pertama).
   - Memanggil fungsi `logoutUser(token)` dari service layer.
   - Jika berhasil → return `{ "data": "OK" }` dengan status 200.
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

**Test logout berhasil:**

```bash
curl -X DELETE http://localhost:3000/api/users/logout \
  -H "Authorization: Bearer <token-dari-login>"
```

Expected response (status 200): `{ "data": "OK" }`

**Verifikasi session sudah dihapus (gunakan token yang sama untuk get current user):**

```bash
curl -X GET http://localhost:3000/api/users/current \
  -H "Authorization: Bearer <token-dari-login>"
```

Expected response (status 401): `{ "error": "Unauthorized" }` — karena session sudah dihapus.

**Test logout tanpa header Authorization:**

```bash
curl -X DELETE http://localhost:3000/api/users/logout
```

Expected response (status 401): `{ "error": "Unauthorized" }`

**Test logout dengan token tidak valid:**

```bash
curl -X DELETE http://localhost:3000/api/users/logout \
  -H "Authorization: Bearer token-asal-asalan"
```

Expected response (status 401): `{ "error": "Unauthorized" }`

---

## Checklist Penyelesaian

- [x] Fungsi `logoutUser` ditambahkan di `src/services/users-service.ts`
- [x] Endpoint `DELETE /logout` ditambahkan di `src/routes/users-route.ts`
- [x] Logout berhasil menghapus data session dari tabel `sessions`
- [x] Response sukses mengembalikan `{ "data": "OK" }` dengan status 200
- [x] Response error mengembalikan `{ "error": "Unauthorized" }` dengan status 401 jika header Authorization tidak ada
- [x] Response error mengembalikan `{ "error": "Unauthorized" }` dengan status 401 jika token tidak ditemukan di tabel sessions
- [x] Setelah logout, token yang sama tidak bisa digunakan lagi untuk mengakses `GET /api/users/current`
