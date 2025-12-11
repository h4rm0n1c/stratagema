@echo off
setlocal enabledelayedexpansion

:: Correctly set the root folder (NO quotes inside the SET)
set ROOT_DIR=%cd%
set RELEASE_DIR=%ROOT_DIR%\..\macro_release

echo ROOT_DIR is %ROOT_DIR%
echo RELEASE_DIR is %RELEASE_DIR%

:: Create the release folder if it doesn't exist
if not exist "%RELEASE_DIR%" (
    mkdir "%RELEASE_DIR%"
)

:: Loop through all directories in ROOT_DIR
for /d %%D in ("%ROOT_DIR%\*") do (
    if exist "%%D\Cargo.toml" (
        echo Building project in %%D...
        pushd "%%D"
        cargo build --release

        :: find .exe file under target\release
        for %%F in ("target\release\*.exe") do (
            echo Copying %%~nxF to "%RELEASE_DIR%"...
            copy "%%F" "%RELEASE_DIR%\%%~nxF" >nul
        )

        popd
    )
)

echo All projects have been built and executables copied to the release folder.
pause
