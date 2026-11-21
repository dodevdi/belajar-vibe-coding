import { Elysia } from "elysia";
import { routes } from "./routes";
import { usersRoute } from "./routes/users-route";

const port = Number(process.env.PORT) || 3000;

export const app = new Elysia()
  .onError(({ code, error, set }) => {
    switch (code) {
      case "NOT_FOUND":
        set.status = 404;
        return {
          status: 404,
          message: "Route not found",
        };
      case "VALIDATION":
        set.status = 400;
        return {
          status: 400,
          message: "Validation Error",
          details: error.all,
        };
      default:
        set.status = 500;
        const errorMessage = error && typeof error === "object" && "message" in error
          ? String((error as { message?: unknown }).message)
          : "Internal Server Error";
        return {
          status: 500,
          message: errorMessage,
        };
    }
  })
  .get("/", () => ({ status: "ok" }))
  .use(routes)
  .use(usersRoute)
  .listen(port);

console.log(`🦊 Elysia server is running at http://${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;
