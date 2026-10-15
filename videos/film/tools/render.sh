#!/usr/bin/env bash
# Render the film straight to the shareable file. Format validated on 2026-10-12: two-pass H.264 at 7 Mb/s,
# audio at -14 LUFS. The HyperFrames master (~300 Mo, no visible gain) only lives in a temp folder.
#
#   tools/render.sh                  # ../renders/film.mp4
#   tools/render.sh -m M3            # same picture with music-M3.wav: ../renders/film-M3.mp4
#   tools/render.sh -d -o out.mp4    # draft quality, custom output
set -euo pipefail
cd "$(dirname "$0")/.."

music="" out="" quality=()
while getopts "m:o:d" opt; do
  case $opt in
    m) music="$OPTARG" ;;
    o) out="$OPTARG" ;;
    d) quality=(-q draft) ;;
    *) exit 2 ;;
  esac
done
out="${out:-../renders/film${music:+-$music}.mp4}"
mkdir -p "$(dirname "$out")"

tmp="$(mktemp -d)"
trap 'trash "$tmp"' EXIT
master="$tmp/master.mp4"
pnpm dlx hyperframes@0.8.140 render -o "$master" ${quality[@]+"${quality[@]}"}

# A music variant only swaps the audio track: the picture never depends on it, and loudnorm evens out the levels.
audio_source="$master"
if [[ -n "$music" ]]; then
  audio_source="assets/audio/music-$music.wav"
  [[ -f "$audio_source" ]] || { echo "$audio_source missing: uv run music/music_$music.py" >&2; exit 1; }
fi

ffmpeg -loglevel error -y -i "$master" -c:v libx264 -preset slow -b:v 7M -pass 1 -passlogfile "$tmp/x264" -an -f mp4 /dev/null
ffmpeg -loglevel error -y -i "$master" -i "$audio_source" -map 0:v -map 1:a -shortest \
  -c:v libx264 -preset slow -b:v 7M -maxrate 9M -bufsize 14M -pass 2 -passlogfile "$tmp/x264" -pix_fmt yuv420p \
  -af loudnorm=I=-14:TP=-1.5:LRA=11 -ar 48000 -c:a aac -b:a 160k -movflags +faststart "$out"
echo "$out"
