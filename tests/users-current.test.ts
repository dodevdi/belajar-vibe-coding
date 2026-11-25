import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import { app } from "../src";
import { db } from "../src/db";
import { users, sessions } from "../src/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

describe("GET /api/users/current - Get Current User", () => {
  const testUser = {
    name: "Dodi Current",
    email: "dodi.current@test.com",
    password: "rahasiaCurrent123",
  };

  let testUserId: number;
  let validToken: string;

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

    // Siapkan session dengan UUID token
    validToken = crypto.randomUUID();
    await db.insert(sessions).values({
      token: validToken,
      userId: testUserId,
    });
  });

  afterAll(async () => {
    await cleanupData();
  });

  // Skenario 1: Berhasil mendapatkan data user dengan token valid
  it("1. berhasil mendapatkan data user dengan token valid (status 200)", async () => {
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
        createdAt: string;
        created_at: string;
      };
    };

    expect(body.data).toBeDefined();
    expect(body.data.id).toBe(testUserId);
    expect(body.data.name).toBe(testUser.name);
    expect(body.data.email).toBe(testUser.email);
    expect(body.data.createdAt).toBeDefined();
    expect(body.data.created_at).toBeDefined();
  });

  // Skenario 2: Respons tidak mengandung field password
  it("2. respons tidak mengandung field password", async () => {
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
      data: Record<string, unknown>;
    };

    expect(body.data).toBeDefined();
    expect(body.data.password).toBeUndefined();
  });

  // Skenario 3: Header Authorization tidak dikirim
  it("3. gagal jika header Authorization tidak dikirim (status 401 dan pesan 'Unauthorized')", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users/current", {
        method: "GET",
      })
    );

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body).toEqual({ error: "Unauthorized" });
  });

  // Skenario 4: Format header bukan Bearer <token>
  it("4. gagal jika format header bukan Bearer <token> (status 401 dan pesan 'Unauthorized')", async () => {
    // Format Basic
    const resBasic = await app.handle(
      new Request("http://localhost:3000/api/users/current", {
        method: "GET",
        headers: {
          Authorization: `Basic ${validToken}`,
        },
      })
    );
    expect(resBasic.status).toBe(401);
    const bodyBasic = (await resBasic.json()) as { error: string };
    expect(bodyBasic).toEqual({ error: "Unauthorized" });

    // Format Token tanpa awalan Bearer
    const resRaw = await app.handle(
      new Request("http://localhost:3000/api/users/current", {
        method: "GET",
        headers: {
          Authorization: validToken,
        },
      })
    );
    expect(resRaw.status).toBe(401);
    const bodyRaw = (await resRaw.json()) as { error: string };
    expect(bodyRaw).toEqual({ error: "Unauthorized" });
  });

  // Skenario 5: Token tidak valid / tidak ada di database
  it("5. gagal jika token tidak valid / tidak ada di database (status 401 dan pesan 'Unauthorized')", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users/current", {
        method: "GET",
        headers: {
          Authorization: "Bearer token-palsu-12345",
        },
      })
    );

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body).toEqual({ error: "Unauthorized" });
  });

  // Skenario 6: Token sudah di-logout (tidak valid lagi)
  it("6. gagal jika token sudah di-logout (status 401)", async () => {
    // Siapkan token baru khusus skenario logout
    const logoutTestToken = crypto.randomUUID();
    await db.insert(sessions).values({
      token: logoutTestToken,
      userId: testUserId,
    });

    // Pastikan token bisa dipakai sebelum logout
    const resBefore = await app.handle(
      new Request("http://localhost:3000/api/users/current", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${logoutTestToken}`,
        },
      })
    );
    expect(resBefore.status).toBe(200);

    // Lakukan logout
    const resLogout = await app.handle(
      new Request("http://localhost:3000/api/users/logout", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${logoutTestToken}`,
        },
      })
    );
    expect(resLogout.status).toBe(200);

    // Pastikan token yang sudah logout tidak valid lagi
    const resAfter = await app.handle(
      new Request("http://localhost:3000/api/users/current", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${logoutTestToken}`,
        },
      })
    );
    expect(resAfter.status).toBe(401);
    const bodyAfter = (await resAfter.json()) as { error: string };
    expect(bodyAfter).toEqual({ error: "Unauthorized" });
  });
});
