import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import { app } from "../src";
import { db } from "../src/db";
import { users } from "../src/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

describe("POST /api/users - Registrasi User Baru", () => {
  const testUser = {
    name: "Dodi Registrasi",
    email: "dodi.registrasi@test.com",
    password: "rahasia123",
  };

  const cleanupEmails = [testUser.email, "valid.hash@test.com"];

  const cleanupData = async () => {
    for (const email of cleanupEmails) {
      await db.delete(users).where(eq(users.email, email));
    }
  };

  beforeAll(async () => {
    await cleanupData();
  });

  afterAll(async () => {
    await cleanupData();
  });

  // Skenario 1: Registrasi berhasil dengan data valid
  it("1. registrasi berhasil dengan data valid (status 200, data 'OK')", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testUser),
      })
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: string };
    expect(body).toEqual({ data: "OK" });

    // Cek data tersimpan di database
    const saved = await db
      .select()
      .from(users)
      .where(eq(users.email, testUser.email))
      .limit(1);

    expect(saved.length).toBe(1);
    expect(saved[0]?.name).toBe(testUser.name);
    expect(saved[0]?.email).toBe(testUser.email);
  });

  // Skenario 2: Email sudah terdaftar
  it("2. gagal registrasi bila email sudah terdaftar (status 400)", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testUser),
      })
    );

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body).toEqual({ error: "Email sudah terdaftar" });
  });

  // Skenario 3: Field name kosong / tidak dikirim
  it("3. gagal registrasi bila field name kosong atau tidak dikirim (status 400)", async () => {
    // Sub-skenario: name string kosong
    const resEmpty = await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "",
          email: "noname1@test.com",
          password: "password123",
        }),
      })
    );
    expect(resEmpty.status).toBe(400);

    // Sub-skenario: name tidak dikirim
    const resMissing = await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "noname2@test.com",
          password: "password123",
        }),
      })
    );
    expect(resMissing.status).toBe(400);
  });

  // Skenario 4: Field email tidak dikirim
  it("4. gagal registrasi bila field email tidak dikirim (status 400)", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "User Tanpa Email",
          password: "password123",
        }),
      })
    );

    expect(res.status).toBe(400);
  });

  // Skenario 5: Field email format tidak valid (bukan format email)
  it("5. gagal registrasi bila format email tidak valid (status 400)", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "User Invalid Email",
          email: "bukan-sebuah-email",
          password: "password123",
        }),
      })
    );

    expect(res.status).toBe(400);
  });

  // Skenario 6: Field password kosong / tidak dikirim
  it("6. gagal registrasi bila field password kosong atau tidak dikirim (status 400)", async () => {
    // Sub-skenario: password string kosong
    const resEmpty = await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "User Empty Pwd",
          email: "nopass1@test.com",
          password: "",
        }),
      })
    );
    expect(resEmpty.status).toBe(400);

    // Sub-skenario: password tidak dikirim
    const resMissing = await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "User Missing Pwd",
          email: "nopass2@test.com",
        }),
      })
    );
    expect(resMissing.status).toBe(400);
  });

  // Skenario 7: Field name melebihi 255 karakter
  it("7. gagal registrasi bila field name melebihi 255 karakter (status 400)", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "A".repeat(256),
          email: "toolong.name@test.com",
          password: "password123",
        }),
      })
    );

    expect(res.status).toBe(400);
  });

  // Skenario 8: Field password melebihi 255 karakter
  it("8. gagal registrasi bila field password melebihi 255 karakter (status 400)", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "User Long Pwd",
          email: "toolong.pwd@test.com",
          password: "P".repeat(256),
        }),
      })
    );

    expect(res.status).toBe(400);
  });

  // Skenario 9: Password tersimpan dalam bentuk hash (bukan plain text)
  it("9. password tersimpan dalam bentuk hash bukan plain text di database", async () => {
    const hashUser = {
      name: "User Hash Test",
      email: "valid.hash@test.com",
      password: "passwordRahasia!@#",
    };

    const res = await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hashUser),
      })
    );
    expect(res.status).toBe(200);

    const saved = await db
      .select()
      .from(users)
      .where(eq(users.email, hashUser.email))
      .limit(1);

    expect(saved.length).toBe(1);
    const savedUser = saved[0];
    expect(savedUser).toBeDefined();
    if (!savedUser) return;

    // Pastikan tidak tersimpan sebagai plain text
    expect(savedUser.password).not.toBe(hashUser.password);
    // Pastikan hash bcrypt valid
    const isMatch = await bcrypt.compare(hashUser.password, savedUser.password);
    expect(isMatch).toBe(true);
  });

  // Skenario 10: Body request kosong / bukan JSON
  it("10. gagal registrasi bila body request kosong atau bukan JSON (status 400)", async () => {
    // Body kosong tanpa header
    const resEmpty = await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
      })
    );
    expect(resEmpty.status).toBe(400);

    // Body bukan JSON dengan Content-Type application/json
    const resNotJson = await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "bukan json valid",
      })
    );
    expect(resNotJson.status).toBe(400);

    // Object JSON kosong
    const resEmptyObj = await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
    );
    expect(resEmptyObj.status).toBe(400);
  });
});
