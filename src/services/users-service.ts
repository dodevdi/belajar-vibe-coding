import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users, sessions } from "../db/schema";

export interface RegisterUserInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginUserInput {
  email: string;
  password: string;
}

export interface CurrentUserResponse {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
  created_at: Date;
}

/**
 * Error khusus untuk lapisan service users.
 *
 * Digunakan untuk membedakan error bisnis (seperti "Email sudah terdaftar"
 * atau "Unauthorized") dari error sistem yang tidak terduga.
 * Property `statusCode` digunakan oleh route handler untuk menentukan
 * HTTP status code yang dikembalikan ke client.
 */
export class UserServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = "UserServiceError";
    this.statusCode = statusCode;
  }
}

/**
 * Mendaftarkan user baru ke dalam sistem.
 *
 * Proses:
 * 1. Memeriksa apakah email sudah terdaftar di tabel `users`.
 *    Jika sudah ada, melempar `UserServiceError` dengan status 400.
 * 2. Meng-hash password menggunakan bcrypt (cost factor 10) sebelum disimpan.
 * 3. Menyimpan data user (name, email, hashed password) ke tabel `users`.
 *
 * @param input - Objek berisi `name`, `email`, dan `password` user.
 * @returns String `"OK"` jika registrasi berhasil.
 * @throws {UserServiceError} Jika email sudah terdaftar (status 400).
 */
export async function registerUser(input: RegisterUserInput): Promise<string> {
  const existingUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (existingUsers.length > 0) {
    throw new UserServiceError("Email sudah terdaftar", 400);
  }

  const hashedPassword = await bcrypt.hash(input.password, 10);

  await db.insert(users).values({
    name: input.name,
    email: input.email,
    password: hashedPassword,
  });

  return "OK";
}

/**
 * Mengautentikasi user dan membuat sesi login baru.
 *
 * Proses:
 * 1. Mencari user berdasarkan `email` di tabel `users`.
 *    Jika tidak ditemukan, melempar `UserServiceError` dengan status 401.
 * 2. Memverifikasi `password` yang diberikan terhadap hash bcrypt di database.
 *    Jika tidak cocok, melempar `UserServiceError` dengan status 401.
 *    Pesan error dibuat identik untuk mencegah enumerasi akun (email vs password salah).
 * 3. Membuat token sesi acak berbasis UUID (`crypto.randomUUID()`).
 * 4. Menyimpan token dan `userId` ke tabel `sessions`.
 *
 * @param input - Objek berisi `email` dan `password` user.
 * @returns UUID string yang berfungsi sebagai Bearer token untuk request selanjutnya.
 * @throws {UserServiceError} Jika email tidak terdaftar atau password salah (status 401).
 */
export async function loginUser(input: LoginUserInput): Promise<string> {
  const existingUsers = await db
    .select()
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  const user = existingUsers[0];
  if (!user) {
    throw new UserServiceError("Email atau password salah", 401);
  }

  const isPasswordValid = await bcrypt.compare(input.password, user.password);

  if (!isPasswordValid) {
    throw new UserServiceError("Email atau password salah", 401);
  }

  const token = crypto.randomUUID();

  await db.insert(sessions).values({
    token,
    userId: user.id,
  });

  return token;
}

/**
 * Mengambil data profil user yang sedang aktif berdasarkan token sesi.
 *
 * Proses:
 * 1. Mencari sesi di tabel `sessions` berdasarkan `token`.
 *    Jika sesi tidak ditemukan atau `userId`-nya null, melempar error 401.
 * 2. Mengambil data user dari tabel `users` berdasarkan `userId` dari sesi tersebut.
 *    Hanya field `id`, `name`, `email`, dan `createdAt` yang di-query
 *    (password tidak disertakan untuk mencegah kebocoran data sensitif).
 *    Jika user tidak ditemukan (misalnya sudah dihapus), melempar error 401.
 * 3. Mengembalikan profil user dengan dua nama field timestamp (`createdAt` dan `created_at`)
 *    untuk menjaga backward compatibility.
 *
 * @param token - Bearer token (UUID) dari header Authorization request.
 * @returns Objek profil user: `id`, `name`, `email`, `createdAt`, `created_at`.
 * @throws {UserServiceError} Jika token tidak valid, sesi tidak ditemukan, atau user tidak ada (status 401).
 */
export async function getCurrentUser(token: string): Promise<CurrentUserResponse> {
  const existingSessions = await db
    .select()
    .from(sessions)
    .where(eq(sessions.token, token))
    .limit(1);

  const session = existingSessions[0];
  if (!session || session.userId === null) {
    throw new UserServiceError("Unauthorized", 401);
  }

  const existingUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  const user = existingUsers[0];
  if (!user) {
    throw new UserServiceError("Unauthorized", 401);
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    created_at: user.createdAt,
  };
}

/**
 * Menghapus sesi login user (logout) berdasarkan token.
 *
 * Proses:
 * 1. Menghapus baris di tabel `sessions` yang token-nya cocok.
 *    Menggunakan satu query DELETE dan memeriksa `affectedRows`
 *    (lebih efisien dibanding SELECT-then-DELETE).
 * 2. Jika tidak ada baris yang terhapus (`affectedRows === 0`), berarti token
 *    tidak valid atau sudah tidak ada di database — melempar error 401.
 * 3. Setelah berhasil, token menjadi tidak berlaku dan tidak bisa digunakan
 *    untuk request terautentikasi manapun.
 *
 * @param token - Bearer token (UUID) dari header Authorization request.
 * @returns String `"OK"` jika logout berhasil.
 * @throws {UserServiceError} Jika token tidak ditemukan di database (status 401).
 */
export async function logoutUser(token: string): Promise<string> {
  const [result] = await db.delete(sessions).where(eq(sessions.token, token));
  if (result.affectedRows === 0) {
    throw new UserServiceError("Unauthorized", 401);
  }

  return "OK";
}
