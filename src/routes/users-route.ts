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
        name: t.String({ minLength: 1, maxLength: 255 }),
        email: t.String({
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+$",
          maxLength: 255,
        }),
        password: t.String({ minLength: 1, maxLength: 255 }),
      }),
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
        }),
        password: t.String({ minLength: 1 }),
      }),
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
      detail: {
        summary: "Logout User",
        description:
          "Menghapus sesi login user dari database berdasarkan Bearer token. Setelah logout, token tidak dapat digunakan lagi.",
        tags: ["Users"],
        security: [{ bearerAuth: [] }],
      },
    }
  );
