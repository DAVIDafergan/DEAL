#!/usr/bin/env bash
# setup.sh — מתקין את כל הפרויקט (backend + frontend) בפקודה אחת, ובודק תקינות סביבה.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

REQUIRED_NODE_MAJOR=18

echo "== Deal Radar Pro — Setup =="

# --- 1. בדיקת גרסת Node ---
if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js לא נמצא. יש להתקין Node.js >= ${REQUIRED_NODE_MAJOR} (https://nodejs.org)."
  exit 1
fi

NODE_MAJOR="$(node -v | sed 's/^v//' | cut -d. -f1)"
if [ "$NODE_MAJOR" -lt "$REQUIRED_NODE_MAJOR" ]; then
  echo "❌ נמצאה גרסת Node $(node -v), אך נדרשת גרסה >= ${REQUIRED_NODE_MAJOR}."
  exit 1
fi
echo "✓ Node $(node -v)"

# --- 2. יצירת .env מתבנית אם לא קיים ---
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✓ נוצר קובץ .env מתוך .env.example — מלאו את המפתחות הרלוונטיים."
else
  echo "✓ קובץ .env קיים."
fi

# --- 3. התקנת תלויות Backend ---
echo "-- מתקין תלויות Backend..."
npm install

# --- 4. התקנת תלויות Frontend ---
echo "-- מתקין תלויות Frontend..."
npm install --prefix web

# --- 5. בדיקת מפתחות סביבה חסרים (אזהרה בלבד, לא חוסם) ---
echo "-- בודק מפתחות סביבה..."
# shellcheck disable=SC1091
set -a
source .env
set +a

missing=()
[ -z "$AMADEUS_API_KEY" ] && missing+=("AMADEUS_API_KEY")
[ -z "$AMADEUS_API_SECRET" ] && missing+=("AMADEUS_API_SECRET")
[ -z "$ANTHROPIC_API_KEY" ] && missing+=("ANTHROPIC_API_KEY")
[ -z "$TELEGRAM_BOT_TOKEN" ] && missing+=("TELEGRAM_BOT_TOKEN")

if [ ${#missing[@]} -gt 0 ]; then
  echo "⚠️  המפתחות הבאים לא מוגדרים עדיין ב-.env (הפיצ'רים התלויים בהם יושבתו אוטומטית):"
  for key in "${missing[@]}"; do
    echo "   - $key"
  done
else
  echo "✓ כל מפתחות הסביבה המרכזיים מוגדרים."
fi

echo ""
echo "== הסיום! =="
echo "להרצת השרת:    npm start"
echo "להרצת ה-Frontend: npm run web:dev"
