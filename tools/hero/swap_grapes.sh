#!/usr/bin/env bash
# Replaces shot 6 of hero-andes.mp4 (Mixkit 24754, hands picking GREEN grapes) with the
# client's own photo of a red bunch (C45), with a slow push-in. All estate grapes are red.
# Works on the published film because the Mixkit sources (hd/) are not kept in the repo.
# Shot 6 spans 14.5s-18.1s (5*(3.6-0.7) .. +3.6); the 0.7s alpha fades replace the crossfades.
set -e
cd "$(dirname "$0")"
SRC=../../public/assets/hero-andes.mp4
ST=14.5; SEG=3.6; XF=0.7; FR=$(awk -v s="$SEG" 'BEGIN{printf "%d", s*25}')

ffmpeg -v error -stats -i "$SRC" -i c45-red-grapes.jpg -filter_complex "
[1:v]scale=6048:-2,zoompan=z='1+0.07*on/$FR':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=$FR:s=1600x900:fps=25,
eq=contrast=1.06:saturation=0.83:gamma=1.02,colorbalance=rs=0.02:gs=0.005:bs=-0.025,format=yuva420p,
fade=in:st=0:d=$XF:alpha=1,fade=out:st=$(awk -v s="$SEG" -v x="$XF" 'BEGIN{print s-x}'):d=$XF:alpha=1,
setpts=PTS-STARTPTS+$ST/TB[g];
[0:v][g]overlay=eof_action=pass,format=yuv420p[vout]" -map "[vout]" \
  -c:v libx264 -preset slow -crf 27 -maxrate 1700k -bufsize 3400k \
  -pix_fmt yuv420p -an -movflags +faststart hero-andes.new.mp4 -y

mv -f hero-andes.new.mp4 "$SRC"
ls -la "$SRC" | awk '{printf "hero-andes.mp4  %.2f MB\n", $5/1048576}'
