import { Elysia, t } from "elysia";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

export const userRoutes = new Elysia({ prefix: "/users" })
  .get(
    "/",
    async () => {
      return await db.select().from(users);
    },
    {
      detail: {
        summary: "Get All Users",
        description: "Mengambil seluruh data user dari database.",
        tags: ["Users CRUD"],
      },
      response: {
        200: t.Array(
          t.Object({
            id: t.Number({ example: 1 }),
            name: t.String({ example: "John Doe" }),
            email: t.String({ example: "john@example.com" }),
            password: t.String({ example: "$2a$10$abcdef..." }),
            createdAt: t.Date({ example: "2026-11-25T03:00:00.000Z" }),
          }),
          { description: "Daftar seluruh user" }
        ),
      },
    }
  )
  .get(
    "/:id",
    async ({ params: { id }, set }) => {
      const result = await db.select().from(users).where(eq(users.id, id));
      const user = result[0];
      if (!user) {
        set.status = 404;
        return { status: 404, message: "User not found" };
      }
      return user;
    },
    {
      params: t.Object({
        id: t.Numeric({ example: 1 }),
      }),
      detail: {
        summary: "Get User by ID",
        description: "Mengambil detail user berdasarkan ID numerik.",
        tags: ["Users CRUD"],
      },
      response: {
        200: t.Object(
          {
            id: t.Number({ example: 1 }),
            name: t.String({ example: "John Doe" }),
            email: t.String({ example: "john@example.com" }),
            password: t.String({ example: "$2a$10$abcdef..." }),
            createdAt: t.Date({ example: "2026-11-25T03:00:00.000Z" }),
          },
          { description: "Detail data user" }
        ),
        404: t.Object(
          {
            status: t.Number({ example: 404 }),
            message: t.String({ example: "User not found" }),
          },
          { description: "User dengan ID tersebut tidak ditemukan" }
        ),
      },
    }
  )
  .post(
    "/",
    async ({ body, set }) => {
      const [result] = await db.insert(users).values({
        name: body.name,
        email: body.email,
        password: body.password || "password",
      });
      set.status = 201;
      return {
        status: 201,
        message: "User created successfully",
        data: {
          id: result.insertId,
          ...body,
        },
      };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1, example: "John Doe" }),
        email: t.String({ format: "email", example: "john@example.com" }),
        password: t.Optional(t.String({ example: "password123" })),
      }),
      detail: {
        summary: "Create User",
        description: "Membuat user baru secara langsung ke database.",
        tags: ["Users CRUD"],
      },
      response: {
        201: t.Object(
          {
            status: t.Number({ example: 201 }),
            message: t.String({ example: "User created successfully" }),
            data: t.Object({
              id: t.Number({ example: 1 }),
              name: t.String({ example: "John Doe" }),
              email: t.String({ example: "john@example.com" }),
              password: t.Optional(t.String({ example: "password123" })),
            }),
          },
          { description: "User berhasil dibuat" }
        ),
      },
    }
  )
  .put(
    "/:id",
    async ({ params: { id }, body, set }) => {
      const existing = await db.select().from(users).where(eq(users.id, id));
      if (existing.length === 0) {
        set.status = 404;
        return { status: 404, message: "User not found" };
      }
      await db.update(users).set(body).where(eq(users.id, id));
      return {
        status: 200,
        message: "User updated successfully",
        data: {
          id,
          ...body,
        },
      };
    },
    {
      params: t.Object({
        id: t.Numeric({ example: 1 }),
      }),
      body: t.Object({
        name: t.Optional(t.String({ minLength: 1, example: "John Updated" })),
        email: t.Optional(t.String({ format: "email", example: "john.updated@example.com" })),
      }),
      detail: {
        summary: "Update User",
        description: "Memperbarui nama atau email user berdasarkan ID.",
        tags: ["Users CRUD"],
      },
      response: {
        200: t.Object(
          {
            status: t.Number({ example: 200 }),
            message: t.String({ example: "User updated successfully" }),
            data: t.Object({
              id: t.Number({ example: 1 }),
              name: t.Optional(t.String({ example: "John Updated" })),
              email: t.Optional(t.String({ example: "john.updated@example.com" })),
            }),
          },
          { description: "User berhasil diperbarui" }
        ),
        404: t.Object(
          {
            status: t.Number({ example: 404 }),
            message: t.String({ example: "User not found" }),
          },
          { description: "User tidak ditemukan" }
        ),
      },
    }
  )
  .delete(
    "/:id",
    async ({ params: { id }, set }) => {
      const existing = await db.select().from(users).where(eq(users.id, id));
      if (existing.length === 0) {
        set.status = 404;
        return { status: 404, message: "User not found" };
      }
      await db.delete(users).where(eq(users.id, id));
      return {
        status: 200,
        message: "User deleted successfully",
        data: { id },
      };
    },
    {
      params: t.Object({
        id: t.Numeric({ example: 1 }),
      }),
      detail: {
        summary: "Delete User",
        description: "Menghapus user berdasarkan ID.",
        tags: ["Users CRUD"],
      },
      response: {
        200: t.Object(
          {
            status: t.Number({ example: 200 }),
            message: t.String({ example: "User deleted successfully" }),
            data: t.Object({
              id: t.Number({ example: 1 }),
            }),
          },
          { description: "User berhasil dihapus" }
        ),
        404: t.Object(
          {
            status: t.Number({ example: 404 }),
            message: t.String({ example: "User not found" }),
          },
          { description: "User tidak ditemukan" }
        ),
      },
    }
  );
