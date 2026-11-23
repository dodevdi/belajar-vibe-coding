import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users, sessions } from "../db/schema";

export interface RegisterUserInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginUserInput {
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

export async function loginUser(input: LoginUserInput): Promise<string> {
  const existingUsers = await db
    .select()
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  const user = existingUsers[0];
  if (!user) {
    throw new UserServiceError("Email atau password salah", 401);
  }

  const isPasswordValid = await bcrypt.compare(input.password, user.password);

  if (!isPasswordValid) {
    throw new UserServiceError("Email atau password salah", 401);
  }

  const token = crypto.randomUUID();

  await db.insert(sessions).values({
    token,
    userId: user.id,
  });

  return token;
}
