# Sección JUSFEM IA — montaje en Elementor

Versión **editable**: todos los textos son widgets normales de Elementor, así que
el cliente los cambia haciendo clic, sin tocar código. Lo único que queda como
código es el recuadro del visual (los videos y el fondo animado).

## Archivos

| Archivo | Dónde va |
|---|---|
| `1-visual-widget-html.html` | Widget **HTML**, columna derecha de la sección |
| `2-estilos.css` | Elementor → ⚙ → Avanzado → **CSS personalizado** |

## Qué podrá editar el cliente, y cómo

| Elemento | Widget | Cómo lo edita |
|---|---|---|
| "Nueva herramienta. JusfemIA" | Editor de texto | Clic y escribe |
| Título | Encabezado (H2) | Clic y escribe |
| Bajada | Editor de texto | Clic y escribe |
| Botón y su link | Botón | Clic → pestaña Contenido |
| Las 3 tarjetas (título + texto) | Acordeón | Clic → Elementos del acordeón |
| Los 3 videos | — | Cambiando el `src` en el widget HTML |

Si el cliente agrega o quita una tarjeta del acordeón, el visual se adapta solo:
el script cuenta las tarjetas que encuentra.

---

## Paso 1 — Armar la sección

En *Páginas → Inicio → Editar con Elementor*, crear una **sección de 2 columnas**
donde vaya el bloque.

**Sección** → Avanzado → *Clases CSS*: `jia-seccion`
**Diseño** → Ancho del contenido: `1200`, espaciado entre columnas: `48`
**Diseño** → Relleno: arriba `35`, abajo `110`

**Columna izquierda:** ancho `40%` · **Columna derecha:** ancho `60%`

### Columna izquierda — 5 widgets, en este orden

| # | Widget | Clase CSS (Avanzado → Clases CSS) | Contenido |
|---|---|---|---|
| 1 | Editor de texto | `jia-badge` | `Nueva herramienta. **JusfemIA**` |
| 2 | Encabezado | `jia-titulo` | `Fortalece la argumentación jurídica en una sola conversación.` (etiqueta H2) |
| 3 | Editor de texto | `jia-bajada` | `Haz una pregunta y obtén respuestas con fuentes curadas por el Observatorio Jusfem. Argumenta con un asistente jurídico gratuito y especializado, pensado para juezas, jueces y operadores/as de justicia, con énfasis en derechos sexuales y reproductivos y violencia de género.` |
| 4 | Botón | `jia-cta` | Texto: `Probar JusfemIA` · Enlace: `https://ia.jusfem.com/` |
| 5 | Acordeón | `jia-tarjetas` | Las 3 tarjetas (abajo) |

**Importante:** la clase CSS va en *Avanzado → Clases CSS* de cada widget, sin punto.

#### Las 3 tarjetas del acordeón

| Título | Contenido |
|---|---|
| Realiza consultas y genera argumentos | Encuentra el estándar de derechos humanos, la norma, la jurisprudencia y la literatura especializada. Además, construye tu argumento paso a paso. |
| Revisa y contrasta las fuentes | Cada respuesta muestra las fuentes utilizadas. Verifícalas antes de citar y, si lo necesitas, descarga el documento. |
| Destaca tus conversaciones | Marca una conversación como favorita para que aparezca al inicio de tu historial. Retoma o revisa tu trabajo cuando lo necesites. |

### Columna derecha — 1 widget

Widget **HTML** con el contenido de `1-visual-widget-html.html`.

## Paso 2 — Los estilos

Elementor → ⚙ (abajo a la izquierda) → **Avanzado → CSS personalizado**:
pegar todo `2-estilos.css`.

Si esa opción no aparece (es de Elementor Pro), usar
*Apariencia → Personalizar → CSS adicional*.

## Paso 3 — Los videos

Grabar las 3 animaciones, subirlas en *Medios* y pegar cada URL en el `src`
correspondiente del widget HTML. Detalle de grabación en `../README.md`.

Orden: video 1 → tarjeta 1, video 2 → tarjeta 2, video 3 → tarjeta 3.

---

# Flujo de prueba antes de publicar

Para que el cliente lo revise sin que lo vea nadie más:

1. **Crear una página nueva** (*Páginas → Añadir nueva*), llamarla por ejemplo
   "Vista previa JusfemIA".
2. Armar ahí la sección siguiendo los pasos de arriba.
3. Publicarla pero **dejarla fuera del menú** y marcar *noindex* si el sitio usa
   Yoast o RankMath (así no la toma Google).
   - Alternativa más cerrada: dejarla en **Borrador** y pasar el link de
     *Vista previa*. Pero ese link vence y pide sesión, así que para que el
     cliente la abra desde su teléfono conviene la opción publicada + noindex.
4. Pasarle el link al cliente.
5. Cuando confirme: en Elementor, botón derecho sobre la sección →
   **Guardar como plantilla**, ponerle nombre.
6. Ir a la home → *Añadir plantilla* → insertar la que se guardó, en la
   posición definitiva.
7. Borrar o despublicar la página de vista previa.

Guardar la sección como plantilla es lo que hace que el paso de prueba a
producción sea de dos clics y no rehacer todo.

## Antes de dar por terminado

- [ ] Los 3 videos subidos y con su `src` puesto
- [ ] Quitar el `<iframe class="jia-visual__respaldo">` del widget HTML
      (es solo para ver la sección mientras no hay videos)
- [ ] El botón apunta a `https://ia.jusfem.com/`
- [ ] Revisado en teléfono
- [ ] Página de vista previa borrada

---

## Nota sobre el acordeón

El CSS contempla las dos variantes que puede usar Elementor según la versión:
el acordeón clásico (`.elementor-accordion`) y el nuevo anidado
(`.e-n-accordion-item`). El script del visual también detecta ambos. Si en la
versión instalada el acordeón se ve distinto a lo esperado, avisar: se ajusta
con un par de reglas.
