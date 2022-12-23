#!/usr/bin/bash
PROJECT_DIR=$(dirname -- $(dirname -- "${BASH_SOURCE[0]}"))
SRC_DIR="$PROJECT_DIR/src/"
cd $SRC_DIR
zip -r ../dist/battery-indicator@jgotti.org.shell-extension.zip ./src/