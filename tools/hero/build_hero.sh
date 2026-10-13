#!/usr/bin/env bash
# Builds the Altamira de los Andes hero film from licensed Mixkit clips.
# Story: the heights -> the valley -> the vines -> the fruit -> the hands -> the wine
#        -> a dramatic dusk over the mountains -> back up to the peaks (loops).
set -e
cd "$(dirname "$0")/hd"

SEG=3.6          # seconds per shot
XF=0.7           # crossfade length
W=1600; H=900; FPS=25

# file  start  extra-saturation(1=global)  speed(>1 = slower motion)
CLIPS=(
  "4396   0.5  1.0   2.2"   # snow peaks above the clouds — clouds slowed down (client)
  "51689  7.0  1.0   1.0"   # flying over a rocky snow-capped peak
  "8292   2.0  1.0   1.0"   # aerial descent over the vineyard rows
  "29340  3.0  0.95  1.0"   # moving through the vines, ground level
  "17782  6.0  0.72  1.0"   # ripe grapes — shot is vivid, pull it back to the house palette
  "24754  8.0  0.92  1.0"   # hands selecting the fruit
  "22734  5.0  1.0   1.0"   # red wine poured into the glass
  "4695   1.8  1.05  1.0"   # dramatic dusk over the mountains (Andes-like, replaces vineyard sunset)
  "4396   9.0  1.0   2.2"   # back to the peaks, clouds slowed — loops into shot 1
)

INPUTS=(); FILTER=""; N=${#CLIPS[@]}
for i in "${!CLIPS[@]}"; do
  set -- ${CLIPS[$i]}
  SAT=$(awk -v s="$3" 'BEGIN{printf "%.3f", 0.90*s}')
  SPD="$4"
  SRC=$(awk -v seg="$SEG" -v s="$SPD" 'BEGIN{printf "%.3f", seg/s + 0.3}')   # source length to grab
  INPUTS+=( -ss "$2" -t "$SRC" -i "$1.mp4" )
  # slow the motion (setpts), normalise geometry + unified grade: gentle contrast, slightly warm
  FILTER+="[$i:v]setpts=${SPD}*PTS,scale=$W:$H:force_original_aspect_ratio=increase,crop=$W:$H,fps=$FPS,setpts=PTS-STARTPTS,"
  FILTER+="trim=0:$SEG,setpts=PTS-STARTPTS,"
  FILTER+="eq=contrast=1.06:saturation=$SAT:gamma=1.02,colorbalance=rs=0.02:gs=0.005:bs=-0.025,format=yuv420p[v$i];"
done

# crossfade chain
PREV="[v0]"
for ((k=1;k<N;k++)); do
  OFF=$(awk -v k="$k" -v s="$SEG" -v x="$XF" 'BEGIN{printf "%.2f", k*(s-x)}')
  OUT="[x$k]"; [ "$k" -eq $((N-1)) ] && OUT="[vout]"
  FILTER+="${PREV}[v$k]xfade=transition=fade:duration=$XF:offset=$OFF$OUT;"
  PREV="$OUT"
done
FILTER="${FILTER%;}"

ffmpeg -v error -stats "${INPUTS[@]}" -filter_complex "$FILTER" -map "[vout]" \
  -c:v libx264 -preset slow -crf 30 -maxrate 1700k -bufsize 3400k \
  -pix_fmt yuv420p -an -movflags +faststart ../hero-andes.mp4 -y

echo
ls -la ../hero-andes.mp4 | awk '{printf "hero-andes.mp4  %.2f MB\n", $5/1048576}'
ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 ../hero-andes.mp4
