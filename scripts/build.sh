#!/usr/bin/bash
PROJECT_DIR=$(dirname -- $(dirname -- "${BASH_SOURCE[0]}"))
ZIP_FILE="battery-indicator@jgotti.org.shell-extension.zip"
cd $PROJECT_DIR
./scripts/localize.sh
echo "Remove previous build"
rm "./dist/$ZIP_FILE"
echo "packing extension"
cd ./src
zip -r "../dist/$ZIP_FILE" ./
echo "build done"