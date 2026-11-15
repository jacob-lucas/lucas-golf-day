#!/bin/sh
# Run after committing code changes. Writes build.json for the latest code commit
# and commits it with a message that names the change it stamps.
set -e
cd "$(dirname "$0")"
C=$(git log -1 --format=%H -- . ':!build.json')
T=$(git log -1 --format=%cI "$C")
S=$(git log -1 --format=%s "$C")
printf '{"commit":"%s","time":"%s"}\n' "$C" "$T" > build.json
echo "build.json -> $C ($T)"
if [ -n "$(git status --porcelain build.json)" ]; then
  git add build.json
  git commit -q -m "Build info for: $S" -m "Records the build commit shown under the leaderboard."
fi
