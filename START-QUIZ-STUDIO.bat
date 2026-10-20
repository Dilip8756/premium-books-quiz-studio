@echo off
setlocal
cd /d "%~dp0"
title Premium Books Quiz Studio

echo ================================================
echo       PREMIUM BOOKS QUIZ STUDIO
echo ================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js nahi mila. Node.js LTS install karke dobara chalayein.
  echo Download: https://nodejs.org/
  pause
  exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
  echo ERROR: npm nahi mila. Node.js installation check karein.
  pause
  exit /b 1
)

where python >nul 2>nul
if not errorlevel 1 (
  set "PYTHON_CMD=python"
  python -m pip show edge-tts >nul 2>nul
  if errorlevel 1 (
    echo Edge TTS dependency install ho rahi hai...
    python -m pip install edge-tts
    if errorlevel 1 (
      echo WARNING: edge-tts install nahi hua. Voice-over generate karne se pehle ise install karein.
    )
  )
) else (
  where py >nul 2>nul
  if not errorlevel 1 (
    set "PYTHON_CMD=py"
    py -m pip show edge-tts >nul 2>nul
    if errorlevel 1 (
      echo Edge TTS dependency install ho rahi hai...
      py -m pip install edge-tts
      if errorlevel 1 echo WARNING: edge-tts install nahi hua.
    )
  ) else (
    echo WARNING: Python nahi mila. Preview UI chalega, lekin Hindi TTS/render ke liye Python install karna hoga.
  )
)

if not exist "node_modules" (
  echo Node dependencies install ho rahi hain. Iske liye internet zaroori hai...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo ERROR: npm install fail hua. Internet connection aur npm error check karein.
    pause
    exit /b 1
  )
)

call npm run ui
if errorlevel 1 (
  echo.
  echo UI start nahi hui. Upar diya gaya error padhein.
  pause
  exit /b 1
)
endlocal
