#!/bin/bash
# Script para verificar que las migrations se ejecutaron correctamente

SUPABASE_URL="${VITE_SUPABASE_URL:-https://rykdfqtfesfpeesvtval.supabase.co}"
SUPABASE_KEY="${VITE_SUPABASE_ANON_KEY}"

if [ -z "$SUPABASE_KEY" ]; then
  echo "❌ Error: VITE_SUPABASE_ANON_KEY no está definida"
  exit 1
fi

echo "🔍 Verificando tablas en Supabase..."
echo "URL: $SUPABASE_URL"
echo ""

# Tablas esperadas
TABLES=(
  "attendance_records"
  "attendance_monthly_summary"
  "attendance_config"
  "pulse_mood_shots"
  "pulse_team_friction"
  "pulse_point_ledger"
  "pulse_rewards"
  "pulse_redemptions"
  "pulse_alerts"
  "notifications"
)

for table in "${TABLES[@]}"; do
  # Intenta hacer un SELECT en cada tabla
  RESPONSE=$(curl -s -X GET \
    "$SUPABASE_URL/rest/v1/$table?limit=1" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -w "\n%{http_code}")

  HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)

  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "401" ]; then
    echo "✅ $table"
  else
    echo "❌ $table (HTTP $HTTP_CODE)"
  fi
done

echo ""
echo "✨ Verificación completada"
