@echo off
setlocal

echo [GestApp] Cleaning dist directory and terminating common build processes...

REM Remove dist directory if it exists
IF EXIST "dist" (
  echo Removing dist directory...
  rmdir /S /Q "dist"
) ELSE (
  echo dist directory not found; skipping.
)

REM Kill common processes that can lock files during packaging
echo Terminating common processes (node.exe, electron.exe)...
taskkill /IM node.exe /F >nul 2>&1 || echo No node.exe process found
taskkill /IM electron.exe /F >nul 2>&1 || echo No electron.exe process found

echo Cleanup complete. You can now run: npm run dist
pause
