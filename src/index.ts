import { Elysia, t } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { routes } from "./routes";
import { usersRoute } from "./routes/users-route";

const port = Number(process.env.PORT) || 3000;

export const app = new Elysia()
  .use(
    swagger({
      path: "/swagger",
      documentation: {
        info: {
          title: "Belajar Vibe Coding API",
          version: "1.0.0",
          description:
            "API dokumentasi untuk manajemen pengguna (registrasi, login, current user, logout).",
        },
        servers: [
          {
            url: "http://localhost:3000",
            description: "Development Server",
          },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: "http",
              scheme: "bearer",
              bearerFormat: "UUID",
              description:
                "Masukkan token UUID yang didapatkan dari endpoint POST /api/users/login.",
            },
          },
        },
      },
    })
  )
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
      case "PARSE":
        set.status = 400;
        return {
          status: 400,
          message: "Bad Request",
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
  .get(
    "/",
    () => ({ status: "ok" }),
    {
      detail: {
        summary: "Health Check",
        description: "Memeriksa status operasional server backend.",
        tags: ["General"],
      },
      response: {
        200: t.Object(
          {
            status: t.String({ example: "ok" }),
          },
          { description: "Server beroperasi normal" }
        ),
      },
    }
  )
  .use(routes)
  .use(usersRoute)
  .listen(port);

console.log(`🦊 Elysia server is running at http://${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;
