# Invitación de boda · Bárbara & Esteban

Página estática (GitHub Pages) + Google Sheets/Apps Script como "base de datos".
Cada invitado recibe `https://barbarayesteban.github.io/boda/?i=<código>` y su respuesta queda en la pestaña **Invitaciones**.

## 1. Google Sheets + Apps Script (una sola vez)
1. En tu planilla: Extensiones > Apps Script. Pega `Codigo.gs` completo (va FUERA de este repositorio).
2. Arriba del archivo cambia `URL_GITHUB` por `https://barbarayesteban.github.io/boda/`.
3. Si es una planilla nueva: ejecuta `crearEstructura`. Si ya la tenías: no hace falta.
4. Ejecuta `crearResumen` (crea la pestaña con totales).
5. Implementar > **Gestionar implementaciones** > lápiz > Versión: **Nueva versión** > Implementar.
   Ejecutar como: **Yo**. Acceso: **Cualquier persona**. Así la URL /exec de `config.js` no cambia.

## 2. Invitados
En **Invitaciones**, una fila por grupo:
- SALUDO: "Querida familia Pérez"
- INVITADOS: nombres separados por `|` → `Ana Pérez | Luis Soto`
- CUPOS: cuántos de ellos pueden asistir (1 a N)
- MENSAJE: opcional
Deja TOKEN y LINK vacíos. Luego ejecuta `generarEnlaces` (crea los tokens) y después `generarEnlacesV6` (escribe los links de GitHub en la columna LINK).
Puedes añadir invitados después: repite ambos pasos; no se tocan respuestas existentes.

## 3. Fecha límite
Edita **Configuracion!B2** (ej. 20/01/2027). Se respeta hasta las 23:59 de Chile y lo valida el servidor;
no hay que volver a publicar al cambiarla. Después de esa fecha la invitación muestra "confirmaciones cerradas".

## 4. GitHub Pages
1. Crea un repositorio público llamado `boda`.
2. Sube TODO el contenido de esta carpeta (incluido `.nojekyll` y la carpeta `assets`).
3. Settings > Pages > Source: *Deploy from a branch* > `main` / `(root)` > Save.
4. En `index.html` cambia `barbarayesteban` (etiqueta og:image, para la vista previa en WhatsApp).
5. Prueba: `https://barbarayesteban.github.io/boda/?demo=1` (no escribe en Sheets) y luego un link real de la columna LINK.

## Notas
- Prueba siempre con la fila de prueba antes de enviar; luego borra su respuesta en Sheets.
- Cada link solo ve su propio grupo; nadie puede ver la lista completa.
- Si cambias `Codigo.gs`, actualiza la implementación EXISTENTE (paso 1.5), nunca crees una nueva.
