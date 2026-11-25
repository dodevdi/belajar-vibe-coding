import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import { app } from "../src";
import { db } from "../src/db";
import { users, sessions } from "../src/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

describe("DELETE /api/users/logout - Logout User", () => {
  const testUser = {
    name: "Dodi Logout",
    email: "dodi.logout@test.com",
    password: "rahasiaLogout123",
  };

  let testUserId: number;

  const cleanupData = async () => {
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, testUser.email));

    for (const u of existing) {
      await db.delete(sessions).where(eq(sessions.userId, u.id));
    }
    await db.delete(users).where(eq(users.email, testUser.email));
  };

  beforeAll(async () => {
    await cleanupData();

    // Siapkan user
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    const [inserted] = await db.insert(users).values({
      name: testUser.name,
      email: testUser.email,
      password: hashedPassword,
    });
    testUserId = inserted.insertId;
  });

  afterAll(async () => {
    await cleanupData();
  });

  // Skenario 1: Logout berhasil dengan token valid
  it("1. logout berhasil dengan token valid (status 200, data 'OK')", async () => {
    const token = crypto.randomUUID();
    await db.insert(sessions).values({
      token,
      userId: testUserId,
    });

    const res = await app.handle(
      new Request("http://localhost:3000/api/users/logout", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: string };
    expect(body).toEqual({ data: "OK" });
  });

  // Skenario 2: Session terhapus dari database setelah logout
  it("2. session terhapus dari database setelah logout", async () => {
    const token = crypto.randomUUID();
    await db.insert(sessions).values({
      token,
      userId: testUserId,
    });

    // Pastikan session ada sebelum logout
    const beforeSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.token, token));
    expect(beforeSessions.length).toBe(1);

    // Logout
    const res = await app.handle(
      new Request("http://localhost:3000/api/users/logout", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    );
    expect(res.status).toBe(200);

    // Verifikasi session sudah terhapus
    const afterSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.token, token));
    expect(afterSessions.length).toBe(0);
  });

  // Skenario 3: Token tidak bisa dipakai lagi setelah logout
  it("3. token tidak bisa dipakai lagi setelah logout (coba GET /current mengembalikan 401)", async () => {
    const token = crypto.randomUUID();
    await db.insert(sessions).values({
      token,
      userId: testUserId,
    });

    // Logout
    const resLogout = await app.handle(
      new Request("http://localhost:3000/api/users/logout", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    );
    expect(resLogout.status).toBe(200);

    // Coba akses GET /api/users/current
    const resCurrent = await app.handle(
      new Request("http://localhost:3000/api/users/current", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    );
    expect(resCurrent.status).toBe(401);
    const bodyCurrent = (await resCurrent.json()) as { error: string };
    expect(bodyCurrent).toEqual({ error: "Unauthorized" });
  });

  // Skenario 4: Header Authorization tidak dikirim
  it("4. gagal logout jika header Authorization tidak dikirim (status 401 dan pesan 'Unauthorized')", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users/logout", {
        method: "DELETE",
      })
    );

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body).toEqual({ error: "Unauthorized" });
  });

  // Skenario 5: Format header bukan Bearer <token>
  it("5. gagal logout jika format header bukan Bearer <token> (status 401 dan pesan 'Unauthorized')", async () => {
    const fakeToken = crypto.randomUUID();

    // Format Basic
    const resBasic = await app.handle(
      new Request("http://localhost:3000/api/users/logout", {
        method: "DELETE",
        headers: {
          Authorization: `Basic ${fakeToken}`,
        },
      })
    );
    expect(resBasic.status).toBe(401);
    const bodyBasic = (await resBasic.json()) as { error: string };
    expect(bodyBasic).toEqual({ error: "Unauthorized" });

    // Format tanpa skema
    const resRaw = await app.handle(
      new Request("http://localhost:3000/api/users/logout", {
        method: "DELETE",
        headers: {
          Authorization: fakeToken,
        },
      })
    );
    expect(resRaw.status).toBe(401);
    const bodyRaw = (await resRaw.json()) as { error: string };
    expect(bodyRaw).toEqual({ error: "Unauthorized" });
  });

  // Skenario 6: Token tidak valid / tidak ada di database
  it("6. gagal logout jika token tidak valid / tidak ada di database (status 401 dan pesan 'Unauthorized')", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users/logout", {
        method: "DELETE",
        headers: {
          Authorization: "Bearer token-yang-tidak-ada-12345",
        },
      })
    );

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body).toEqual({ error: "Unauthorized" });
  });
});
