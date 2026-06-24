#!/usr/bin/env bash
# Validates DADS-related agent skills: frontmatter, links, description limits.
# Run from the repository root: bash .agents/skills/validate-dads-skills.sh
set -euo pipefail

SKILLS_DIR=".agents/skills"
SKILLS=(dads-foundations-core project-dads-policy dads-ui-review)
EXIT_CODE=0

for skill in "${SKILLS[@]}"; do
  file="$SKILLS_DIR/$skill/SKILL.md"
  if [ ! -f "$file" ]; then
    echo "FAIL: $file does not exist"
    EXIT_CODE=1
    continue
  fi

  # Extract name from frontmatter
  name=$(sed -n '/^---$/,/^---$/{ /^name:/{ s/^name: *//; p; } }' "$file")
  if [ -z "$name" ]; then
    echo "FAIL: $file missing name field"
    EXIT_CODE=1
  elif ! echo "$name" | grep -qE '^[a-z0-9-]{1,64}$'; then
    echo "FAIL: $file name '$name' invalid (must be lowercase/hyphens/digits, max 64)"
    EXIT_CODE=1
  elif echo "$name" | grep -qE '(claude|anthropic)'; then
    echo "FAIL: $file name '$name' contains reserved word"
    EXIT_CODE=1
  else
    echo "OK:   $file name='$name'"
  fi

  # Check description exists and length
  desc_len=$(python3 -c "
import re, sys
t = open('$file').read()
m = re.search(r'^description:\s*>-\n(.*?)\n(?=[a-z]+:|---)', t, re.S|re.M)
if m:
    lines = [l.strip() for l in m.group(1).splitlines()]
    desc = ' '.join(lines)
else:
    m = re.search(r'^description:\s*(.+)$', t, re.M)
    desc = m.group(1).strip() if m else ''
print(len(desc))
")
  if [ "$desc_len" -eq 0 ]; then
    echo "FAIL: $file description is empty"
    EXIT_CODE=1
  elif [ "$desc_len" -gt 1024 ]; then
    echo "FAIL: $file description too long ($desc_len > 1024 chars)"
    EXIT_CODE=1
  else
    echo "OK:   $file description length=$desc_len"
  fi

  # Check body line count
  body_lines=$(wc -l < "$file")
  if [ "$body_lines" -gt 500 ]; then
    echo "WARN: $file body=$body_lines lines (recommended < 500)"
  else
    echo "OK:   $file body=$body_lines lines"
  fi

  # Check internal markdown links resolve
  python3 -c "
import re, os, sys
f = '$file'
t = open(f).read()
ok = True
for m in re.finditer(r'\]\((\.\./[^)]+\.md|[a-zA-Z0-9_./-]+\.md)\)', t):
    target = os.path.normpath(os.path.join(os.path.dirname(f), m.group(1)))
    if not os.path.exists(target):
        print(f'FAIL: {f} broken link -> {m.group(1)}')
        ok = False
if ok:
    print(f'OK:   {f} all internal links resolve')
else:
    sys.exit(1)
" || EXIT_CODE=1
done

# Check reference files have TOC if > 100 lines
for ref in "$SKILLS_DIR/dads-foundations-core/references/"*.md; do
  lines=$(wc -l < "$ref")
  if [ "$lines" -gt 100 ]; then
    if ! grep -q "^## Contents" "$ref"; then
      echo "WARN: $ref has $lines lines but no ## Contents TOC"
    else
      echo "OK:   $ref has TOC ($lines lines)"
    fi
  fi
done

# Summary
if [ $EXIT_CODE -eq 0 ]; then
  echo ""
  echo "All DADS skill validations passed."
else
  echo ""
  echo "Some validations failed."
fi
exit $EXIT_CODE
