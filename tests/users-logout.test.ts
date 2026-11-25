import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import { app } from "../src";
import { db } from "../src/db";
import { users, sessions } from "../src/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

describe("DELETE /api/users/logout - Logout User", () => {
  const testUser = {
    name: "Dodi Logout",
    email: "dodi.logout@localhost",
    password: "rahasia",
  };

  let testUserId: number;
  let activeToken: string;

  beforeAll(async () => {
    // Bersihkan data user lama jika ada
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
    activeToken = crypto.randomUUID();
    await db.insert(sessions).values({
      token: activeToken,
      userId: testUserId,
    });
  });

  afterAll(async () => {
    await db.delete(sessions).where(eq(sessions.userId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  it("gagal logout jika header Authorization tidak disertakan (status 401)", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users/logout", {
        method: "DELETE",
      })
    );

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("gagal logout jika skema auth bukan Bearer (status 401)", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users/logout", {
        method: "DELETE",
        headers: {
          Authorization: `Basic ${activeToken}`,
        },
      })
    );

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("gagal logout jika token tidak terdaftar / tidak valid (status 401)", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users/logout", {
        method: "DELETE",
        headers: {
          Authorization: "Bearer token-asal-asalan-123",
        },
      })
    );

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("berhasil logout dengan token valid (status 200, session terhapus)", async () => {
    // 1. Pastikan session ada sebelum logout
    const beforeSession = await db
      .select()
      .from(sessions)
      .where(eq(sessions.token, activeToken));
    expect(beforeSession.length).toBe(1);

    // 2. Request logout
    const res = await app.handle(
      new Request("http://localhost:3000/api/users/logout", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      })
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: string };
    expect(body).toEqual({ data: "OK" });

    // 3. Pastikan session telah dihapus dari tabel sessions
    const afterSession = await db
      .select()
      .from(sessions)
      .where(eq(sessions.token, activeToken));
    expect(afterSession.length).toBe(0);

    // 4. Pastikan token yang sudah di-logout tidak bisa lagi dipakai untuk GET /current
    const currentRes = await app.handle(
      new Request("http://localhost:3000/api/users/current", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      })
    );
    expect(currentRes.status).toBe(401);
    const currentBody = (await currentRes.json()) as { error: string };
    expect(currentBody).toEqual({ error: "Unauthorized" });
  });
});
