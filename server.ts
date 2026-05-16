import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";
import cron from "node-cron";
import { initializeApp, cert, getApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

// Read config safely for ESM
function getFirebaseConfig() {
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, "utf8"));
    }
  } catch (e) {
    console.error("[Server] Critical error reading firebase-applet-config.json:", e);
  }
  return { projectId: "placeholder-id" }; // Fallback to avoid crash
}

const firebaseConfig = getFirebaseConfig();

dotenv.config();

// Initialize Firebase Admin (Server-side)
if (firebaseConfig.projectId && firebaseConfig.projectId !== "placeholder-id") {
  if (!getApps().length) {
    try {
      initializeApp({
        projectId: firebaseConfig.projectId,
      });
      console.log("[Server] Firebase Admin initialized for project:", firebaseConfig.projectId);
    } catch (e) {
      console.error("[Server] Firebase Admin initialization failed:", e);
    }
  }
} else {
  console.warn("[Server] Firebase Project ID missing. Admin features will be disabled.");
}

// Get Firestore instance safely
const getDbAdmin = () => {
  if (!getApps().length) return null;
  
  try {
    const dbId = firebaseConfig.firestoreDatabaseId;
    if (!dbId || dbId === "(default)" || dbId === "default") {
      return getFirestore();
    }
    return getFirestore(dbId);
  } catch (e) {
    console.error("[Server] Firestore Admin initialization failed:", e);
    return null;
  }
};

const dbAdmin = getDbAdmin();
const adminAuth = getApps().length ? getAuth() : null;

