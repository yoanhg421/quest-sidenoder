@echo off

mkdir sideloader_deps 2> NUL

IF EXIST "C:\Program Files\7-Zip\7z.exe" (
  echo 7-zip is present
) ELSE (
  echo Downloading and installing 7zip'
  curl  --ssl-no-revoke https://www.7-zip.org/a/7z1900-x64.exe -o sideloader_deps/7zip.exe
  START /WAIT sideloader_deps/7zip.exe
)


echo Downloading rclone
curl  --ssl-no-revoke -L https://downloads.rclone.org/rclone-current-windows-amd64.zip -o sideloader_deps/rclone.zip
echo Downloading adb
curl  --ssl-no-revoke -L https://dl.google.com/android/repository/platform-tools-latest-windows.zip  -o sideloader_deps/android-tools.zip

cd sideloader_deps

echo Unzipping rclone
"C:\Program Files\7-Zip\7z.exe" x -y rclone.zip > NUL
echo Unzipping adb
"C:\Program Files\7-Zip\7z.exe" x -y android-tools.zip > NUL
echo Combining folders
SET COPYCMD=/Y
for /d %%a in (rclone-*) do (
    move /y %%a\rclone.exe platform-tools\ > NUL
    del /F /Q %%a > NUL
    rmdir %%a > NUL
)
echo Adding to PATH
:: Get System PATH
for /f "tokens=2*" %%A in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path') do set syspath=%%B

:: Get User Path
for /f "tokens=2*" %%A in ('reg query "HKCU\Environment" /v Path') do set userpath=%%B

:: TODO:check if already in path
setx PATH "%userpath%;%~dp0sideloader_deps\platform-tools"


echo Dependencies installed.
echo You can start SideNoder application

pause
exit