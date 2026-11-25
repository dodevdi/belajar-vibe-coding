import { Elysia, t } from "elysia";
import {
  registerUser,
  loginUser,
  getCurrentUser,
  logoutUser,
  UserServiceError,
} from "../services/users-service";
import { extractBearerToken } from "../utils/auth";

export const usersRoute = new Elysia({ prefix: "/api/users" })
  .post(
    "/",
    async ({ body, set }) => {
      try {
        const result = await registerUser(body);
        set.status = 200;
        return {
          data: result,
        };
      } catch (error) {
        if (error instanceof UserServiceError) {
          set.status = error.statusCode;
          return {
            error: error.message,
          };
        }
        throw error;
      }
    },
    {
      body: t.Object({
        name: t.String({
          minLength: 1,
          maxLength: 255,
          example: "Dodi",
          description: "Nama lengkap user",
        }),
        email: t.String({
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+$",
          maxLength: 255,
          example: "dodi@example.com",
          description: "Alamat email unik user",
        }),
        password: t.String({
          minLength: 1,
          maxLength: 255,
          example: "rahasia123",
          description: "Kata sandi user",
        }),
      }),
      response: {
        200: t.Object(
          {
            data: t.String({ example: "OK" }),
          },
          { description: "Registrasi berhasil" }
        ),
        400: t.Object(
          {
            error: t.String({ example: "Email sudah terdaftar" }),
          },
          { description: "Validasi gagal atau email sudah terdaftar" }
        ),
      },
      detail: {
        summary: "Registrasi User Baru",
        description:
          "Mendaftarkan user baru dengan name, email, dan password. Password akan di-hash menggunakan bcrypt sebelum disimpan ke database. Gagal jika email sudah terdaftar.",
        tags: ["Users"],
      },
    }
  )
  .post(
    "/login",
    async ({ body, set }) => {
      try {
        const token = await loginUser(body);
        set.status = 200;
        return {
          data: token,
        };
      } catch (error) {
        if (error instanceof UserServiceError) {
          set.status = error.statusCode;
          return {
            error: error.message,
          };
        }
        throw error;
      }
    },
    {
      body: t.Object({
        email: t.String({
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+$",
          example: "dodi@example.com",
          description: "Alamat email user terdaftar",
        }),
        password: t.String({
          minLength: 1,
          example: "rahasia123",
          description: "Kata sandi user",
        }),
      }),
      response: {
        200: t.Object(
          {
            data: t.String({
              example: "550e8400-e29b-41d4-a716-446655440000",
            }),
          },
          { description: "Login berhasil, mengembalikan session token UUID" }
        ),
        401: t.Object(
          {
            error: t.String({ example: "Email atau password salah" }),
          },
          { description: "Autentikasi gagal (email tidak ditemukan atau password salah)" }
        ),
      },
      detail: {
        summary: "Login User",
        description:
          "Mengautentikasi user dengan email dan password. Jika berhasil, mengembalikan UUID token yang digunakan sebagai Bearer token untuk request selanjutnya.",
        tags: ["Users"],
      },
    }
  )
  .get(
    "/current",
    async ({ headers, set }) => {
      try {
        const token = extractBearerToken(headers["authorization"]);
        const user = await getCurrentUser(token);
        set.status = 200;
        return {
          data: user,
        };
      } catch (error) {
        if (error instanceof UserServiceError) {
          set.status = error.statusCode;
          return {
            error: error.message,
          };
        }
        throw error;
      }
    },
    {
      response: {
        200: t.Object(
          {
            data: t.Object({
              id: t.Number({ example: 1 }),
              name: t.String({ example: "Dodi" }),
              email: t.String({ example: "dodi@example.com" }),
              createdAt: t.Date({ example: "2026-11-25T03:00:00.000Z" }),
              created_at: t.Date({ example: "2026-11-25T03:00:00.000Z" }),
            }),
          },
          { description: "Data profil user aktif yang sedang login" }
        ),
        401: t.Object(
          {
            error: t.String({ example: "Unauthorized" }),
          },
          { description: "Header Authorization tidak disertakan, format salah, atau token tidak valid" }
        ),
      },
      detail: {
        summary: "Get Current User",
        description:
          "Mengembalikan data profil user yang sedang login berdasarkan Bearer token di header Authorization. Password tidak disertakan dalam response.",
        tags: ["Users"],
        security: [{ bearerAuth: [] }],
      },
    }
  )
  .delete(
    "/logout",
    async ({ headers, set }) => {
      try {
        const token = extractBearerToken(headers["authorization"]);
        await logoutUser(token);
        set.status = 200;
        return {
          data: "OK",
        };
      } catch (error) {
        if (error instanceof UserServiceError) {
          set.status = error.statusCode;
          return {
            error: error.message,
          };
        }
        throw error;
      }
    },
    {
      response: {
        200: t.Object(
          {
            data: t.String({ example: "OK" }),
          },
          { description: "Logout berhasil, session telah dihapus dari database" }
        ),
        401: t.Object(
          {
            error: t.String({ example: "Unauthorized" }),
          },
          { description: "Header Authorization tidak disertakan atau token tidak valid" }
        ),
      },
      detail: {
        summary: "Logout User",
        description:
          "Menghapus sesi login user dari database berdasarkan Bearer token. Setelah logout, token tidak dapat digunakan lagi.",
        tags: ["Users"],
        security: [{ bearerAuth: [] }],
      },
    }
  );
