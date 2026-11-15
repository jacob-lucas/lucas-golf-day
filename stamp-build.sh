#!/bin/sh
# Run after committing code changes, then commit and push build.json.
# build.json records the latest code commit so Setup can link to it.
set -e
cd "$(dirname "$0")"
C=$(git log -1 --format=%H -- . ':!build.json')
T=$(git log -1 --format=%cI "$C")
printf '{"commit":"%s","time":"%s"}\n' "$C" "$T" > build.json
echo "build.json -> $C ($T)"
