#!/bin/bash

for f in *.png; do
    convert "$f" -background transparent -define icon:auto-resize=16,24,32,48,64,72,96,128,256 "${f%.*}.ico"
done
