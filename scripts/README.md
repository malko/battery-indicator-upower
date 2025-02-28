# Script utilities to assist in the development of the extension

## Build Scripts
- `build.sh` - Builds the extension by creating a zip file in the dist directory after running localization
- `localize.sh` - Compiles translation files from po directory into the src/locale directory

## Development Scripts
- `updatePot.sh` - Update the pot and po files with new strings
- `link.sh` - Creates a symbolic link to the extension in the GNOME Shell extensions directory
- `unlink.sh` - Removes the symbolic link from the GNOME Shell extensions directory
- `restartShell.sh` - Restarts the GNOME Shell to reload the extension
- `openPrefs.sh` - Opens the extension preferences window

## Debug Scripts
- `debugExt.sh` - Shows extension logs using journalctl
- `debugPrefs.sh` - Shows preferences window logs using journalctl
