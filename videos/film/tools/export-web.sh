#!/usr/bin/env bash
# Shareable export, validated by the user on 2026-10-12: two-pass H.264 at 7 Mb/s, audio at -14 LUFS.
# The grain and screen-print textures change every frame, so constant-quality encodes balloon to ~19 Mb/s.
set -euo pipefail
master="$1"
out="${2:-${master%.mp4}-light.mp4}"
log="$(mktemp -d)/x264"
ffmpeg -loglevel error -y -i "$master" -c:v libx264 -preset slow -b:v 7M -pass 1 -passlogfile "$log" -an -f mp4 /dev/null
ffmpeg -loglevel error -y -i "$master" -c:v libx264 -preset slow -b:v 7M -maxrate 9M -bufsize 14M -pass 2 -passlogfile "$log" \
  -pix_fmt yuv420p -af loudnorm=I=-14:TP=-1.5:LRA=11 -ar 48000 -c:a aac -b:a 160k -movflags +faststart "$out"
echo "$out"
