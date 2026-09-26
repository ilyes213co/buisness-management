/**
 * GestApp — Serveur Réseau Local
 * Express HTTP + WebSocket pour synchronisation multi-appareils
 * Port : 4000
 */

const http    = require("http");
const path    = require("path");
const fs      = require("fs");
const express = require("express");
const { WebSocketServer, WebSocket } = require("ws");
const cors    = require("cors");
const os      = require("os");

// ─── CONFIGURATION ────────────────────────────────────────────────────────────
const PORT      = 4000;
const DATA_FILE = path.join(__dirname, "gestapp-data.json");

// Clés partagées entre tous les appareils
const SHARED_KEYS = [
  "gestapp_tables",
  "gestapp_commandes",
  "gestapp_employes",
  "gestapp_achats",
  "gestapp_menu",
  "gestapp_menu_categories",
  "gestapp_catalogue",
  "gestapp_cat_categories",
  "gestapp_comptes",
  "gestapp_logs",
];

// ─── UTILITAIRES ──────────────────────────────────────────────────────────────

/** Récupère l'adresse IP locale du PC sur le réseau WiFi */
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "127.0.0.1";
}

/** Lit les données depuis le fichier JSON */
function readData() {
  try {
    if (!fs.existsSync(DATA_FILE)) return {};
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/** Écrit les données dans le fichier JSON (atomique) */
function writeData(data) {
  try {
    const tmp = DATA_FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tmp, DATA_FILE);
  } catch (err) {
    console.error("[GestApp] Erreur écriture données:", err.message);
  }
}

/** Formate l'heure pour les logs */
function timestamp() {
  return new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// ─── SERVEUR EXPRESS ──────────────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Servir le build React (pour les clients via navigateur)
const buildPath = path.join(__dirname, "build");
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
}

// ── GET /api/status → vérification que le serveur est vivant ──
app.get("/api/status", (_req, res) => {
  res.json({
    ok:      true,
    version: "1.0.0",
    ip:      getLocalIP(),
    port:    PORT,
    clients: wss.clients.size,
    time:    new Date().toISOString(),
  });
});

// ── GET /api/data → toutes les données partagées ──
app.get("/api/data", (_req, res) => {
  const data = readData();
  res.json({ ok: true, data });
});

// ── GET /api/data/:key → une clé spécifique ──
app.get("/api/data/:key", (req, res) => {
  const { key } = req.params;
  if (!SHARED_KEYS.includes(key)) {
    return res.status(403).json({ ok: false, error: "Clé non autorisée" });
  }
  const data = readData();
  res.json({ ok: true, key, value: data[key] ?? null });
});

// ── POST /api/data/:key → écriture + broadcast WebSocket ──
app.post("/api/data/:key", (req, res) => {
  const { key } = req.params;
  const { value } = req.body;

  if (!SHARED_KEYS.includes(key)) {
    return res.status(403).json({ ok: false, error: "Clé non autorisée" });
  }
  if (value === undefined) {
    return res.status(400).json({ ok: false, error: "Valeur manquante" });
  }

  // Sauvegarde
  const data = readData();
  data[key]  = value;
  writeData(data);

  // Broadcast à tous les clients WebSocket connectés
  const message = JSON.stringify({ type: "UPDATE", key, value });
  let broadcastCount = 0;
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
      broadcastCount++;
    }
  });

  console.log(`[${timestamp()}] MAJ "${key}" → broadcast à ${broadcastCount} client(s)`);
  res.json({ ok: true, broadcast: broadcastCount });
});

// ── Fallback → servir index.html pour le routing React ──
app.get("*", (_req, res) => {
  const indexPath = path.join(buildPath, "index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.json({ ok: true, message: "GestApp Server running. Build React pour l'interface." });
  }
});

// ─── SERVEUR WEBSOCKET ────────────────────────────────────────────────────────
const wss = new WebSocketServer({ server });

wss.on("connection", (ws, req) => {
  const clientIP = req.socket.remoteAddress?.replace("::ffff:", "") || "inconnu";
  console.log(`[${timestamp()}] 🟢 Client connecté : ${clientIP} (total: ${wss.clients.size})`);

  // Envoi immédiat de toutes les données au nouveau client
  const data = readData();
  ws.send(JSON.stringify({ type: "INIT", data }));

  ws.on("close", () => {
    console.log(`[${timestamp()}] 🔴 Client déconnecté : ${clientIP} (total: ${wss.clients.size})`);
  });

  ws.on("error", (err) => {
    console.error(`[${timestamp()}] ⚠️  Erreur WebSocket client ${clientIP}:`, err.message);
  });
});

// ─── DÉMARRAGE ────────────────────────────────────────────────────────────────
server.listen(PORT, "0.0.0.0", () => {
  const ip = getLocalIP();
  console.log("╔══════════════════════════════════════════╗");
  console.log("║         GestApp — Serveur Réseau         ║");
  console.log("╠══════════════════════════════════════════╣");
  console.log(`║  ✅ Serveur actif sur le port ${PORT}        ║`);
  console.log(`║  🌐 IP réseau local : ${ip.padEnd(19)}║`);
  console.log(`║  📱 URL clients : http://${ip}:${PORT}  ║`);
  console.log("╠══════════════════════════════════════════╣");
  console.log(`║  📂 Données : gestapp-data.json          ║`);
  console.log("╚══════════════════════════════════════════╝");
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`[GestApp] ❌ Port ${PORT} déjà utilisé. Un serveur tourne peut-être déjà.`);
  } else {
    console.error("[GestApp] ❌ Erreur serveur:", err.message);
  }
});
