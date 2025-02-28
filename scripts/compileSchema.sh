#!/bin/bash

# Script to compile GSchema files for the extension

# Get the directory of the extension
EXTENSION_DIR="$(dirname "$(dirname "$(readlink -f "$0")")")"
SCHEMA_DIR="${EXTENSION_DIR}/src/schemas"
TARGET_DIR="${SCHEMA_DIR}"

# Check if schemas directory exists
if [ ! -d "$SCHEMA_DIR" ]; then
    echo "Error: Schema directory not found at $SCHEMA_DIR"
    exit 1
fi

# Compile the schema
echo "Compiling GSchema files in $SCHEMA_DIR..."
if glib-compile-schemas "$SCHEMA_DIR" --targetdir="$TARGET_DIR"; then
    echo "Schema compilation successful. Binary schema created in $TARGET_DIR"
    exit 0
else
    echo "Error: Schema compilation failed."
    exit 1
fi
