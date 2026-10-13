@echo off
title GestApp Server

:: ─── CONFIGURATION ───────────────────────────────────────────────────────────
:: Dossier du projet = dossier contenant ce script (rien a modifier)
set "GESTAPP_DIR=%~dp0"

:: ─── VÉRIFICATION DU DOSSIER ─────────────────────────────────────────────────
if not exist "%GESTAPP_DIR%" (
    echo [ERREUR] Dossier GestApp introuvable : %GESTAPP_DIR%
    echo Modifie le chemin dans ce fichier .bat
    pause
    exit /b 1
)

:: ─── VÉRIFICATION DE NODE ─────────────────────────────────────────────────────
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] Node.js n'est pas installe.
    echo Telecharge-le sur https://nodejs.org
    pause
    exit /b 1
)

:: ─── DEMARRAGE DU SERVEUR ─────────────────────────────────────────────────────
cd /d "%GESTAPP_DIR%"

echo.
echo  ╔══════════════════════════════════════╗
echo  ║       GestApp - Demarrage...         ║
echo  ╚══════════════════════════════════════╝
echo.

:: Lance le serveur en arriere-plan (fenetre cachee)
start "GestApp-Server" /min cmd /c "node server.js"

:: Attendre 2 secondes que le serveur demarre
timeout /t 2 /nobreak >nul

:: Ouvrir automatiquement Chrome sur l'app
start "" "http://localhost:4000"

echo  ✅ GestApp Server demarre avec succes !
echo  🌐 Ouverture automatique dans le navigateur...
echo.
echo  Pour arreter le serveur : fermer la fenetre GestApp-Server
echo  dans la barre des taches.
echo.

:: Fermer cette fenetre apres 3 secondes
timeout /t 3 /nobreak >nul
exit
