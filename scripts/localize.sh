#!/usr/bin/bash
EXTENSION_NAME="battery-indicator@jgotti.org"
PROJECT_DIR=$(dirname -- $(dirname -- "${BASH_SOURCE[0]}"))
SRC_DIR="$PROJECT_DIR/src"
PO_DIR="$PROJECT_DIR/po"
LANGS=("en" "fr" "ar" "de" "nl")

echo "Starting localization"
echo "removing old translations"
rm -rf "$SRC_DIR/locale"
for lang in ${LANGS[@]}; do
	lcdir="$SRC_DIR/locale/$lang/LC_MESSAGES"
	echo "create $lang directory"
	mkdir -p "$lcdir"
	echo "compile $lang messages"
	msgfmt "$PO_DIR/$lang.po" -o "$lcdir/$EXTENSION_NAME.mo"
done
echo "Localization done"