# AURIX OS — Aprende inglés con tu asistente de voz

Aplicación web 100% estática (HTML + CSS + JS) para aprender inglés desde cero con un método gramatical puro. AURIX guía al alumno con voz, subtítulos, micrófono y ejercicios estructurados.

## Despliegue

Proyecto estático. Compatible con Vercel / Netlify / GitHub Pages.

```bash
# Servir localmente
python -m http.server 8000
```

Abrir en `http://localhost:8000/index.html`.

> Importante: el micrófono (grabación + transcripción) requiere contexto seguro (HTTPS o localhost). Con `file://` no funciona.

## Estructura

| Archivo | Función |
|---|---|
| `index.html` | Punto de entrada, pantallas de splash |
| `styles.css` | Todo el diseño (AURIX glass UI) |
| `app.js` | Lógica de la app, sesiones, micrófono |
| `tts.js` | Voz (Text-to-Speech) con subtítulos |
| `voice.js` | Reconocimiento de voz (wrapper) |
| `audio.js` | Efectos de sonido de encendido |

## Método pedagógico

1. **Fase Cero** — Singular y Plural (Sesión 2)
2. **Filtro Maestro R.O.D.** — Pronombres y verbo To Be (Sesión 3)
3. **Presente Simple vs Continuo** — Regla de oro del gerundio (Sesión 4)

Sin relleno conversacional: gramática pura y estructural, con práctica de pronunciación por micrófono.
