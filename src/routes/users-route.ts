import { Elysia, t } from "elysia";
import { registerUser, UserServiceError } from "../services/users-service";

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
  );
