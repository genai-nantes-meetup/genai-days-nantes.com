#!/usr/bin/env bash
# Render the film straight to the shareable file. Two-pass H.264 at 3 Mb/s (04/11: 7 Mb/s gave 50 Mo for no visible gain, SSIM 0.99),
# audio at -14 LUFS. The HyperFrames master (~300 Mo, no visible gain) only lives in a temp folder.
#
#   tools/render.sh                  # ../renders/film.mp4
#   tools/render.sh -m M3            # same picture with music-M3.wav: ../renders/film-M3.mp4
#   tools/render.sh -d -o out.mp4    # draft quality, custom output
set -euo pipefail
cd "$(dirname "$0")/.."

music="" out="" quality=()
# pnpm forwards an explicit option separator to the script.
if [[ "${1:-}" == "--" ]]; then shift; fi
while getopts "m:o:d" opt; do
  case $opt in
    m) music="$OPTARG" ;;
    o) out="$OPTARG" ;;
    d) quality=(-q draft) ;;
    *) exit 2 ;;
  esac
done
shift "$((OPTIND - 1))"
if [[ "$#" -ne 0 ]]; then
  echo "Unexpected render argument: $1" >&2
  exit 2
fi
out="${out:-../renders/film${music:+-$music}.mp4}"
# Old renders are kept for comparison: never overwrite one, pick a new name with -o.
if [[ -e "$out" ]]; then
  echo "$out already exists: pass -o with a new name, old renders are never overwritten" >&2
  exit 1
fi
mkdir -p "$(dirname "$out")"

tmp="$(mktemp -d)"
trap 'trash "$tmp"' EXIT
master="$tmp/master.mp4"
pnpm dlx hyperframes@0.8.140 render -o "$master" ${quality[@]+"${quality[@]}"}

# A music variant only swaps the audio track: the picture never depends on it, and loudnorm evens out the levels.
audio_source="$master"
if [[ -n "$music" ]]; then
  audio_source="assets/audio/music-$music.wav"
  [[ -f "$audio_source" ]] || { echo "$audio_source missing" >&2; exit 1; }
fi

# The film has no soundtrack until the music step: encode the picture alone when there is no audio to map.
audio=(-an)
if [[ -n "$(ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$audio_source")" ]]; then
  audio=(-map 1:a -shortest -af loudnorm=I=-14:TP=-1.5:LRA=11 -ar 48000 -c:a aac -b:a 160k)
fi

ffmpeg -loglevel error -y -i "$master" -c:v libx264 -preset slow -b:v 3M -pass 1 -passlogfile "$tmp/x264" -an -f mp4 /dev/null
ffmpeg -loglevel error -y -i "$master" -i "$audio_source" -map 0:v "${audio[@]}" \
  -c:v libx264 -preset slow -b:v 3M -maxrate 4500k -bufsize 9M -pass 2 -passlogfile "$tmp/x264" -pix_fmt yuv420p \
  -movflags +faststart "$out"
echo "$out"
