import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";

export interface RegisterUserInput {
  name: string;
  email: string;
  password: string;
}

export class UserServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = "UserServiceError";
    this.statusCode = statusCode;
  }
}

export async function registerUser(input: RegisterUserInput): Promise<string> {
  const existingUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (existingUsers.length > 0) {
    throw new UserServiceError("Email sudah terdaftar", 400);
  }

  const hashedPassword = await bcrypt.hash(input.password, 10);

  await db.insert(users).values({
    name: input.name,
    email: input.email,
    password: hashedPassword,
  });

  return "OK";
}
