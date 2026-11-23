import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import { app } from "../src";
import { db } from "../src/db";
import { users, sessions } from "../src/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

describe("GET /api/users/current - Get Current User", () => {
  const testUser = {
    name: "Dodi Current",
    email: "dodi.current@localhost",
    password: "rahasia",
  };

  let testUserId: number;
  let validToken: string;

  beforeAll(async () => {
    // Bersihkan user lama jika ada
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, testUser.email));

    for (const u of existing) {
      await db.delete(sessions).where(eq(sessions.userId, u.id));
    }
    await db.delete(users).where(eq(users.email, testUser.email));

    // Siapkan user
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    const [inserted] = await db.insert(users).values({
      name: testUser.name,
      email: testUser.email,
      password: hashedPassword,
    });
    testUserId = inserted.insertId;

    // Siapkan session dengan UUID token
    validToken = crypto.randomUUID();
    await db.insert(sessions).values({
      token: validToken,
      userId: testUserId,
    });
  });

  afterAll(async () => {
    await db.delete(sessions).where(eq(sessions.userId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  it("berhasil get current user dengan token yang valid (status 200, tanpa password)", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users/current", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${validToken}`,
        },
      })
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: {
        id: number;
        name: string;
        email: string;
        created_at: string;
        password?: string;
      };
    };

    expect(body.data).toBeDefined();
    expect(body.data.id).toBe(testUserId);
    expect(body.data.name).toBe(testUser.name);
    expect(body.data.email).toBe(testUser.email);
    expect(body.data.created_at).toBeDefined();
    // Pastikan password TIDAK dikembalikan
    expect(body.data.password).toBeUndefined();
  });

  it("gagal jika header Authorization tidak disertakan (status 401 dan pesan 'Unauthorized')", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users/current", {
        method: "GET",
      })
    );

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("gagal jika format header Authorization bukan Bearer (status 401 dan pesan 'Unauthorized')", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users/current", {
        method: "GET",
        headers: {
          Authorization: `Basic ${validToken}`,
        },
      })
    );

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("gagal jika token tidak valid / tidak ada di database (status 401 dan pesan 'Unauthorized')", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users/current", {
        method: "GET",
        headers: {
          Authorization: "Bearer token-asal-asalan-12345",
        },
      })
    );

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body).toEqual({ error: "Unauthorized" });
  });
});
