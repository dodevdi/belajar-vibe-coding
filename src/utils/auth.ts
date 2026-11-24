import { UserServiceError } from "../services/users-service";

export function extractBearerToken(authorization?: string): string {
  if (!authorization || !authorization.startsWith("Bearer ")) {
    throw new UserServiceError("Unauthorized", 401);
  }
  return authorization.slice(7);
}
