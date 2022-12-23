#!/usr/bin/bash
PROJECT_DIR=$(dirname -- $(dirname -- "${BASH_SOURCE[0]}"))
cd $PROJECT_DIR
./scripts/localize.sh
echo "packing extension"
cd ./src
zip -r ../dist/battery-indicator@jgotti.org.shell-extension.zip ./
echo "build done"