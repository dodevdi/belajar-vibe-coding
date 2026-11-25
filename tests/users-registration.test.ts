import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import { app } from "../src";
import { db } from "../src/db";
import { users } from "../src/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

describe("POST /api/users - Registrasi User Baru", () => {
  const testUser = {
    name: "Dodi",
    email: "dodi@localhost",
    password: "rahasia",
  };

  beforeAll(async () => {
    // Bersihkan data sebelum test jika ada
    await db.delete(users).where(eq(users.email, testUser.email));
  });

  afterAll(async () => {
    // Bersihkan data setelah test selesai
    await db.delete(users).where(eq(users.email, testUser.email));
  });

  it("berhasil registrasi user baru dengan status 200 dan data 'OK'", async () => {
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

    // Cek data di database
    const saved = await db
      .select()
      .from(users)
      .where(eq(users.email, testUser.email))
      .limit(1);

    expect(saved.length).toBe(1);
    const savedUser = saved[0];
    expect(savedUser).toBeDefined();
    if (!savedUser) return;

    expect(savedUser.name).toBe(testUser.name);
    expect(savedUser.email).toBe(testUser.email);

    // Password harus di-hash menggunakan bcrypt, bukan plain text
    expect(savedUser.password).not.toBe(testUser.password);
    const isPasswordValid = await bcrypt.compare(testUser.password, savedUser.password);
    expect(isPasswordValid).toBe(true);
  });

  it("gagal registrasi bila email sudah terdaftar dengan status 400 dan pesan error yang sesuai", async () => {
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

  it("gagal registrasi bila name melebihi 255 karakter (status 400)", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "A".repeat(256),
          email: "toolong.name@example.com",
          password: "rahasia123",
        }),
      })
    );

    expect(res.status).toBe(400);
    const body = (await res.json()) as { status: number; message: string };
    expect(body.status).toBe(400);
    expect(body.message).toBe("Validation Error");
  });

  it("gagal registrasi bila password melebihi 255 karakter (status 400)", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Valid Name",
          email: "toolong.pwd@example.com",
          password: "P".repeat(256),
        }),
      })
    );

    expect(res.status).toBe(400);
    const body = (await res.json()) as { status: number; message: string };
    expect(body.status).toBe(400);
    expect(body.message).toBe("Validation Error");
  });
});
