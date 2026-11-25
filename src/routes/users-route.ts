import { Elysia, t } from "elysia";
import {
  registerUser,
  loginUser,
  getCurrentUser,
  logoutUser,
  UserServiceError,
} from "../services/users-service";
import { extractBearerToken } from "../utils/auth";

export const usersRoute = new Elysia({ prefix: "/api/users" })
  .post(
    "/",
    async ({ body, set }) => {
      try {
        const result = await registerUser(body);
        set.status = 200;
        return {
          data: result,
        };
      } catch (error) {
        if (error instanceof UserServiceError) {
          set.status = error.statusCode;
          return {
            error: error.message,
          };
        }
        throw error;
      }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 255 }),
        email: t.String({
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+$",
          maxLength: 255,
        }),
        password: t.String({ minLength: 1, maxLength: 255 }),
      }),
    }
  )
  .post(
    "/login",
    async ({ body, set }) => {
      try {
        const token = await loginUser(body);
        set.status = 200;
        return {
          data: token,
        };
      } catch (error) {
        if (error instanceof UserServiceError) {
          set.status = error.statusCode;
          return {
            error: error.message,
          };
        }
        throw error;
      }
    },
    {
      body: t.Object({
        email: t.String({
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+$",
        }),
        password: t.String({ minLength: 1 }),
      }),
    }
  )
  .get(
    "/current",
    async ({ headers, set }) => {
      try {
        const token = extractBearerToken(headers["authorization"]);
        const user = await getCurrentUser(token);
        set.status = 200;
        return {
          data: user,
        };
      } catch (error) {
        if (error instanceof UserServiceError) {
          set.status = error.statusCode;
          return {
            error: error.message,
          };
        }
        throw error;
      }
    }
  )
  .delete(
    "/logout",
    async ({ headers, set }) => {
      try {
        const token = extractBearerToken(headers["authorization"]);
        await logoutUser(token);
        set.status = 200;
        return {
          data: "OK",
        };
      } catch (error) {
        if (error instanceof UserServiceError) {
          set.status = error.statusCode;
          return {
            error: error.message,
          };
        }
        throw error;
      }
    }
  );
