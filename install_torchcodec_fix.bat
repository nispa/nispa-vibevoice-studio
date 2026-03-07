@echo off
REM setup_ffmpeg_system.bat - FFmpeg SYSTEM-WIDE (Admin, 10s)
REM Per VibeVoice/torchcodec

echo [1/3] Install FFmpeg shared (winget Gyan)...
winget install -e --id Gyan.FFmpeg

echo [2/3] PATH system...
setx /M PATH "%PATH%;C:\Program Files\ffmpeg\bin"

echo [3/3] DLL torchcodec (backup)...
xcopy /Y /S "C:\Program Files\ffmpeg\bin\*.dll" "%cd%\venv\Lib\site-packages\torchcodec\" 2>nul

echo RIAVVIA shell! Test: ffmpeg -version
pause
