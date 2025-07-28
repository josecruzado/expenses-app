#!/bin/bash
# Script de rollback - Ejecutar si hay problemas con la nueva arquitectura CSS

echo "🔄 Haciendo rollback a la arquitectura CSS anterior..."

# Cambiar la importación de vuelta a app.css
sed -i '' "s/import '..\/app-new.css';/import '..\/app.css';/" src/routes/+layout.svelte

echo "✅ Rollback completado. La aplicación usa nuevamente app.css"
echo "🔄 Reinicia el servidor de desarrollo para ver los cambios"
