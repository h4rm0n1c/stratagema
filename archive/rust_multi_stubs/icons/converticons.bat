@echo off
for %%f in (*.png) do (
    magick -background transparent "%%f" -define icon:auto-resize=16,24,32,48,64,72,96,128,256,256 "%%~nf.ico" 
)
pause