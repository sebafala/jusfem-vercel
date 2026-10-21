# Sección JUSFEM IA para el WordPress de jusfem.com

Bloque autocontenido que replica la sección JUSFEM IA de
https://jusfem.vercel.app/sitev2 para montarla en la home del cliente.

**Sitio destino:** WordPress 7.1.3 · tema Astra + astra-child · Elementor Pro · JetEngine.
La home (`page-id=97`) usa plantilla `elementor_header_footer`, así que se edita con Elementor.

## Archivos

| Archivo | Qué es |
|---|---|
| `seccion-jusfemia.html` | El bloque completo: HTML + CSS + JS. Esto es lo que se pega en Elementor. |
| `prueba.html` | Página de prueba local (el bloque entre dos franjas grises). No se sube. |

## Por qué no se usa el prototipo tal cual

El prototipo corre sobre el runtime de Claude Design. Para funcionar descarga,
en cada visita:

| Recurso | Peso |
|---|---|
| Babel standalone (compila el JSX en el navegador) | 3,1 MB |
| React + ReactDOM | 142 KB |
| support.js (runtime) | 69 KB |
| animations-v3.jsx + jusfem-anims.jsx | 110 KB |

Son ~3,5 MB desde unpkg.com más varios segundos de compilación en el
dispositivo del visitante. Medido en la prueba local: la animación tarda
~15 s en aparecer. Inaceptable para una home pública.

Este bloque no usa React, ni Babel, ni ninguna librería: pesa ~11 KB.

## Montaje en Elementor

1. **Grabar los 3 videos** (ver abajo) y subirlos en *Medios → Añadir nuevo*.
   Copiar la URL de cada uno.
2. En `seccion-jusfemia.html`, completar los tres `<source src="">` con esas URLs,
   en este orden:
   - video 1 → Realiza consultas y genera argumentos
   - video 2 → Revisa y contrasta las fuentes
   - video 3 → Destaca tus conversaciones
3. Cambiar `href="#CAMBIAR-DESTINO"` del botón por la URL real de JusfemIA.
4. En WordPress: *Páginas → Inicio → Editar con Elementor*.
5. Arrastrar un widget **HTML** al lugar donde va la sección y pegar todo el
   contenido del archivo (incluidos `<style>` y `<script>`).
6. Publicar.

### Mientras no haya videos

Si los `<source>` quedan vacíos, el bloque carga automáticamente la animación
desde `jusfem.vercel.app` en un iframe, **una sola vez y sin rotar**. Sirve para
ver la sección montada, no para producción: arrastra los 3,5 MB y tarda en
aparecer. Reemplazar por los videos antes de publicar de verdad.

## Grabar los videos

En Mac, con `Cmd + Shift + 5` → *Grabar porción seleccionada*:

| Animación | URL | Duración del ciclo |
|---|---|---|
| Argumento | https://jusfem.vercel.app/sitev2/anim-argumento.html?embed=1 | 40 s |
| Documento | https://jusfem.vercel.app/sitev2/anim-documento.html?embed=1 | 15 s |
| Favoritos | https://jusfem.vercel.app/sitev2/anim-favoritos.html?embed=1 | 15 s |

- Abrir cada URL, esperar a que cargue y grabar un ciclo completo.
- Recortar para que empiece y termine en el mismo punto (el video va en `loop`).
- Exportar a **MP4 (H.264)**, ancho 1152 px, sin audio.
- Comprimir a menos de 2 MB cada uno (HandBrake o similar) antes de subir.

La proporción del recuadro es **1152 × 1080**. Grabar con esa relación evita
franjas o recortes.

## Detalles de implementación

- **Rendimiento:** los videos arrancan solo cuando la sección entra en pantalla
  (IntersectionObserver) y se pausan al salir. El 2.º y 3.º usan `preload="none"`.
- **Accesibilidad:** las 3 tarjetas son `role="tablist"` con `aria-selected`,
  navegables con flechas y con foco visible. Respeta `prefers-reduced-motion`.
- **Responsive:** una columna por debajo de 1024 px; los glows de fondo se
  ocultan por debajo de 768 px.
- **Aislamiento:** todo está bajo la clase `.jia`, así que no pisa estilos de
  Astra ni de Elementor.

## Pendientes de decisión

- El botón **"Probar JusfemIA" no tiene destino** — en el prototipo tampoco
  enlaza a ningún lado. Definir a dónde va.
- En la versión mobile del prototipo el mismo botón dice **"Probar herramienta
  libre"**. Acá se unificó a "Probar JusfemIA"; si el texto correcto es el otro,
  cambiarlo en el HTML.