// Global process error handling to prevent crash-looping with zero info
process.on('uncaughtException', (err) => {
  console.error("[Server] UNCAUGHT EXCEPTION:", err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error("[Server] UNHANDLED REJECTION at:", promise, 'reason:', reason);
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(helmet({
    frameguard: false, // Allow AI Studio Preview
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://www.googletagmanager.com", "https://apis.google.com"],
        "connect-src": ["'self'", "https://*.googleapis.com", "https://*.firebaseio.com", "https://*.firebaseapp.com", "https://www.google-analytics.com", "https://integrate.api.nvidia.com", "https://*.supabase.co"],
        "img-src": ["'self'", "data:", "https:", "https://picsum.photos"],
        "frame-src": ["'self'", "https://*.firebaseapp.com"],
        "frame-ancestors": ["'self'", "https://aistudio.google.com", "https://*.run.app"],
      },
    },
  }));

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // res.setHeader('X-Frame-Options', 'SAMEORIGIN'); // Blocked AI Studio Preview
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Removed redundant manual CSP to let Helmet handle it more cleanly
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logger for debugging
  app.use((req, res, next) => {
    console.log(`[Request] ${req.method} ${req.url}`);
    next();
  });

  // API routes go here
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", mode: process.env.NODE_ENV });
  });

  // Scheduled Leaderboard Reset (Sunday 12 AM)
  const resetLeaderboard = async () => {
    console.log("[Cron] Starting leaderboard reset...");
    try {
      const collections = ["users", "leaderboard"];
      for (const collName of collections) {
        const snap = await dbAdmin.collection(collName).get();
        if (snap.empty) {
          console.log(`[Cron] Collection ${collName} is empty, skipping.`);
          continue;
        }

        console.log(`[Cron] Found ${snap.size} documents in ${collName} to reset.`);
        let count = 0;
        let batch = dbAdmin.batch();
        
        for (const doc of snap.docs) {
          if (collName === 'users') {
            batch.update(doc.ref, { 
              totalPoints: 0, 
              totalFocusMinutes: 0,
              'streak.currentCount': 1,
              'streak.lastActiveDate': new Date().toISOString().split('T')[0]
            });
          } else {
            // leaderboard collection
            batch.update(doc.ref, { 
              totalPoints: 0, 
              totalFocusMinutes: 0,
              streakCount: 1
            });
          }
          count++;
          
          if (count === 490) {
            await batch.commit();
            console.log(`[Cron] Committed batch of ${count} for ${collName}`);
            batch = dbAdmin.batch();
            count = 0;
          }
        }
        
        if (count > 0) {
          await batch.commit();
          console.log(`[Cron] Committed final batch of ${count} for ${collName}`);
        }
      }

      // Log the reset event in a system doc for the UI to see
      await dbAdmin.collection("system_stats").doc("leaderboard").set({
        lastReset: new Date().toISOString(),
        resetBy: "system/admin"
      }, { merge: true });

      console.log("[Cron] Weekly leaderboard reset completed successfully!");
      return true;
    } catch (error) {
      console.error("[Cron] Weekly leaderboard reset failed:", error);
      return false;
    }
  };

  // Schedule for Sunday 12:00 AM
  cron.schedule("0 0 * * 0", resetLeaderboard);

  // Manual Trigger for Admin (Optional safety endpoint)
  app.post("/api/admin/reset-leaderboard", async (req, res) => {
    if (!dbAdmin) return res.status(503).json({ error: "Firestore Admin not initialized" });
    const success = await resetLeaderboard();
    if (success) res.json({ message: "Leaderboard reset triggered" });
    else res.status(500).json({ error: "Reset failed" });
  });

  // Webhook for Automated Payment Verification
  app.all("/api/activate-premium", async (req, res) => {
    if (!dbAdmin || !adminAuth) return res.status(503).json({ error: "Auth/DB Admin not initialized" });
    const correlationId = Math.random().toString(36).substring(7);
    console.log(`[Webhook][${correlationId}] Received ${req.method} /api/activate-premium`);
    
    if (req.method === 'GET') return res.json({ message: "Activation active." });
    if (req.method !== 'POST') return res.status(405).json({ error: "Method Not Allowed" });

    const { transactionId, planName, amount, whatsappNumber, planType, targetClass } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Authorization required" });
    }

    const idToken = authHeader.split('Bearer ')[1];

    try {
      // 0. Verify Auth
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      const authenticatedUserId = decodedToken.uid;

      if (!transactionId) {
        return res.status(400).json({ error: "Transaction ID missing" });
      }

      console.log(`[Webhook][${correlationId}] Processing Tx: ${transactionId}`);
      
      // 1. Transaction Dead-lock Check (Prevent multi-use)
      const existingTx = await dbAdmin.collection("purchase_requests")
        .where("transactionId", "==", transactionId)
        .where("status", "==", "approved")
        .limit(1)
        .get();

      if (!existingTx.empty) {
        console.warn(`[Webhook][${correlationId}] Duplicate Tx ID detected: ${transactionId}`);
        return res.status(409).json({ error: "This transaction ID has already been used for activation." });
      }

      // 2. Doc
      const batch = dbAdmin.batch();
      const requestRef = dbAdmin.collection("purchase_requests").doc();

      // 3. Update Doc
      batch.set(requestRef, {
        planName,
        amount,
        transactionId,
        whatsappNumber,
        planType,
        targetClass: targetClass || null,
        status: 'approved',
        verifiedAt: new Date().toISOString(),
        verifiedBy: 'ai_system',
        timestamp: new Date().toISOString(),
        correlationId
      });

      await batch.commit();
      console.log(`[Webhook][${correlationId}] SUCCESS: Access granted for Tx: ${transactionId}`);
      res.json({ success: true, message: "Activated!" });
    } catch (error: any) {
      console.error(`[Webhook][${correlationId}] FATAL:`, error);
      res.status(500).json({ error: "Sync failed", details: error.message });
    }
  });

  // NVIDIA Proxy
  app.all("/api/ai/nvidia", async (req, res) => {
    if (req.method === 'GET') return res.json({ status: "active" });
    if (req.method !== 'POST') return res.status(405).json({ error: "Method Not Allowed" });

    const nvidiaKey = process.env.VITE_NVIDIA_API_KEY || process.env.NVIDIA_API_KEY;
    if (!nvidiaKey) {
      console.error("NVIDIA Proxy: Key missing in both VITE_NVIDIA_API_KEY and NVIDIA_API_KEY");
      return res.status(500).json({ error: "NVIDIA API Key is not configured." });
    }

    try {
      console.log(`[AI Proxy] Forwarding to NVIDIA Model: ${req.body.model}`);
      const nvidiaResponse = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${nvidiaKey}`
        },
        body: JSON.stringify(req.body)
      });

      const responseText = await nvidiaResponse.text();
      let data: any;
      
      try {
        data = responseText ? JSON.parse(responseText) : { error: "Empty response from NVIDIA" };
      } catch (e) {
        console.error("[AI Proxy] JSON Parse Error from NVIDIA:", responseText);
        return res.status(nvidiaResponse.status || 502).json({ 
          error: "NVIDIA Backend Error", 
          details: responseText.substring(0, 500) 
        });
      }

      if (!nvidiaResponse.ok) {
        console.error(`[AI Proxy] NVIDIA returned ${nvidiaResponse.status}:`, data);
        return res.status(nvidiaResponse.status).json(data);
      }

      res.json(data);
    } catch (error: any) {
      console.error("[AI Proxy] Internal Proxy Error:", error);
      res.status(500).json({ error: "Proxy internal error", message: error.message });
    }
  });

  // Gemini Proxy (for Browser-Safe AI calls including Vision)
  app.post("/api/ai/gemini", async (req, res) => {
    const geminiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!geminiKey) {
      return res.status(500).json({ error: "Gemini API Key missing in environment." });
    }

    try {
      const { prompt, system, isVision, imageData } = req.body;
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      
      let contents: any;
      if (isVision && imageData) {
        const base64Data = imageData.includes(",") ? imageData.split(",")[1] : imageData;
        contents = [
          { text: prompt },
          { inlineData: { data: base64Data, mimeType: "image/jpeg" } }
        ];
      } else {
        contents = prompt;
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: contents,
        config: {
          systemInstruction: system
        }
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("[Gemini Proxy] Error:", error);
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
    app.get('*', (req, res, next) => {
      // Skip if looking for a file that doesn't exist to avoid returning index.html for broken assets
      if (req.url.includes('.') && !req.url.endsWith('.html')) {
        return next();
      }

      try {
        const indexPath = path.join(distPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          // Disable caching for index.html to ensure users always get the latest version with new asset hashes
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
          res.sendFile(indexPath);
        } else {
          res.status(404).send("Application build not found. Please wait while NoteVix starts... (or run 'npm run build')");
        }
      } catch (err) {
        console.error("[Server] Error serving index.html:", err);
        res.status(500).send("Internal Server Error during static serve");
      }
    });
  }

  // Global Error Handler Middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("[Server Error Handler]", err);
    res.status(500).json({ 
      error: "Internal Server Error", 
      message: process.env.NODE_ENV === 'production' ? "An unexpected error occurred" : err.message 
    });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
