import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import { app } from "../src";
import { db } from "../src/db";
import { users, sessions } from "../src/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

describe("POST /api/users/login - Login User", () => {
  const testUser = {
    name: "Dodi Login",
    email: "dodi.login@test.com",
    password: "rahasiaLogin123",
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
    await cleanupData();
  });

  // Skenario 1: Login berhasil dengan email dan password benar
  it("1. berhasil login dengan email dan password benar (status 200, token UUID)", async () => {
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
    expect(typeof body.data).toBe("string");
  });

  // Skenario 2: Email tidak terdaftar
  it("2. gagal login jika email tidak terdaftar (status 401 dan pesan 'Email atau password salah')", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "belum.terdaftar@test.com",
          password: testUser.password,
        }),
      })
    );

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body).toEqual({ error: "Email atau password salah" });
  });

  // Skenario 3: Password salah
  it("3. gagal login jika password salah (status 401 dan pesan 'Email atau password salah')", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testUser.email,
          password: "passwordSalahBanget123",
        }),
      })
    );

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body).toEqual({ error: "Email atau password salah" });
  });

  // Skenario 4: Field email tidak dikirim
  it("4. gagal login jika field email tidak dikirim (status 400)", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: testUser.password,
        }),
      })
    );

    expect(res.status).toBe(400);
  });

  // Skenario 5: Field password tidak dikirim
  it("5. gagal login jika field password tidak dikirim (status 400)", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testUser.email,
        }),
      })
    );

    expect(res.status).toBe(400);
  });

  // Skenario 6: Field email format tidak valid
  it("6. gagal login jika field email format tidak valid (status 400)", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "bukan-format-email",
          password: testUser.password,
        }),
      })
    );

    expect(res.status).toBe(400);
  });

  // Skenario 7: Token yang dikembalikan adalah UUID yang valid
  it("7. token yang dikembalikan adalah format UUID yang valid", async () => {
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
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(uuidRegex.test(body.data)).toBe(true);
  });

  // Skenario 8: Session tersimpan di database setelah login berhasil
  it("8. session tersimpan di database setelah login berhasil", async () => {
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
    const token = body.data;

    // Cek di database tabel sessions
    const savedSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.token, token));

    expect(savedSessions.length).toBe(1);
    expect(savedSessions[0]?.userId).toBe(testUserId);
  });

  // Skenario 9: Body request kosong / bukan JSON
  it("9. gagal login bila body request kosong atau bukan JSON (status 400)", async () => {
    // Body kosong tanpa header
    const resEmpty = await app.handle(
      new Request("http://localhost:3000/api/users/login", {
        method: "POST",
      })
    );
    expect(resEmpty.status).toBe(400);

    // Body bukan JSON
    const resNotJson = await app.handle(
      new Request("http://localhost:3000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid-json-content",
      })
    );
    expect(resNotJson.status).toBe(400);

    // Object JSON kosong
    const resEmptyObj = await app.handle(
      new Request("http://localhost:3000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
    );
    expect(resEmptyObj.status).toBe(400);
  });
});
