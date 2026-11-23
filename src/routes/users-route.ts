import { Elysia, t } from "elysia";
import {
  registerUser,
  loginUser,
  getCurrentUser,
  logoutUser,
  UserServiceError,
} from "../services/users-service";

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
        name: t.String({ minLength: 1 }),
        email: t.String({
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+$",
        }),
        password: t.String({ minLength: 1 }),
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
        const authorization = headers["authorization"];
        if (!authorization || !authorization.startsWith("Bearer ")) {
          set.status = 401;
          return {
            error: "Unauthorized",
          };
        }

        const token = authorization.slice(7);
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
        const authorization = headers["authorization"];
        if (!authorization || !authorization.startsWith("Bearer ")) {
          set.status = 401;
          return {
            error: "Unauthorized",
          };
        }

        const token = authorization.slice(7);
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
