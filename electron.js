/**
 * GestApp — Electron Main Process
 * Lance le serveur réseau local automatiquement + ouvre la fenêtre principale
 */

const { app, BrowserWindow, ipcMain } = require("electron");
const path     = require("path");
const { fork } = require("child_process");
const os       = require("os");
const net      = require("net");

// ─── CONFIGURATION ────────────────────────────────────────────────────────────
const SERVER_PORT = 4000;
const SERVER_FILE = path.join(__dirname, "server.js");

// ─── UTILITAIRES ──────────────────────────────────────────────────────────────
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) return iface.address;
    }
  }
  return "127.0.0.1";
}

function isPortBusy(port) {
  return new Promise((resolve) => {
    const tester = net.createConnection({ port, host: "127.0.0.1" });
    tester.once("connect", () => { tester.destroy(); resolve(true); });
    tester.once("error",   () => {                   resolve(false); });
  });
}

// ─── SERVEUR ──────────────────────────────────────────────────────────────────
let serverProcess = null;

async function startServer() {
  const busy = await isPortBusy(SERVER_PORT);
  if (busy) { console.log("[GestApp] Serveur deja actif sur le port", SERVER_PORT); return; }
  try {
    serverProcess = fork(SERVER_FILE, [], {
      silent: false,
      env: { ...process.env, NODE_ENV: "production" },
    });
    serverProcess.on("error", (err) => console.error("[GestApp] Erreur serveur:", err.message));
    serverProcess.on("exit",  (code) => { console.log("[GestApp] Serveur arrete code:", code); serverProcess = null; });
    console.log("[GestApp] Serveur demarre PID:", serverProcess.pid);
  } catch (err) {
    console.error("[GestApp] Impossible de demarrer le serveur:", err.message);
  }
}

function stopServer() {
  if (serverProcess) { serverProcess.kill("SIGTERM"); serverProcess = null; }
}

// ─── FENETRE PRINCIPALE ───────────────────────────────────────────────────────
let mainWindow = null;

function createWindow() {
  const ip = getLocalIP();
  mainWindow = new BrowserWindow({
    width: 1366, height: 768, minWidth: 900, minHeight: 600,
    title: "GestApp — Serveur : " + ip + ":" + SERVER_PORT,
    icon: path.join(__dirname, "public", "logo.ico"),
    webPreferences: { nodeIntegration: true, contextIsolation: false },
    backgroundColor: "#0a0a0f",
  });
  mainWindow.loadFile(path.join(__dirname, "build", "index.html"));
  mainWindow.setMenuBarVisibility(false);
  mainWindow.on("closed", () => { mainWindow = null; });
}

// ─── IMPRESSION THERMIQUE ─────────────────────────────────────────────────────

ipcMain.handle("get-printers", async () => {
  try {
    const printers = await mainWindow.webContents.getPrintersAsync();
    return printers.map(p => ({
      name:        p.name,
      displayName: p.displayName || p.name,
      isDefault:   p.isDefault,
      status:      p.status,
    }));
  } catch (err) {
    console.error("[GestApp] get-printers:", err.message);
    return [];
  }
});

ipcMain.handle("print-ticket", async (_event, htmlContent, deviceName) => {
  if (!htmlContent) {
    return { success: false, errorType: "empty_content" };
  }

  const printUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;

  return new Promise((resolve) => {
    const printWindow = new BrowserWindow({
      show: false,
      width: 400,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        javascript: true,
      },
    });

    let done = false;

    const cleanup = () => {
      setTimeout(() => {
        try { printWindow.destroy(); } catch {}
      }, 1500);
    };

    const finish = (success, errorType = null) => {
      if (done) return;
      done = true;
      cleanup();
      resolve({ success, errorType });
    };

    printWindow.webContents.once("did-finish-load", () => {
      console.log("[GestApp] HTML charge — attente du rendu avant impression...");

      setTimeout(async () => {
        try {
          const textLength = await printWindow.webContents.executeJavaScript(
            "document.body ? document.body.innerText.trim().length : 0"
          );

          console.log("[GestApp] Contenu texte rendu:", textLength, "caracteres");

          if (textLength < 5) {
            console.error("[GestApp] Contenu vide — annulation");
            finish(false, "empty_content");
            return;
          }

          printWindow.webContents.print(
            {
              silent: true,
              printBackground: false,
              deviceName: deviceName || undefined,
              color: false,
              margins: { marginType: "none" },
            },
            (success, errorType) => {
              console.log("[GestApp] Impression:", success ? "OK" : errorType);
              finish(success, errorType || null);
            }
          );
        } catch (err) {
          console.error("[GestApp] Erreur impression:", err.message);
          finish(false, "print_error");
        }
      }, 800);
    });

    printWindow.webContents.once("did-fail-load", (_event, code, desc) => {
      console.error("[GestApp] Echec chargement:", code, desc);
      finish(false, "load_failed");
    });

    printWindow.loadURL(printUrl).catch(() => {
      finish(false, "load_failed");
    });

    setTimeout(() => {
      if (done) return;
      done = true;
      console.warn("[GestApp] Timeout impression");
      try { if (!printWindow.isDestroyed()) printWindow.destroy(); } catch {}
      resolve({ success: false, errorType: "timeout" });
    }, 20000);
  });
});

// ─── CYCLE DE VIE ─────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  await startServer();
  setTimeout(createWindow, 500);
});

app.on("window-all-closed", () => { stopServer(); app.quit(); });
app.on("before-quit",       () => { stopServer(); });
app.on("activate",          () => { if (mainWindow === null) createWindow(); });