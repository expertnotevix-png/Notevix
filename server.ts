import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes go here
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/ai/nvidia", async (req, res) => {
    const nvidiaKey = process.env.VITE_NVIDIA_API_KEY;
    if (!nvidiaKey) {
      console.error("NVIDIA Proxy: Key missing in process.env");
      return res.status(500).json({ error: "NVIDIA API Key (VITE_NVIDIA_API_KEY) is not configured on the server." });
    }

    try {
      console.log("NVIDIA Proxy: Forwarding request for model", req.body.model);
      const nvidiaResponse = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${nvidiaKey}`
        },
        body: JSON.stringify(req.body)
      });

      const responseText = await nvidiaResponse.text();
      
      let data;
      try {
        data = responseText ? JSON.parse(responseText) : { error: "Empty response from NVIDIA" };
      } catch (e) {
        console.error("NVIDIA Proxy: Failed to parse JSON from NVIDIA:", responseText);
        return res.status(502).json({ 
          error: "NVIDIA returned an invalid response. Please try again or check your API key.",
          details: responseText.substring(0, 200)
        });
      }

      if (!nvidiaResponse.ok) {
        console.error("NVIDIA Proxy: NVIDIA returned error status", nvidiaResponse.status, data);
        return res.status(nvidiaResponse.status).json(data);
      }

      res.json(data);
    } catch (error: any) {
      console.error("Server-side NVIDIA Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
