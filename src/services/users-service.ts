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

export interface CurrentUserResponse {
  id: number;
  name: string;
  email: string;
  created_at: Date;
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

export async function getCurrentUser(token: string): Promise<CurrentUserResponse> {
  const existingSessions = await db
    .select()
    .from(sessions)
    .where(eq(sessions.token, token))
    .limit(1);

  const session = existingSessions[0];
  if (!session || session.userId === null) {
    throw new UserServiceError("Unauthorized", 401);
  }

  const existingUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  const user = existingUsers[0];
  if (!user) {
    throw new UserServiceError("Unauthorized", 401);
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    created_at: user.createdAt,
  };
}

export async function logoutUser(token: string): Promise<string> {
  const existingSessions = await db
    .select()
    .from(sessions)
    .where(eq(sessions.token, token))
    .limit(1);

  const session = existingSessions[0];
  if (!session) {
    throw new UserServiceError("Unauthorized", 401);
  }

  await db.delete(sessions).where(eq(sessions.token, token));

  return "OK";
}
