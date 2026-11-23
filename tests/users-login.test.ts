import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import { app } from "../src";
import { db } from "../src/db";
import { users, sessions } from "../src/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

describe("POST /api/users/login - Login User", () => {
  const testUser = {
    name: "Dodi Login",
    email: "dodi.login@localhost",
    password: "rahasia",
  };

  let testUserId: number;

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

    // Siapkan user untuk login test
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    const [inserted] = await db.insert(users).values({
      name: testUser.name,
      email: testUser.email,
      password: hashedPassword,
    });
    testUserId = inserted.insertId;
  });

  afterAll(async () => {
    await db.delete(sessions).where(eq(sessions.userId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  it("berhasil login dengan email dan password yang benar (status 200 dan token UUID)", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password,
        }),
      })
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: string };
    expect(body.data).toBeDefined();

    // Verifikasi format UUID (36 karakter: 8-4-4-4-12)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(uuidRegex.test(body.data)).toBe(true);

    // Cek session tersimpan di tabel sessions
    const savedSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.token, body.data));

    expect(savedSessions.length).toBe(1);
    expect(savedSessions[0]?.userId).toBe(testUserId);
  });

  it("gagal login jika password salah (status 401 dan pesan 'Email atau password salah')", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testUser.email,
          password: "password_salah",
        }),
      })
    );

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body).toEqual({ error: "Email atau password salah" });
  });

  it("gagal login jika email tidak terdaftar (status 401 dan pesan 'Email atau password salah')", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "tidak.ada@localhost",
          password: "rahasia",
        }),
      })
    );

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body).toEqual({ error: "Email atau password salah" });
  });
});
