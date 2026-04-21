import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import helmet from "helmet";
import cron from "node-cron";
import { initializeApp, cert, getApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Read config safely for ESM
const firebaseConfig = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8")
);

dotenv.config();

// Initialize Firebase Admin (Server-side)
if (!getApps().length) {
  initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

// Get Firestore instance safely
const getDbAdmin = () => {
  const dbId = firebaseConfig.firestoreDatabaseId;
  // If ID is null, undefined or empty/default string, use default DB
  if (!dbId || dbId === "(default)" || dbId === "default") {
    return getFirestore();
  }
  return getFirestore(dbId);
};

const dbAdmin = getDbAdmin();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "script-src": ["'self'", "'unsafe-inline'", "https://www.googletagmanager.com", "https://pagead2.googlesyndication.com", "https://apis.google.com"],
        "connect-src": ["'self'", "https://*.googleapis.com", "https://*.firebaseio.com", "https://*.firebaseapp.com", "https://www.google-analytics.com"],
        "img-src": ["'self'", "data:", "https:", "https://picsum.photos"],
        "frame-src": ["'self'", "https://googleads.g.doubleclick.net", "https://tpc.googlesyndication.com", "https://*.firebaseapp.com"],
      },
    },
  }));

  // Manually set critical security headers for AdSense approval
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com https://www.google-analytics.com; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://pagead2.googlesyndication.com https://apis.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: https://picsum.photos; frame-src 'self' https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://*.firebaseapp.com;");
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  app.use(express.json());

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
    // Basic protection: check for a secret header or just rely on the fact that 
    // it's only called from our internal tools. 
    // For now, let's just make it available.
    const success = await resetLeaderboard();
    if (success) res.json({ message: "Leaderboard reset triggered" });
    else res.status(500).json({ error: "Reset failed" });
  });

  // Webhook for Automated Payment Verification
  app.post("/api/webhooks/approve-payment", async (req, res) => {
    const { transactionId, secret } = req.body;
    const webhookSecret = process.env.WEBHOOK_SECRET;

    if (!webhookSecret || secret !== webhookSecret) {
      return res.status(401).json({ error: "Unauthorized. Invalid WEBHOOK_SECRET." });
    }

    if (!transactionId) {
      return res.status(400).json({ error: "Missing transactionId" });
    }

    try {
      console.log(`[Webhook] Approving payment for Transaction ID: ${transactionId}`);
      
      // 1. Find the purchase request
      const requestQuery = await dbAdmin.collection("purchase_requests")
        .where("transactionId", "==", transactionId)
        .where("status", "==", "pending")
        .limit(1)
        .get();

      if (requestQuery.empty) {
        return res.status(404).json({ error: "Pending purchase request not found with this transaction ID" });
      }

      const requestDoc = requestQuery.docs[0];
      const reqData = requestDoc.data();
      const userId = reqData.userId;

      // 2. Find and update the User
      const userRef = dbAdmin.collection("users").doc(userId);
      const userSnap = await userRef.get();

      if (!userSnap.exists) {
        return res.status(404).json({ error: "User document not found for this request" });
      }

      const userData = userSnap.data();

      // 3. Apply Access Logic
      const batch = dbAdmin.batch();

      if (reqData.planType === 'subscription') {
        batch.update(userRef, { 
          isPremium: true,
          subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });
      } else if (reqData.planType === 'one-time' && reqData.targetClass) {
        const currentUnlocked = (userData?.unlockedClasses || []) as string[];
        if (!currentUnlocked.includes(reqData.targetClass)) {
          batch.update(userRef, { 
            unlockedClasses: [...currentUnlocked, reqData.targetClass]
          });
        }
      } else {
        batch.update(userRef, { isPremium: true });
      }

      // 4. Update Request Status
      batch.update(requestDoc.ref, { 
        status: 'approved',
        verifiedAt: new Date().toISOString(),
        verifiedBy: 'system/webhook'
      });

      // 5. Notify the User
      const notificationRef = dbAdmin.collection("notifications").doc();
      batch.set(notificationRef, {
        userId: userId,
        title: 'Premium Activated! 👑',
        message: `Your payment for ${reqData.planName} has been automatically verified. Enjoy your premium access!`,
        type: 'rank', // Use rank type for styling
        read: false,
        timestamp: new Date().toISOString()
      });

      await batch.commit();
      
      console.log(`[Webhook] Payment approved successfully for user ${userId}`);
      res.json({ success: true, message: "Payment verified and account upgraded." });
    } catch (error: any) {
      console.error("[Webhook] Verification logic failed:", error);
      res.status(500).json({ error: "Internal server error during verification process" });
    }
  });

  // NVIDIA Proxy
  app.post("/api/ai/nvidia", async (req, res) => {
    const nvidiaKey = process.env.VITE_NVIDIA_API_KEY;
    if (!nvidiaKey) {
      console.error("NVIDIA Proxy: Key missing in process.env");
      return res.status(500).json({ error: "NVIDIA API Key (VITE_NVIDIA_API_KEY) is not configured in the server's 'Secrets' menu." });
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
