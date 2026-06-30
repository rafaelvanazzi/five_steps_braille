import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import path from "path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { sendCampaignEmailsHandler } from "./scheduled-handlers";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // ── Headers para assets de áudio binários (SF2 / piano.sf2) ─────────────────
  // Necessário para:
  //   • Range Requests (carregamento parcial de arquivos grandes)
  //   • CORS em desenvolvimento (fetch() cross-origin do Vite dev server)
  //   • Cache longo (arquivo binário estático — nunca muda sem novo deploy)
  //   • Tipo MIME correto (evita que o browser tente renderizar como HTML)
  app.use("/assets", (req, res, next) => {
    const ext = path.extname(req.path).toLowerCase();

    // SoundFont2 e outros binários de áudio
    if (ext === ".sf2") {
      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Cache-Control", "public, max-age=86400, immutable");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    }

    // MP3 / WAV (amostras individuais — caso venham a ser adicionadas)
    if (ext === ".mp3" || ext === ".wav" || ext === ".ogg") {
      res.setHeader("Content-Type",
        ext === ".mp3" ? "audio/mpeg" :
        ext === ".wav" ? "audio/wav"  : "audio/ogg"
      );
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Cache-Control", "public, max-age=604800, immutable"); // 7 dias
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    }

    next();
  });

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // Scheduled handlers (Heartbeat)
  app.post("/api/scheduled/sendCampaignEmails", sendCampaignEmailsHandler);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // Development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
