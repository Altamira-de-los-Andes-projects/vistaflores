#!/usr/bin/env bash
# Removes both grape shots (Mixkit 17782 and the C45 overlay, 11.6s-18.1s) from the published
# hero-andes.mp4 (client request): the vines shot now crossfades straight into the wine pour.
set -e
cd "$(dirname "$0")"
SRC=../../public/assets/hero-andes.mp4
A_END=11.6; B_START=18.1; XF=0.7

ffmpeg -v error -stats -i "$SRC" -filter_complex "
[0:v]trim=0:$A_END,setpts=PTS-STARTPTS[a];
[0:v]trim=start=$B_START,setpts=PTS-STARTPTS[b];
[a][b]xfade=transition=fade:duration=$XF:offset=$(awk -v e="$A_END" -v x="$XF" 'BEGIN{print e-x}'),format=yuv420p[vout]" \
  -map "[vout]" -c:v libx264 -preset slow -crf 27 -maxrate 1700k -bufsize 3400k \
  -pix_fmt yuv420p -an -movflags +faststart hero-andes.new.mp4 -y

mv -f hero-andes.new.mp4 "$SRC"
ls -la "$SRC" | awk '{printf "hero-andes.mp4  %.2f MB\n", $5/1048576}'
