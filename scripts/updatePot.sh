#!/bin/bash
PROJECT_DIR=$(dirname $(dirname "$(readlink -f "$0" 2>/dev/null || echo "$0")"))
cd $PROJECT_DIR

echo "generate new temp.pot file"
# Extract translatable strings from your code to a temporary POT file
xgettext --from-code=UTF-8 --output=po/temp.pot --keyword=_ --keyword=N_ src/*.js

# Set the correct headers in the POT file
echo "setting POT headers"

# Fix string literal issues using different sed approach
sed -i \
    -e 's/SOME DESCRIPTIVE TITLE\./Battery Indicator Extension/' \
    -e "s/YEAR THE PACKAGE'S COPYRIGHT HOLDER/$(date +%Y) Jonathan Gotti/" \
    -e 's/PACKAGE/battery-indicator/' \
    -e 's/VERSION/1.0/' \
    -e 's|SOME DESCRIPTIVE TITLE|Battery Indicator GNOME Extension|' \
    -e 's|Report-Msgid-Bugs-To:.*\\n"|Report-Msgid-Bugs-To: Jonathan Gotti <jgotti@jgotti.org>\\n"|' \
    po/temp.pot

if [ -f po/battery-indicator.pot ]; then
  echo "update existing battery-indicator.pot file"
  msgmerge --update --no-fuzzy-matching po/battery-indicator.pot po/temp.pot
else
  echo "create new battery-indicator.pot file => you should edit headers informations"
  mv po/temp.pot po/battery-indicator.pot
fi

# Fix specifically the PO-Revision-Date with a more direct sed command
CURRENT_DATE=$(date +"%Y-%m-%d %H:%M%z")
sed -i '/^"PO-Revision-Date:/c\"PO-Revision-Date: '"$CURRENT_DATE"'\\n"' po/battery-indicator.pot

echo "remove temp.pot file"
rm -f po/temp.pot

# then update all po files with new strings
echo "update po files with new strings"
for po in po/*.po; do
  msgmerge --update --no-fuzzy-matching $po po/battery-indicator.pot
done

# clean up and remove all pot?~ files
echo "clean up and remove all po[t]~ files"
rm -f po/*.po~ po/*.pot~
