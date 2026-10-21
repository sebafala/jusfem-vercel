// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)
// Copied omelette starter. Re-running copy_starter_component with this kind overwrites this file with the latest version (page content is unaffected).

/* BEGIN USAGE */
// animations-v3.jsx — continuous-composition animation engine.
//
// THE MODEL: the animation is ONE element tree rendered as a pure function
// of one authored-time axis. Nothing mounts or unmounts at section
// boundaries, so any element can move, morph, or persist across them by
// ordinary interpolation. The scene list (OM_SCENES) is the user-control
// view — names, order, playback durations — and the engine derives the cue
// table from it, so structure has exactly one source and cannot drift.
//
// API INDEX (every export is a window global):
//   <CompositionStage width height scenes={window.OM_SCENES}
//                     playback={window.OM_PLAYBACK} bg>
//     <Piece />   — ONE component, the whole animation
//   </CompositionStage>
//   useComposition() -> {T, CUES, time, duration, authoredTotal, playing}
//     T: authored seconds (warped per-section by user trims/speeds) —
//        key ALL choreography to T, never to wall-clock time
//     CUES: {SectionName: authoredStart} derived from OM_SCENES; an unknown
//        name returns NaN and raises a preview-only badge (never exports);
//        duplicate section names bind to the first occurrence
//   <Shot from={CUES.Build} to={CUES.Close}> — children visible between two
//     authored times (an authored hard cut in one line); children stay
//     mounted (media keeps its readiness) and are hidden outside the window
//   <Captions items={[{at, until?, text}, ...]} /> — ONE caption element,
//     at most one visible at a time, keyed to T; 'until' defaults to the
//     next item's 'at'; a last item with no 'until' stays to the end
//   WATERCOLOR (only when the Watercolor illustration skill is active —
//   otherwise ignore these entries). A painting is a function(p) written
//   against the paint kit, on a width x height sheet; it needs
//   watercolor_kit.js loaded by a <script> tag before this engine, must
//   be a stable function defined once (module scope, never an inline
//   arrow), and every component below renders <img> elements, so it all
//   exports by construction.
//   <WatercolorPainting painting={fn} from={CUES.X} to={CUES.Y} width height
//     seed scale quality style /> — the painting assembled from its own
//     STROKES: each wash / ink line / splatter is a separate layer
//     stacked over the paper, appearing in painting order between two
//     authored times (washes bloom in, ink draws tip to tail). This is the
//     default way to show a watercolor being painted. It keeps the sheet's
//     aspect ratio (size it with style, e.g. {position:'absolute', left,
//     top, width}). scale is the layers' render resolution over width x
//     height (default 1, a deliberate weight-over-dpi trade — raise it
//     toward the zoom factor if the composition zooms into the painting,
//     or toward the devicePixelRatio for a hero-sized sheet); quality is
//     0..1 layer image quality (default 0.92; 1 is the encoder's maximum).
//   useWatercolorLayers(fn, {width, height, seed, scale, quality}) -> L
//     (null if the kit isn't loaded — load watercolor_kit.js before the
//     engine — or if the painting fails to build) — the painting taken apart into strokes, for
//     choreography beyond in-order painting: L.count strokes, L.kind(i)
//     ('wash' | 'gradedWash' | 'glaze' | 'ink' | 'hatch' | 'splatter' |
//     'dryStroke' | 'reserve' | 'caption'), L.span(i) = the stroke's
//     {from, to} share of the painting's 0..1 timeline; call L.warm()
//     once after load so finished strokes pre-render off the critical
//     path (WatercolorPainting does this itself). Compose with:
//   <WatercolorSheet layers={L} style>children</WatercolorSheet> — the
//     paper the strokes sit on (keeps the sheet's aspect ratio), and
//   <WatercolorStroke index={i} at={0..1} style /> — stroke i as its own
//     element, placed where it was painted; at is its painting progress
//     (0 hidden, 1 finished — drive it from T with animate()); style lets
//     you move, scale, rotate, or fade the stroke (transform / opacity).
//     Strokes are paint, so they multiply: overlapping strokes darken
//     where they cross, as in the still image, within a few 8-bit levels
//     (tighter still at quality 1). The sheet clips to its
//     box — for strokes that fly in from outside it, set
//     style={{overflow: 'visible'}} on the WatercolorSheet. 'reserve' strokes
//     are erasures (lifted paper) — keep them where they were painted and
//     reveal them in order after the strokes they erase; moving an erase
//     around has no sensible meaning.
//   <WatercolorReveal painting={fn} from={CUES.X} to={CUES.Y} width height
//     seed steps scale format quality style />, or <WatercolorReveal
//     frames={[src, ...]} from to /> — the whole painting as ONE flat
//     image that paints on (frames pre-baked in the background, so it is
//     the lightest option and the one to zoom or pan over as a single
//     picture). Prefer WatercolorPainting when the strokes themselves
//     should appear one by one or be individually animated. format is
//     the image MIME type (default image/jpeg), quality 0..1 (default
//     0.88). Frames bake at width x height times scale (default: the
//     device pixel ratio, capped at 2) — if the composition zooms INTO
//     the painting, raise scale toward the maximum zoom so frames stay
//     crisp. The kit caps a sheet at ~12M pixels and the components clamp
//     scale to stay under it; exported video sharpness also depends on
//     the export dialog's own resolution choice.
//   Motion: Easing.{linear, easeIn|Out|InOutQuad/Cubic/Quart/Expo/Sine,
//     easeIn|Out|InOutBack, easeOutElastic}, interpolate(input, output, ease),
//     animate({from, to, start, end, ease}) -> fn(T), clamp(v, min, max)
//   Plumbing (rarely needed): Stage, PlaybackBar, TimelineContext,
//     useTime, useTimeline
//   Seek event (host/export transport): 'data-om-seek-to-time-frame',
//     detail {time, sync, playing} — the stage owns it; never implement it
//     yourself
//
// THE AUTHORING CONTRACT — this is what makes the host timeline's trim and
// speed gestures write back into YOUR file, so follow it exactly:
//   1. Declare the scene list as a JSON string literal in a plain inline
//      <script> of the main document (NOT type="text/babel", NOT a sibling
//      .jsx — only vanilla inline scripts are addressable for write-back):
//        <script>window.OM_SCENES = '[{"name":"Opening","dur":3,"desc":"The logo fades in and the title settles"},{"name":"Build","dur":5,"desc":"Bars grow to their final values"}]';</script>
//      Give every entry a "desc": one short plain-words sentence saying
//      what happens in that section. The user reads it in the timeline's
//      section popover — keep it true whenever you edit the section.
//   2. Pass the string through untouched:
//        <CompositionStage scenes={window.OM_SCENES} ...>
//   3. ALSO declare the playback setting the same way:
//        <script>window.OM_PLAYBACK = '{"mode":"loop"}';</script>
//      and pass it through untouched (values: '{"mode":"loop"}' or
//      '{"mode":"times","count":N}'; omitting keeps loop behavior but
//      leaves the host Repeat control read-only for this document).
//   IMPORTANT — the exportable-video contract: CompositionStage/Stage OWNS
//   it (the data-om-exportable-video-with-duration-secs attribute, the
//   data-om-seek-to-time-frame listener, the svg/foreignObject wrapper,
//   and font inlining). NEVER put the exportable attribute on any other
//   element — a second "exportable root" makes the host timeline and the
//   video exporter bind to the wrong element, and playback control /
//   export silently break.
//
// HOW TIME WORKS: each OM_SCENES entry is a named slice of the authored
// timeline. CUES.Name is that section's authored start (the running sum of
// authored lengths, in literal order). useComposition().T is the authored
// clock: when the user trims or speeds a section on the host timeline, the
// engine replays that section's SAME authored slice over the new playback
// length — your choreography retimes, never cuts off. The optional "nat"
// field on an entry is the engine's authored-length anchor — the host
// timeline stamps it on the first retime; don't set it by hand.
//
// CUE-FIRST DISCIPLINE (what makes a piece read as one continuous video):
//   1. Write the OM_SCENES literal FIRST — it is the piece's outline.
//   2. One helper component per section for readability, but ALL of them
//      render ALL the time inside the one tree, keyed to CUES — never
//      conditionally mounted per section.
//   3. Define exactly three motion helpers up front (e.g.
//      MOTION = {enter, draw, pop} wrapping Easing curves) and use no
//      easing or transform outside them; one caption element, one visible
//      at a time (<Captions> has this built in).
//   A shared element that crosses a boundary is just motion whose start
//   and end straddle a cue: animate({from, to, start: CUES.Build - 0.4,
//   end: CUES.Build + 0.6})(T) glides through the boundary, and a user
//   slowing either section slows the glide without breaking it.
//
// RENDER FROM T ONLY: the exporter seeks each frame with a synchronous
// commit and may serialize the stage the moment the seek event returns —
// anything painted from useEffect or your own requestAnimationFrame lags
// that commit and exports stale. Render everything visible from T and this
// is automatic. A seeked frame is a deterministic render at that time.
//
// HARD CUTS are content now, not structure: wrap a shot's elements in
// <Shot from to> (visibility toggles at the cues; children stay mounted so
// images and videos hold their readiness). Shot also doubles as the
// perf gate for heavy far-away beats.
//
// LOOP SEAMS are the one surviving boundary rule: a looping piece shows
// its last authored frame immediately before its first — make them match
// (settle your choreography by authoredTotal, open it at 0).
//
// DIAGNOSTICS: choreography that references an unknown section name (a
// rename or deletion in OM_SCENES) shows a badge below the stage in the
// preview, outside the exportable svg — visible in preview screenshots,
// never in the exported video. An OM_SCENES section with no choreography
// keyed to it is a valid empty beat, not an error.
/* END USAGE */

// ─────────────────────────────────────────────────────────────────────────────

// ── Easing functions (hand-rolled, Popmotion-style) ─────────────────────────
// All easings take t ∈ [0,1] and return eased t ∈ [0,1] (may overshoot for back/elastic).
const Easing = {
  linear: (t) => t,

  // Quad
  easeInQuad:    (t) => t * t,
  easeOutQuad:   (t) => t * (2 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),

  // Cubic
  easeInCubic:    (t) => t * t * t,
  easeOutCubic:   (t) => (--t) * t * t + 1,
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),

  // Quart
  easeInQuart:    (t) => t * t * t * t,
  easeOutQuart:   (t) => 1 - (--t) * t * t * t,
  easeInOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t),

  // Expo
  easeInExpo:  (t) => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1))),
  easeOutExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeInOutExpo: (t) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    if (t < 0.5) return 0.5 * Math.pow(2, 20 * t - 10);
    return 1 - 0.5 * Math.pow(2, -20 * t + 10);
  },

  // Sine
  easeInSine:    (t) => 1 - Math.cos((t * Math.PI) / 2),
  easeOutSine:   (t) => Math.sin((t * Math.PI) / 2),
  easeInOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,

  // Back (overshoot)
  easeOutBack: (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  easeInBack: (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },
  easeInOutBack: (t) => {
    const c1 = 1.70158, c2 = c1 * 1.525;
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
  },

  // Elastic
  easeOutElastic: (t) => {
    const c4 = (2 * Math.PI) / 3;
    if (t === 0) return 0;
    if (t === 1) return 1;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
};

// ── Core interpolation helpers ──────────────────────────────────────────────

// Clamp a value to [min, max]
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// interpolate([0, 0.5, 1], [0, 100, 50], ease?) -> fn(t)
// Popmotion-style: linearly maps t across input keyframes to output values,
// with optional easing per segment (single fn or array of fns).
function interpolate(input, output, ease = Easing.linear) {
  return (t) => {
    if (t <= input[0]) return output[0];
    if (t >= input[input.length - 1]) return output[output.length - 1];
    for (let i = 0; i < input.length - 1; i++) {
      if (t >= input[i] && t <= input[i + 1]) {
        const span = input[i + 1] - input[i];
        const local = span === 0 ? 0 : (t - input[i]) / span;
        const easeFn = Array.isArray(ease) ? (ease[i] || Easing.linear) : ease;
        const eased = easeFn(local);
        return output[i] + (output[i + 1] - output[i]) * eased;
      }
    }
    return output[output.length - 1];
  };
}

// animate({from, to, start, end, ease})(t) — simpler single-segment tween.
// Returns `from` before `start`, `to` after `end`.
function animate({ from = 0, to = 1, start = 0, end = 1, ease = Easing.easeInOutCubic }) {
  return (t) => {
    if (t <= start) return from;
    if (t >= end) return to;
    const local = (t - start) / (end - start);
    return from + (to - from) * ease(local);
  };
}

// ── Timeline context ────────────────────────────────────────────────────────

const TimelineContext = React.createContext({ time: 0, duration: 10, playing: false });

const useTime = () => React.useContext(TimelineContext).time;
const useTimeline = () => React.useContext(TimelineContext);

// How long a marked (detail.playing === true) host seek keeps the
// external-playback latch alive with no successor. The host play bar's
// seek pump is one-in-flight/latest-wins, so its inter-seek gap is tens
// of milliseconds in the worst case — 400ms is far above that, so a
// marked stream that dies mid-play decays the latch promptly.
var SS_EXT_PLAY_MS = 400;

// ── Font inlining ───────────────────────────────────────────────────────────
// Copy every @font-face rule from the page into a <style> inside the svg's
// foreignObject, with font URLs rewritten to data: URLs. Makes the svg
// self-describing so serializing it alone (video export fast path) still
// renders with the right fonts. Sets data-om-fonts-inlined on the svg when
// done so the exporter can wait for it.

function useInlineFontsInto(svgRef) {
  React.useEffect(() => {
    const svg = svgRef.current;
    const host = svg && svg.querySelector('foreignObject > div');
    if (!svg || !host) return;
    let cancelled = false;
    (async () => {
      const rules = [];
      for (const ss of document.styleSheets) {
        let cssRules;
        try { cssRules = ss.cssRules; } catch {
          // Cross-origin sheet without crossorigin attr (e.g. the standard
          // fonts.googleapis.com <link>) — fetch the CSS text directly and
          // regex-extract the @font-face blocks.
          if (ss.href) {
            try {
              const txt = await fetch(ss.href).then(r => { if (!r.ok) throw 0; return r.text(); });
              for (const ff of (txt.match(/@font-face\s*{[^}]*}/g) || []))
                rules.push({ css: ff, base: ss.href });
            } catch {}
          }
          continue;
        }
        if (!cssRules) continue;
        for (const r of cssRules) {
          if (r.type === CSSRule.FONT_FACE_RULE) {
            rules.push({ css: r.cssText, base: ss.href || location.href });
          }
        }
      }
      const toDataURL = (url) => fetch(url)
        .then(r => { if (!r.ok) throw 0; return r.blob(); })
        .then(b => new Promise(res => {
          const fr = new FileReader();
          fr.onload = () => res(fr.result);
          fr.onerror = () => res(url);
          fr.readAsDataURL(b);
        }))
        .catch(() => url);
      const parts = await Promise.all(rules.map(async ({ css, base }) => {
        const re = /url\((['"]?)([^'")]+)\1\)/g;
        let out = css, m;
        while ((m = re.exec(css))) {
          const u = m[2];
          if (u.startsWith('data:')) continue;
          let abs; try { abs = new URL(u, base).href; } catch { continue; }
          out = out.split(m[0]).join(`url("${await toDataURL(abs)}")`);
        }
        return out;
      }));
      if (cancelled || !parts.length) {
        svg.setAttribute('data-om-fonts-inlined', 'true');
        return;
      }
      const style = document.createElement('style');
      style.textContent = parts.join('\n');
      host.insertBefore(style, host.firstChild);
      svg.setAttribute('data-om-fonts-inlined', 'true');
    })();
    return () => { cancelled = true; };
  }, []);
}


function Stage({
  width = 1280,
  height = 720,
  duration = 10,
  background = '#f6f4ef',
  fps = 60,
  loop = true,
  autoplay = true,
  // Parsed playback object ({mode:'loop'} | {mode:'times',count:N}) or
  // null. When present it overrides the legacy loop prop — CompositionStage
  // passes the validated value from the OM_PLAYBACK authoring contract.
  playback = null,
  persistKey = 'animstage-v3',
  children,
}) {
  // Props arrive as strings when Stage is mounted via <x-import> (DC
  // projects) — coerce so style={{width}} gets a number React can px-ify.
  width = +width || 1280; height = +height || 720;
  duration = +duration || 10; fps = +fps || 60;
  if (typeof loop === 'string') loop = loop !== 'false';
  if (typeof autoplay === 'string') autoplay = autoplay !== 'false';
  const playTimes = playback && playback.mode === 'times' ? playback.count : null;
  const loopEff = playback ? playback.mode === 'loop' : loop;

  // PARCHE: arrancar siempre en 0 (el original retomaba el playhead guardado).
  const [time, setTime] = React.useState(0);
  const [playing, setPlaying] = React.useState(autoplay);
  // The external-playback latch: true while the HOST play bar is driving
  // time forward as genuine continuous playback (its play-loop seeks
  // carry detail.playing === true). The engine's own clock stays paused
  // the whole time — exactly one clock ever drives — so this is a
  // separate bit, not a second meaning for `playing`. Set and cleared
  // in the seek handler below; decays via SS_EXT_PLAY_MS when the
  // marked stream stops without a parting unmarked seek.
  const [extPlay, setExtPlay] = React.useState(false);
  const extPlayTimerRef = React.useRef(null);
  const [hoverTime, setHoverTime] = React.useState(null);
  const [scale, setScale] = React.useState(1);

  const stageRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const rafRef = React.useRef(null);
  const lastTsRef = React.useRef(null);

  // Persist playhead
  React.useEffect(() => {
    return;   // PARCHE: no se persiste el playhead fuera del editor
  }, [time, persistKey]);

  // Auto-scale to fit viewport
  React.useEffect(() => {
    if (!stageRef.current) return;
    const el = stageRef.current;
    const measure = () => {
      const barH = OM_EMBED ? 0 : 44; // playback bar height
      const s = Math.min(
        el.clientWidth / width,
        (el.clientHeight - barH) / height
      );
      setScale(Math.max(0.05, s));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [width, height]);

  // Passes completed since playback last started. Lives in a ref so the
  // per-frame wrap can count without re-running this effect; reset on
  // every (re)start so a fresh play (or a host restart) gets the full
  // run count again.
  const passesRef = React.useRef(0);

  // Animation loop
  React.useEffect(() => {
    if (!playing) {
      lastTsRef.current = null;
      return;
    }
    passesRef.current = 0;
    const step = (ts) => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;
      setTime((t) => {
        let next = t + dt;
        if (next >= duration) {
          if (playTimes !== null) {
            // Play N times then hold the last frame — the partial pass a
            // mid-timeline start produces counts as a pass, so the piece
            // never runs longer than N full durations.
            passesRef.current += 1;
            if (passesRef.current >= playTimes) {
              next = duration;
              setPlaying(false);
            } else {
              next = next % duration;
            }
          } else if (loopEff) {
            next = next % duration;
          } else {
            next = duration; setPlaying(false);
          }
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTsRef.current = null;
    };
  }, [playing, duration, loopEff, playTimes]);

  // Keyboard: space = play/pause, ← → = seek
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setPlaying(p => !p);
      } else if (e.code === 'ArrowLeft') {
        setTime(t => clamp(t - (e.shiftKey ? 1 : 0.1), 0, duration));
      } else if (e.code === 'ArrowRight') {
        setTime(t => clamp(t + (e.shiftKey ? 1 : 0.1), 0, duration));
      } else if (e.key === '0' || e.code === 'Home') {
        setTime(0);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [duration]);

  // Video-export protocol + the editor's play bar: hosts dispatch this
  // event per frame; pause + sync the playhead so the frame shows exactly
  // that timestamp. The host play bar marks its play-loop seeks with
  // detail.playing === true — the mark latches extPlay (playback is
  // playback even when a host clock drives it), while ANY unmarked seek
  // (scrub, step, export frame, the transport's pause park) clears the
  // latch in the same commit it retimes, so a seeked frame still renders
  // exactly one scene's state. The engine's own clock pauses either way.
  React.useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    // Sync-seek capability: a dispatcher that marks its seek with
    // detail.sync === true gets the commit applied via ReactDOM.flushSync,
    // so the stage DOM reflects the seeked frame the moment dispatchEvent
    // returns. The video exporter keys off the data-om-sync-seek
    // advertisement to drop its two-display-refresh settle (that wait only
    // exists to let React's async commit land — serialization needs the
    // committed DOM, not the paint). Feature-detected: a runtime without
    // ReactDOM.flushSync never advertises and every seek takes the async
    // path. Unmarked seeks (scrubs, the host play bar) stay async — a
    // forced sync render per pointermove would tax the editor for no one.
    const canSyncSeek =
      typeof ReactDOM !== 'undefined' &&
      typeof ReactDOM.flushSync === 'function';
    const onSeek = (e) => {
      const apply = () => {
        setPlaying(false);
        const hostPlay = !!(e.detail && e.detail.playing === true);
        if (extPlayTimerRef.current) {
          clearTimeout(extPlayTimerRef.current);
          extPlayTimerRef.current = null;
        }
        if (hostPlay) {
          // Watchdog: the latch is only as alive as its seek stream. If the
          // host stops without a parting seek (tab jank, bar unmount), the
          // latch decays on its own rather than stranding extPlaying true.
          extPlayTimerRef.current = setTimeout(() => {
            extPlayTimerRef.current = null;
            setExtPlay(false);
          }, SS_EXT_PLAY_MS);
        }
        setExtPlay(hostPlay);
        setTime(clamp(e.detail.time, 0, duration));
      };
      // flushSync is safe here: a native DOM listener runs outside React's
      // lifecycle, and the exporter's dispatchEvent is synchronous, so the
      // commit lands in the same JS task — the engine's own rAF loop can
      // never interleave between seek and serialize.
      if (canSyncSeek && e.detail && e.detail.sync === true) {
        ReactDOM.flushSync(apply);
      } else {
        apply();
      }
    };
    el.addEventListener('data-om-seek-to-time-frame', onSeek);
    if (canSyncSeek) el.setAttribute('data-om-sync-seek', 'true');
    return () => {
      el.removeEventListener('data-om-seek-to-time-frame', onSeek);
      el.removeAttribute('data-om-sync-seek');
      if (extPlayTimerRef.current) {
        clearTimeout(extPlayTimerRef.current);
        extPlayTimerRef.current = null;
      }
      // Drop the latch too: this cleanup runs on every duration change
      // (an agent edit can retime mid-host-play, no gesture involved) and
      // the new effect instance arms no watchdog — clearing only the
      // timer could strand extPlay true forever if the marked stream died
      // in the gap. Fail toward cut: the next marked seek re-latches.
      setExtPlay(false);
    };
  }, [duration]);

  // Inline @font-face rules into the svg's foreignObject so the svg is
  // self-describing — serializing it alone (for video export) then renders
  // with the right fonts. Sets data-om-fonts-inlined once done.
  useInlineFontsInto(canvasRef);

  const displayTime = hoverTime != null ? hoverTime : time;

  const ctxValue = React.useMemo(
    // extPlaying is ADDITIVE: "time is advancing under an external
    // driver's continuous playback". `playing` keeps meaning the
    // engine's OWN clock — the hidden PlaybackBar glyph (and through it
    // the host's clock-reporter/adoption channel) reads that — and
    // CompositionClock is the one consumer that widens to either.
    () => ({
      time: displayTime, duration, playing,
      extPlaying: extPlay,
      setTime, setPlaying,
    }),
    [displayTime, duration, playing, extPlay]
  );

  return (
    // data-om-starter: inert presence marker — Claude Design's starter-usage
    // probe reads it; it renders nothing. Keep it on this root element.
    <div
      ref={stageRef}
      data-om-starter="animations-v3"
      style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        background: OM_EMBED ? 'transparent' : '#0a0a0a',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* Canvas area — vertically centered in remaining space */}
      <div style={{
        flex: 1,
        width: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        minHeight: 0,
      }}>
        <svg
          ref={canvasRef}
          width={width} height={height}
          data-om-exportable-video-with-duration-secs={duration}
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'center',
            flexShrink: 0,
            boxShadow: OM_EMBED ? 'none' : '0 20px 60px rgba(0,0,0,0.4)',
            display: 'block',
          }}
        >
          <foreignObject x="0" y="0" width="100%" height="100%">
            <div
              xmlns="http://www.w3.org/1999/xhtml"
              style={{
                width, height,
                background,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <TimelineContext.Provider value={ctxValue}>
                {children}
              </TimelineContext.Provider>
            </div>
          </foreignObject>
        </svg>
      </div>

      {/* Playback bar — stacked below canvas, never overlapping */}
      {!OM_EMBED && <PlaybackBar
        time={displayTime}
        actualTime={time}
        duration={duration}
        playing={playing}
        onPlayPause={() => setPlaying(p => !p)}
        onReset={() => { setTime(0); }}
        onSeek={(t) => setTime(t)}
        onHover={(t) => setHoverTime(t)}
      />}
    </div>
  );
}

// ── Playback bar ────────────────────────────────────────────────────────────
// Play/pause, return-to-begin, scrub track, time display.
// Uses fixed-width time fields so layout doesn't thrash.

var OM_EMBED = /[?&]embed=1/.test(location.search);
function PlaybackBar({ time, duration, playing, onPlayPause, onReset, onSeek, onHover }) {
  const trackRef = React.useRef(null);
  const [dragging, setDragging] = React.useState(false);

  const timeFromEvent = React.useCallback((e) => {
    const rect = trackRef.current.getBoundingClientRect();
    const x = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    return x * duration;
  }, [duration]);

  const onTrackMove = (e) => {
    if (!trackRef.current) return;
    const t = timeFromEvent(e);
    if (dragging) {
      onSeek(t);
    } else {
      onHover(t);
    }
  };

  const onTrackLeave = () => {
    if (!dragging) onHover(null);
  };

  const onTrackDown = (e) => {
    setDragging(true);
    const t = timeFromEvent(e);
    onSeek(t);
    onHover(null);
  };

  React.useEffect(() => {
    if (!dragging) return;
    const onUp = () => setDragging(false);
    const onMove = (e) => {
      if (!trackRef.current) return;
      const t = timeFromEvent(e);
      onSeek(t);
    };
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mousemove', onMove);
    return () => {
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mousemove', onMove);
    };
  }, [dragging, timeFromEvent, onSeek]);

  const pct = duration > 0 ? (time / duration) * 100 : 0;
  const fmt = (t) => {
    const total = Math.max(0, t);
    const m = Math.floor(total / 60);
    const s = Math.floor(total % 60);
    const cs = Math.floor((total * 100) % 100);
    return `${String(m).padStart(1, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  };

  const mono = 'JetBrains Mono, ui-monospace, SFMono-Regular, monospace';

  return (
    <div data-omelette-chrome style={{
      // Slimmed to visually match the host editor bar's basic row (the
      // single-scrubber look): transport first, tighter metrics, quieter
      // chrome. Shown only outside the app — the host bar suppresses this
      // whenever it is present.
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '6px 12px',
      background: 'rgba(20,20,20,0.92)',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      width: '100%',
      maxWidth: 680,
      alignSelf: 'center',

      borderRadius: 6,
      color: '#f6f4ef',
      fontFamily: 'Inter, system-ui, sans-serif',
      userSelect: 'none',
      flexShrink: 0,
    }}>
      <IconButton onClick={onPlayPause} title="Play/pause (space)">
        {playing ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="3" y="2" width="3" height="10" fill="currentColor"/>
            <rect x="8" y="2" width="3" height="10" fill="currentColor"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 2l9 5-9 5V2z" fill="currentColor"/>
          </svg>
        )}
      </IconButton>
      <IconButton onClick={onReset} title="Return to start (0)">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 2v10M12 2L5 7l7 5V2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
        </svg>
      </IconButton>

      {/* Current time: fixed width so it doesn't thrash */}
      <div style={{
        fontFamily: mono,
        fontSize: 12,
        fontVariantNumeric: 'tabular-nums',
        width: 64, textAlign: 'right',
        color: '#f6f4ef',
      }}>
        {fmt(time)}
      </div>

      {/* Scrub track */}
      <div
        ref={trackRef}
        onMouseMove={onTrackMove}
        onMouseLeave={onTrackLeave}
        onMouseDown={onTrackDown}
        style={{
          flex: 1,
          height: 22,
          position: 'relative',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center',
        }}
      >
        <div style={{
          position: 'absolute',
          left: 0, right: 0, height: 4,
          background: 'rgba(255,255,255,0.12)',
          borderRadius: 2,
        }}/>
        <div style={{
          position: 'absolute',
          left: 0, width: `${pct}%`, height: 4,
          background: 'oklch(72% 0.12 250)',
          borderRadius: 2,
        }}/>
        <div style={{
          position: 'absolute',
          left: `${pct}%`, top: '50%',
          width: 12, height: 12,
          marginLeft: -6, marginTop: -6,
          background: '#fff',
          borderRadius: 6,
          boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
        }}/>
      </div>

      {/* Duration: fixed width */}
      <div style={{
        fontFamily: mono,
        fontSize: 12,
        fontVariantNumeric: 'tabular-nums',
        width: 64, textAlign: 'left',
        color: 'rgba(246,244,239,0.55)',
      }}>
        {fmt(duration)}
      </div>

      {typeof VideoEncoder !== 'undefined' && (
        <IconButton
          title="Export video"
          onClick={() => window.parent.postMessage({ type: 'omelette:request-video-export' }, '*')}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v7m0 0L4 6m3 3l3-3M2 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </IconButton>
      )}
    </div>
  );
}

function IconButton({ children, onClick, title }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 24, height: 24,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: hover ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 5,
        color: '#f6f4ef',
        cursor: 'pointer',
        padding: 0,
        transition: 'background 120ms',
      }}
    >
      {children}
    </button>
  );
}


// ── Scene-list plumbing ──────────────────────────────────────────────────
// Guest-side validation of a scene list (the engine's own inputs: the
// authored prop, and host-dispatched updates). Mirrors the host parser's
// shape rules and constants — keep in sync with parseTimelineScenes in
// apps/web/src/shared/timeline.ts (16KB raw cap, 50 entries, dur finite in
// (0, 300]); returns null on any violation.
function ssParse(raw) {
  if (typeof raw !== 'string' || !raw || raw.length > 16 * 1024) return null;
  var parsed;
  try { parsed = JSON.parse(raw); } catch (e) { return null; }
  if (!Array.isArray(parsed) || parsed.length === 0 || parsed.length > 50) return null;
  for (var i = 0; i < parsed.length; i++) {
    var s = parsed[i];
    if (typeof s !== 'object' || s === null) return null;
    if (typeof s.name !== 'string' || typeof s.dur !== 'number') return null;
    if (!isFinite(s.dur) || s.dur <= 0 || s.dur > 300) return null;
  }
  return parsed;
}

// Guest-side validation of the playback value — mirrors the host parser
// (shared/timeline.ts parseTimelinePlayback): {"mode":"loop"} or
// {"mode":"times","count":1..99}, strict all-or-nothing, null otherwise.
// Callers treat null as the loop default.
function ppParse(raw) {
  if (typeof raw !== 'string' || !raw || raw.length > 256) return null;
  var parsed;
  try { parsed = JSON.parse(raw); } catch (e) { return null; }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
  var keys = Object.keys(parsed);
  if (parsed.mode === 'loop') return keys.length === 1 ? { mode: 'loop' } : null;
  if (parsed.mode === 'times') {
    if (keys.length !== 2) return null;
    var c = parsed.count;
    if (typeof c !== 'number' || c !== Math.floor(c) || c < 1 || c > 99) return null;
    return { mode: 'times', count: c };
  }
  return null;
}

// Stamps the playback attribute VERBATIM from the authored raw string (the
// host's write-back anchors on that exact value) and listens for the
// host's post-write update event. Same shape as SceneSync; only rendered
// when the document authors a playback literal — an absent contract means
// the attribute stays absent and the document plays its default.
function PlaybackSync(props) {
  var ref = React.useRef(null);
  var raw = props.raw;
  var onUpdate = props.onUpdate;
  React.useEffect(function () {
    var el = ref.current;
    if (!el) return;
    var root = el.closest('[data-om-exportable-video-with-duration-secs]');
    if (!root) return;
    root.setAttribute('data-om-timeline-playback', raw);
    var onEvent = function (e) {
      var next = e && e.detail;
      if (ppParse(next)) onUpdate(next);
    };
    root.addEventListener('data-om-timeline-playback-update', onEvent);
    return function () {
      root.removeEventListener('data-om-timeline-playback-update', onEvent);
      root.removeAttribute('data-om-timeline-playback');
    };
  }, [raw, onUpdate]);
  return <div ref={ref} style={{ display: 'none' }} />;
}

// Renders inside the Stage (so it can reach the exportable root via
// closest()): stamps the scenes attribute VERBATIM from the current raw
// string — the host's write-back anchors on that exact value — and listens
// for the host's post-write update event.
function SceneSync(props) {
  var ref = React.useRef(null);
  var raw = props.raw;
  var onUpdate = props.onUpdate;
  React.useEffect(function () {
    var el = ref.current;
    if (!el) return;
    var root = el.closest('[data-om-exportable-video-with-duration-secs]');
    if (!root) return;
    root.setAttribute('data-om-timeline-scenes', raw);
    var onEvent = function (e) {
      var next = e && e.detail;
      // Ignore anything that doesn't validate — a bad update must not tear
      // down a working composition.
      if (ssParse(next)) onUpdate(next);
    };
    root.addEventListener('data-om-timeline-scenes-update', onEvent);
    return function () {
      root.removeEventListener('data-om-timeline-scenes-update', onEvent);
      root.removeAttribute('data-om-timeline-scenes');
    };
  }, [raw, onUpdate]);
  return <div ref={ref} style={{ display: 'none' }} />;
}

// ── Continuous composition ──────────────────────────────────────────────

var CompositionContext = React.createContext(null);
function useComposition() {
  var ctx = React.useContext(CompositionContext);
  if (!ctx) throw new Error('useComposition() must be called inside <CompositionStage>');
  return ctx;
}

function ccDerive(scenes) {
  var playStart = 0;
  var authStart = 0;
  var sections = [];
  var table = Object.create(null);
  for (var i = 0; i < scenes.length; i++) {
    var s = scenes[i];
    var nat = typeof s.nat === 'number' && isFinite(s.nat) && s.nat > 0 ? s.nat : s.dur;
    sections.push({ name: s.name, playStart: playStart, dur: s.dur, authStart: authStart, nat: nat });
    if (!Object.prototype.hasOwnProperty.call(table, s.name)) {
      table[s.name] = Math.round(authStart * 1000) / 1000;
    }
    playStart += s.dur;
    authStart += nat;
  }
  return {
    sections: sections,
    table: table,
    total: Math.round(playStart * 1000) / 1000,
    authoredTotal: Math.round(authStart * 1000) / 1000,
  };
}

function ccWarp(d, t) {
  var ss = d.sections;
  if (ss.length === 0) return 0;
  var idx = ss.length - 1;
  for (var i = 0; i < ss.length; i++) {
    if (t < ss[i].playStart + ss[i].dur) { idx = i; break; }
  }
  var s = ss[idx];
  var local = Math.min(Math.max(t - s.playStart, 0), s.dur);
  var T = s.authStart + (s.dur > 0 ? local * (s.nat / s.dur) : 0);
  return Math.min(T, d.authoredTotal);
}

var CC_META = Object.assign(Object.create(null), {
  toString: 1, toLocaleString: 1, valueOf: 1, toJSON: 1, then: 1,
  constructor: 1, hasOwnProperty: 1, isPrototypeOf: 1,
  propertyIsEnumerable: 1, default: 1,
});
function ccCueProxy(table, unknownRef) {
  if (typeof Proxy !== 'function') return table;
  return new Proxy(table, {
    get: function (target, prop) {
      if (typeof prop !== 'string' || prop in target) return target[prop];
      if (CC_META[prop] || prop.indexOf('@@') === 0) return Object.prototype[prop];
      unknownRef.current[prop] = true;
      return NaN;
    },
  });
}

function CcUnknownWatch(props) {
  var tl = useTimeline();
  React.useEffect(function () {
    var next = Object.keys(props.unknownRef.current).sort().join(', ');
    if (next !== props.badge) props.setBadge(next);
  }, [tl.time]);
  return null;
}

function CompositionClock(props) {
  var tl = useTimeline();
  var d = props.derived;
  var T = ccWarp(d, tl.time);
  var value = React.useMemo(function () {
    return {
      T: T,
      CUES: props.cues,
      time: tl.time,
      duration: tl.duration,
      authoredTotal: d.authoredTotal,
      playing: tl.playing || tl.extPlaying === true,
    };
  }, [T, props.cues, tl.time, tl.duration, d, tl.playing, tl.extPlaying]);
  return (
    <CompositionContext.Provider value={value}>
      {props.children}
    </CompositionContext.Provider>
  );
}

function Shot(props) {
  var c = useComposition();
  var from = +props.from;
  var to = props.to == null ? Infinity : +props.to;
  var on = isFinite(from) && c.T >= from && c.T < to;
  return (
    <div style={{ position: 'absolute', inset: 0, visibility: on ? 'visible' : 'hidden' }}>
      {props.children}
    </div>
  );
}

var CAPTION_FADE = 0.18;
function Captions(props) {
  var c = useComposition();
  var t = c.T;
  var items = (props.items || [])
    .filter(function (it) { return it && isFinite(+it.at); })
    .sort(function (a, b) { return a.at - b.at; });
  var active = null;
  var end = Infinity;
  for (var i = 0; i < items.length; i++) {
    if (t < items[i].at) break;
    active = items[i];
    end = typeof active.until === 'number' && isFinite(active.until)
      ? active.until
      : (i + 1 < items.length ? items[i + 1].at : Infinity);
  }
  if (!active || t >= end) return null;
  var o = Math.min(1, (t - active.at) / CAPTION_FADE);
  if (isFinite(end)) o = Math.min(o, (end - t) / CAPTION_FADE);
  o = Math.max(0, Math.min(1, o));
  return (
    <div
      data-om-caption
      style={Object.assign({
        position: 'absolute', left: '8%', right: '8%', bottom: '7%',
        textAlign: 'center', opacity: o, pointerEvents: 'none',
        font: '500 30px Inter, system-ui, sans-serif', color: '#f6f4ef',
        textShadow: '0 1px 14px rgba(0,0,0,0.45)',
      }, props.style)}
    >{active.text}</div>
  );
}

function CompositionStage(props) {
  var width = +props.width || 1280;
  var height = +props.height || 720;
  var bg = props.bg || '#0b0b0e';
  var autoplay = props.autoplay == null ? true : String(props.autoplay) !== 'false';
  var loop = props.loop == null ? true : String(props.loop) !== 'false';
  var state = React.useState(props.scenes);
  var raw = state[0];
  var setRaw = state[1];
  var scenes = React.useMemo(function () { return ssParse(raw); }, [raw]);
  var pstate = React.useState(props.playback);
  var praw = pstate[0];
  var setPraw = pstate[1];
  var pb = React.useMemo(function () { return ppParse(praw); }, [praw]);
  var unknownRef = React.useRef({});
  var badgeState = React.useState('');
  var badge = badgeState[0];
  var setBadge = badgeState[1];
  var derived = React.useMemo(function () {
    unknownRef.current = {};
    return scenes ? ccDerive(scenes) : null;
  }, [scenes]);
  var cues = React.useMemo(function () {
    return derived ? ccCueProxy(derived.table, unknownRef) : null;
  }, [derived]);
  React.useEffect(function () {
    var next = Object.keys(unknownRef.current).sort().join(', ');
    if (next !== badge) setBadge(next);
  });
  if (!scenes) {
    return (
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#0b0b0e', color: '#c96442',
        font: '500 16px Inter, system-ui, sans-serif', textAlign: 'center',
      }}>
        animations-v3: the scenes prop isn't a valid JSON scene list
        <br />(expected '[{'{'}"name":"…","dur":N{'}'}, …]')
      </div>
    );
  }
  return (
    <React.Fragment>
      <Stage width={width} height={height} duration={derived.total} background={bg}
             autoplay={autoplay} loop={loop} playback={pb}>
        <SceneSync raw={raw} onUpdate={setRaw} />
        {typeof praw === 'string' && praw !== '' && (
          <PlaybackSync raw={praw} onUpdate={setPraw} />
        )}
        <CompositionClock derived={derived} cues={cues}>
          {props.children}
        </CompositionClock>
        <CcUnknownWatch unknownRef={unknownRef} badge={badge} setBadge={setBadge} />
      </Stage>
      {badge !== '' && (
        // Sibling of Stage, outside the exportable <svg>: visible in the
        // preview (and its screenshots), never in the exported video.
        <div
          data-om-unknown-cues
          style={{
            position: 'absolute', left: 12, bottom: 56, zIndex: 10,
            padding: '6px 10px', borderRadius: 6,
            background: 'rgba(0,0,0,0.72)', color: '#e8906a',
            font: '500 12px Inter, system-ui, sans-serif',
            pointerEvents: 'none',
          }}
        >
          choreography references unknown section{badge.indexOf(',') >= 0 ? 's' : ''}: {badge}
        </div>
      )}
    </React.Fragment>
  );
}


// Strokes as layers: paint multiplies, so stroke images stacked with
// mix-blend-mode:multiply over the paper reproduce the flat render.

var WC_PIXEL_CAP = 11000000;

function wcLayerOpts(props) {
  var w = +props.width || 900, h = +props.height || 1200;
  var askScale = +props.scale || 1;
  return { width: w, height: h, scale: Math.min(askScale, Math.sqrt(WC_PIXEL_CAP / (w * h))), seed: props.seed == null ? undefined : +props.seed, quality: props.quality == null ? undefined : +props.quality };
}

var wcWarned = {};
function wcWarnOnce(key, message, err) {
  if (wcWarned[key]) return;
  wcWarned[key] = true;
  console.warn(message, err);
}

function useWatercolorLayers(painting, opts) {
  var kit = window.WatercolorKit;
  if (typeof painting !== 'function' || !kit || typeof kit.layers !== 'function') return null;
  try {
    return kit.layers(painting, wcLayerOpts(opts || {}));
  } catch (e) {
    wcWarnOnce('layers:' + e, 'watercolor painting failed to build; rendering the fallback sheet', e);
    return null;
  }
}

var WatercolorSheetContext = React.createContext(null);

function WatercolorSheet(props) {
  var L = props.layers || null;
  var style = Object.assign({
    position: 'relative', display: 'block', width: '100%',
    aspectRatio: L ? L.width + ' / ' + L.height : '3 / 4',
    isolation: 'isolate', overflow: 'hidden',
  }, props.style);
  if (!L) {
    return (
      <div style={Object.assign(style, { background: '#f4f1e8', color: '#8a8270', font: '12px system-ui, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' })}>
        watercolor-kit.js not loaded (or the painting failed to build)
      </div>
    );
  }
  return (
    <WatercolorSheetContext.Provider value={L}>
      <div style={style} data-om-watercolor-sheet>
        <img src={L.paper} alt={props.alt || ''} style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', display: 'block' }} />
        {props.children}
      </div>
    </WatercolorSheetContext.Provider>
  );
}

function WatercolorStroke(props) {
  var fromSheet = React.useContext(WatercolorSheetContext);
  var L = props.layers || fromSheet;
  if (!L) return null;
  var i = +props.index;
  if (!(i >= 0) || i >= L.count) return null;
  var at = props.at == null ? 1 : clamp(+props.at, 0, 1);
  if (!(at > 0)) return null;
  var box, src;
  try {
    box = L.box(i);
    src = box ? L.src(i, at) : null;
  } catch (e) {
    wcWarnOnce('stroke:' + i + ':' + e, 'watercolor stroke ' + i + ' failed to render; skipping it', e);
    return null;
  }
  if (!box || !src) return null;
  var style = Object.assign({
    position: 'absolute', display: 'block',
    left: box.x * 100 + '%', top: box.y * 100 + '%',
    width: box.w * 100 + '%', height: box.h * 100 + '%',
    mixBlendMode: L.kind(i) === 'reserve' ? 'normal' : 'multiply',
    pointerEvents: 'none',
  }, props.style);
  return <img src={src} alt="" data-om-watercolor-stroke={i} data-om-stroke-kind={L.kind(i)} style={style} />;
}

// The default watercolor moment: the painting assembled from its strokes,
// each appearing in painting order (a pure function of T).
function WatercolorPainting(props) {
  var c = useComposition();
  var from = +props.from || 0;
  var to = props.to == null ? from + 6 : +props.to;
  var u = clamp((c.T - from) / Math.max(to - from, 0.001), 0, 1);
  var eased = Easing.easeInOutQuad(u);
  var L = useWatercolorLayers(props.painting, props);
  var tick = React.useState(0)[1];
  var warmed = React.useRef(null);
  React.useEffect(function () {
    if (!L || typeof L.warm !== 'function') return;
    var p = L.warm();
    if (warmed.current === p) return;
    var live = true;
    p.then(function () { warmed.current = p; if (live) tick(function (x) { return x + 1; }); });
    return function () { live = false; };
  }, [L && L.paper, props.painting]);
  var strokes = [];
  if (L) {
    for (var i = 0; i < L.count; i++) {
      var sp = L.span(i);
      var at = clamp((eased - sp.from) / Math.max(sp.to - sp.from, 1e-6), 0, 1);
      if (at <= 0) break;
      strokes.push(<WatercolorStroke key={i} layers={L} index={i} at={at} />);
    }
  }
  return <WatercolorSheet layers={L} style={props.style} alt={props.alt}>{strokes}</WatercolorSheet>;
}

// Paint-on watercolor reveal as a pure function of T — an <img> with a data:
// URL (the exporter serializes those as-is; a live canvas would export blank).
function WatercolorReveal(props) {
  var c = useComposition();
  var from = +props.from || 0;
  var to = props.to == null ? from + 6 : +props.to;
  var u = clamp((c.T - from) / Math.max(to - from, 0.001), 0, 1);
  var style = Object.assign({ display: 'block', width: '100%', height: '100%', objectFit: 'contain' }, props.style);
  var frames = Array.isArray(props.frames) && props.frames.length ? props.frames : null;
  var steps = frames ? frames.length - 1 : Math.max(1, Math.round(+props.steps || 36));
  var i = Math.min(steps, Math.round(Easing.easeInOutQuad(u) * steps));
  var painting = typeof props.painting === 'function' ? props.painting : null;
  var kit = window.WatercolorKit;
  var w = +props.width || 900, h = +props.height || 1200;
  var askScale = +props.scale || Math.min(2, window.devicePixelRatio || 1);
  var opts = {
    width: w, height: h,
    scale: Math.min(askScale, Math.sqrt(11000000 / (w * h))),
    seed: props.seed == null ? undefined : +props.seed, steps: steps,
    type: props.format || 'image/jpeg', quality: props.quality == null ? 0.88 : +props.quality,
  };
  var key = opts.width + 'x' + opts.height + '#' + opts.seed + '@' + opts.scale + '/' + steps + ':' + opts.type + '/' + opts.quality;
  var cache = React.useRef({ fn: null, key: '', frames: {}, baking: false }).current;
  var tick = React.useState(0)[1];
  if ((cache.fn !== painting && String(cache.fn) !== String(painting)) || cache.key !== key) {
    cache.key = key;
    cache.frames = {};
    cache.baking = false;
  }
  cache.fn = painting;
  React.useEffect(function () {
    if (frames || cache.baking || !painting || !kit || typeof kit.bake !== 'function') return;
    cache.baking = true;
    var target = cache.frames;
    try {
      kit.bake(painting, opts, function (n, _t, url) {
        target[n] = url;
      }).then(function (all) {
        if (cache.frames !== target) return;
        for (var n = 0; n < all.length; n++) target[n] = all[n];
        tick(function (x) { return x + 1; });
      }).catch(function () {
        /* failed bake: the guarded lazy path below still renders */
      });
    } catch (e) {
      /* oversized painting: the guarded lazy path below still renders */
    }
  });
  if (frames) return <img src={frames[i]} alt={props.alt || ''} style={style} />;
  if (!kit || !painting) {
    return (
      <div style={Object.assign({ width: '100%', height: '100%', background: '#f4f1e8', color: '#8a8270', font: '12px system-ui, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }, props.style)}>
        watercolor-kit.js not loaded (or no painting function)
      </div>
    );
  }
  if (!cache.frames[i]) {
    try {
      cache.frames[i] = kit.frame(painting, Object.assign({}, opts, { at: i / steps }));
    } catch (e) {
      return (
        <div style={Object.assign({ width: '100%', height: '100%', background: '#f4f1e8', color: '#8a8270', font: '12px system-ui, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }, props.style)}>
          painting too large to render ({String(e && e.message).slice(0, 80)})
        </div>
      );
    }
  }
  return <img src={cache.frames[i]} alt={props.alt || ''} style={style} />;
}

Object.assign(window, {
  Easing, interpolate, animate, clamp,
  TimelineContext, useTime, useTimeline,
  Stage, PlaybackBar,
  CompositionStage, useComposition, Shot, Captions, WatercolorReveal,
  WatercolorPainting, WatercolorSheet, WatercolorStroke, useWatercolorLayers,
});
// JUSFEM — tres animaciones (Argumento, Documento, Favoritos). Producto 1440×810 a escala 1920×1080, cámara 960×1080.
const AW = 1440, AH = 810, SW = 1152, SH = 1080, BASE = 1920 / AW;
const SERIF = "'Source Serif 4',Georgia,serif";
const INTER = "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif";
const EZ = { move: Easing.easeInOutCubic, enter: Easing.easeOutCubic };

function kf(keys, T) {
  if (T <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1] = keys[i], [t0, v0] = keys[i - 1];
    if (T <= t1) {
      const p = EZ.move(clamp((T - t0) / Math.max(t1 - t0, 1e-6), 0, 1));
      return Array.isArray(v0) ? v0.map((a, j) => a + (v1[j] - a) * p) : v0 + (v1 - v0) * p;
    }
  }
  return keys[keys.length - 1][1];
}
// Movimiento de mouse con curva y desaceleración larga
function humanPath(keys, T) {
  if (T <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, b] = keys[i], [t0, a] = keys[i - 1];
    if (T > t1) continue;
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy);
    if (d < 0.5 || t1 <= t0) return a;
    const u = clamp((T - t0) / (t1 - t0), 0, 1), e = (1 - Math.cos(Math.PI * Math.pow(u, 0.72))) / 2;
    const sg = i % 2 ? 1 : -1, k = Math.min(d * 0.14, 60) * sg;
    const cx = (a[0] + b[0]) / 2 - dy / d * k, cy = (a[1] + b[1]) / 2 + dx / d * k;
    return [(1 - e) * (1 - e) * a[0] + 2 * (1 - e) * e * cx + e * e * b[0], (1 - e) * (1 - e) * a[1] + 2 * (1 - e) * e * cy + e * e * b[1]];
  }
  return keys[keys.length - 1][1];
}
const fade = (T, s, d = 0.35) => EZ.enter(clamp((T - s) / d, 0, 1));
const between = (T, a, b, d = 0.25) => Math.min(fade(T, a, d), 1 - fade(T, b, d));
const rise = (T, s, d = 0.4) => { const p = fade(T, s, d); return { opacity: p, transform: `translateY(${(1 - p) * 10}px)` }; };
const typed = (str, T, a, b) => str.slice(0, Math.round(str.length * clamp((T - a) / (b - a), 0, 1)));
const pressAt = (T, list) => Math.max(0, ...list.map(t => { const d = T - t; return d > -0.08 && d < 0.14 ? clamp(1 - Math.abs(d - 0.03) / 0.11, 0, 1) : 0; }));
function offsetIn(el, root) {
  let x = 0, y = 0, n = el;
  while (n && n !== root) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}
function useMeasure(names, fallback, key) {
  const refs = React.useRef(null);
  if (!refs.current) { refs.current = { root: React.createRef() }; names.forEach(n => refs.current[n] = React.createRef()); }
  const [pos, setPos] = React.useState(fallback);
  React.useLayoutEffect(() => {
    const measure = () => {
      const r = refs.current.root.current; if (!r) return;
      setPos(prev => { const o = Object.assign({}, prev); names.forEach(n => { const el = refs.current[n].current; if (el && el.offsetWidth) o[n] = offsetIn(el, r); }); return o; });
    };
    measure();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    const id = setTimeout(measure, 700);
    return () => clearTimeout(id);
  }, [key]);
  return [refs.current, pos];
}
const ctr = (b, dx = 0.5, dy = 0.5) => [b.x + b.w * dx, b.y + b.h * dy];

const star = (fill, size = 14) => <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d="M12 3.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.4L12 18.3l-5.8 3 1.1-6.4L2.6 10.3l6.5-.9z"></path></svg>;
const Icon = {
  panel: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2.5"></rect><path d="M9 4v16"></path></svg>,
  x: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M6 6l12 12"></path><path d="M18 6L6 18"></path></svg>,
  share: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M20 14.5v3.9a2 2 0 01-2 2H6a2 2 0 01-2-2v-3.9"></path><path d="M12 15V4"></path><path d="M8 7.6L12 3.6l4 4"></path></svg>,
  doc: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"></path><path d="M14 3v5h5"></path><path d="M9 13h6"></path><path d="M9 17h4"></path></svg>,
  clip: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M20 11.5l-8.2 8.2a4.2 4.2 0 01-6-6l8-8a2.8 2.8 0 014 4l-8 8a1.4 1.4 0 01-2-2l7.3-7.3"></path></svg>,
  up: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V5"></path><path d="M5.5 11.5L12 5l6.5 6.5"></path></svg>,
  check: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg>,
  eye: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#622C7B" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12z"></path><circle cx="12" cy="12" r="2.6"></circle></svg>,
  tri: <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 1l6 4-6 4z"></path></svg>,
  chev: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9.5l6 6 6-6"></path></svg>,
  chevR: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"></path></svg>,
  folder: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"><path d="M3 7.5A1.5 1.5 0 014.5 6h4l2 2.5h7A1.5 1.5 0 0119 10v7.5a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 013 17.5z"></path></svg>,
  plus: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14"></path><path d="M5 12h14"></path></svg>,
  dots: <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5"></circle><circle cx="12" cy="12" r="1.5"></circle><circle cx="12" cy="19" r="1.5"></circle></svg>,
  dl: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3.5v12"></path><path d="M7 11l5 5 5-5"></path><path d="M4 20.5h16"></path></svg>,
  dl14: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3.5v12"></path><path d="M7 11l5 5 5-5"></path><path d="M4 20.5h16"></path></svg>,
  ext: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 4.5h5.5V10"></path><path d="M19.5 4.5L12 12"></path><path d="M18 14v5.5H4.5V6H10"></path></svg>,
  copy: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="4" y="3" width="13" height="16" rx="2"></rect><path d="M20 7v12a2 2 0 01-2 2H8"></path></svg>,
  warn: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3.5L22 20H2z"></path><path d="M12 10v4.5"></path><path d="M12 17.2v.2"></path></svg>,
  zin: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="11" cy="11" r="6.5"></circle><path d="M16 16l4.5 4.5"></path><path d="M8 11h6"></path><path d="M11 8v6"></path></svg>,
  zout: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="11" cy="11" r="6.5"></circle><path d="M16 16l4.5 4.5"></path><path d="M8 11h6"></path></svg>,
};
const roundBtn = (active, hover) => ({ display: "flex", alignItems: "center", gap: 7, borderRadius: 8, fontSize: 12, padding: "8px 10px", background: active ? "#622C7B" : (hover ? "#F3EDF7" : "transparent"), color: active ? "#fff" : "#622C7B" });
const pill = (active, hover) => { const c = active ? "#622C7B" : (hover ? "#F3EDF7" : "transparent"); return { display: "flex", alignItems: "center", gap: 7, border: "1px solid " + c, borderRadius: 8, padding: "6px 12px", fontSize: 12, fontFamily: INTER, background: c, color: active ? "#fff" : "#622C7B" }; };
const tabSt = (active) => ({ border: "1px solid " + (active ? "#E0D2EA" : "transparent"), borderRadius: 8, fontSize: 13.5, padding: "8px 17px", whiteSpace: "nowrap", background: active ? "#fff" : "transparent", color: "#622C7B", boxShadow: active ? "0 1px 3px rgba(98,44,123,.16)" : "none" });
const sqBtn = (strong) => ({ width: 30, height: 30, border: "1px solid " + (strong ? "#8F86A0" : "#F3EDF7"), borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#622C7B", fontSize: 14, background: "#fff" });
const hlSpan = { background: "#DFF0EA", borderRadius: 2, padding: "1px 3px", boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" };

function Cursor({ x, y, press }) {
  return (
    <div style={{ position: "absolute", left: x, top: y, zIndex: 60, pointerEvents: "none", transform: `scale(${1 - press * 0.18})`, transformOrigin: "3px 2px" }}>
      <svg width="22" height="26" viewBox="0 0 22 26" style={{ display: "block", filter: "drop-shadow(0 2px 3px rgba(11,11,11,.28))" }}>
        <path d="M2 1.5v19.2l5-4.6 3.3 7.4 3.4-1.5-3.3-7.2 6.9-.3z" fill="#0B0B0B" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round"></path>
      </svg>
    </div>
  );
}
function Ripples({ T, list, dur = 0.3 }) {
  return list.map(([x, y, at], i) => {
    const p = clamp((T - at) / dur, 0, 1);
    if (p <= 0 || p >= 1) return null;
    return <div key={i} style={{ position: "absolute", left: x - 22, top: y - 22, width: 44, height: 44, borderRadius: "50%", border: "2px solid #622C7B", opacity: 0.55 * (1 - p), transform: `scale(${0.3 + EZ.enter(p) * 0.9})`, zIndex: 59, pointerEvents: "none" }}></div>;
  });
}
function Thinking({ T, on, label }) {
  return (
    <div style={{ height: 0, position: "relative" }}>
      <div style={{ position: "absolute", left: 0, top: 0, display: "flex", alignItems: "center", gap: 11, color: "#6B6377", fontSize: 14, fontFamily: INTER, opacity: on }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#622C7B" strokeWidth="2.2" strokeLinecap="round" style={{ transform: `rotate(${(T * 400) % 360}deg)` }}><path d="M12 3a9 9 0 019 9"></path><path d="M21 12a9 9 0 01-9 9" opacity=".25"></path><path d="M12 21a9 9 0 01-9-9" opacity=".25"></path><path d="M3 12a9 9 0 019-9" opacity=".25"></path></svg>
        <span>{label}</span>
      </div>
    </div>
  );
}

// Cámara + marco. cam = [fx, fy, zoom]; zoom 0.5 = producto completo.
function Camera({ cam, children, op = 1 }) {
  const S = BASE * cam[2];
  const fit = (c, view, size) => { const lo = view - size * S; return lo > 0 ? lo / 2 : clamp(view / 2 - c * S, lo, 0); };
  const tx = fit(cam[0], SW, AW), ty = fit(cam[1], SH, AH);
  const r = 14 * clamp((1 - cam[2]) / 0.5, 0, 1);
  return (
    <div style={{ position: "absolute", inset: 0, background: "#F7F6F8", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: AW, height: AH, transformOrigin: "0 0", transform: `translate(${tx}px, ${ty}px) scale(${S})`, opacity: op, borderRadius: r, overflow: "hidden", boxShadow: `0 18px 50px rgba(98,44,123,${0.18 * clamp((1 - cam[2]) / 0.5, 0, 1)})` }}>
        {children}
      </div>
    </div>
  );
}

// Interfaz del producto (estado controlado por props)
function App(p) {
  const R = p.refs;
  const side = p.sideP || 0, docs = p.docsP || 0;
  const shift = 131 * side - 207 * docs;
  return (
    <div ref={R.root} style={{ position: "relative", width: AW, height: AH, overflow: "hidden", background: "#F7F6F8", fontFamily: INTER, color: "#0B0B0B", fontSize: 15 }}>
      {p.sidebar && <Sidebar p={side} refs={R} favP={p.favRowP || 0} flash={p.favFlash || 0} favHover={p.favRowHover} favSel={p.favSel} />}

      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 44, padding: "14px 18px", boxSizing: "content-box", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 9 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ position: "relative", display: "flex" }}>
            <img src="/UI/logo-jusfem.svg" alt="JUSFEM" style={{ height: 53, width: "auto", display: "block", marginTop: -12, marginLeft: -6 }} />
            <div style={{ position: "absolute", left: 2, top: 38, fontSize: 8, fontWeight: 500, color: "#6B6377", letterSpacing: ".03em", lineHeight: 1.4, width: 128 }}>Asistente jurídico con<br />enfoque de derechos humanos</div>
          </div>
          <div style={{ width: 20 + 92 * side }}></div>
          <div style={{ position: "relative", display: "flex" }}>
            <div ref={R.panelBtn} style={roundBtn(false, p.panelHover)}>{side > 0.5 ? Icon.x : Icon.panel}</div>
            <div style={{ position: "absolute", left: 14, top: "calc(100% + 4px)", zIndex: 31, width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderBottom: "6px solid #0B0B0B", opacity: p.tipP || 0 }}></div>
            <div style={{ position: "absolute", left: 0, top: "calc(100% + 10px)", zIndex: 30, width: 220, display: "flex", alignItems: "flex-start", gap: 8, background: "#0B0B0B", color: "#F5F4F6", borderRadius: 8, padding: "10px 12px", fontSize: 12, lineHeight: 1.5, opacity: p.tipP || 0, transform: `translateY(${(1 - (p.tipP || 0)) * -8}px)` }}>
              <span style={{ display: "flex", flex: "0 0 12px", marginTop: 3, color: "#fff" }}>{star("#fff", 12)}</span>
              <span>Guardado en favoritos. Los encuentras aquí, dentro de la conversación.</span>
            </div>
          </div>
          <div style={{ width: 8 * side }}></div>
          <div style={{ fontSize: 12, fontWeight: 500, opacity: p.titleOp ?? 1 }}>{p.title}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={roundBtn(false)}>{Icon.share}</div>
          <div style={roundBtn(docs > 0.5)}>{Icon.doc}Documentos</div>
        </div>
      </div>
      <div style={{ position: "absolute", left: 262 * side, right: 0, top: 0, height: 70, zIndex: 4, background: "linear-gradient(#F7F6F8 62%, rgba(247,246,248,0))" }}></div>

      <div style={{ position: "absolute", left: 0, right: 0, top: 0, paddingTop: 84, transform: `translate(${shift}px, ${-(p.scroll || 0)}px)` }}>
        <div ref={R.col} style={{ width: 560, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>{p.children}</div>
      </div>

      <div style={{ position: "absolute", left: 262 * side, right: 0, bottom: 0, height: 200, zIndex: 5, background: "linear-gradient(rgba(247,246,248,0), #F7F6F8 44px)" }}></div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 18, zIndex: 6, transform: `translateX(${shift}px)` }}>
        <div ref={R.comp} style={{ width: 690, margin: "0 auto", border: `1px solid ${p.focused ? "#E0D2EA" : "#F3EDF7"}`, borderRadius: 18, padding: "20px 20px 14px", background: "#fff", boxShadow: p.focused ? "0 4px 18px rgba(98,44,123,.12)" : "0 2px 10px rgba(98,44,123,.06)" }}>
          <div ref={R.ta} style={{ fontSize: 14, lineHeight: 1.5, minHeight: 21, margin: "0 0 20px", color: p.draft ? "#0B0B0B" : "#6B6377", textWrap: "pretty" }}>
            {p.draft || (p.focused ? "" : "Escribe tu consulta")}
            {p.caret && <span ref={R.caret} style={{ display: "inline-block", width: 1.5, height: 17, background: "#0B0B0B", verticalAlign: "-3px", marginLeft: 1 }}></span>}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", color: "#622C7B" }}>{Icon.clip}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex", background: "#F5F4F6", borderRadius: 12, padding: 4 }}>
                <div style={tabSt(p.mode !== "Argumento")}>Búsqueda</div>
                <div ref={R.tabA} style={Object.assign(tabSt(p.mode === "Argumento"), p.tabAHover && p.mode !== "Argumento" ? { background: "#F3EDF7" } : {})}>Argumento</div>
              </div>
              <div ref={R.send} style={{ width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: p.draft ? "#622C7B" : "#F3EDF7", color: p.draft ? "#fff" : "#C7B3D2" }}>{Icon.up}</div>
            </div>
          </div>
        </div>
        <div style={{ textAlign: "center", fontSize: 12, color: "#6B6377", fontStyle: "italic", marginTop: 11 }}>JUSFEM es una herramienta de apoyo. Sus respuestas deben ser validadas por la persona responsable.</div>
      </div>

      {p.wizard && <Wizard w={p.wizard} refs={R} />}
      {p.docsPanel && <DocsPanel p={docs} refs={R} page={p.page || 0} pageP={p.pageP ?? 1} hl={p.hl || 0} prevHover={p.nextHover} />}

      {p.overlay}
    </div>
  );
}

function Sidebar({ p, refs, favP, flash = 0, favHover, favSel }) {
  const row = (active, hover) => ({ position: "relative", display: "flex", alignItems: "center", gap: 7, borderRadius: 6, fontSize: 12, color: "#622C7B", padding: "8px 9px", background: active ? "#DED9E4" : (hover ? "#E4E1E8" : "transparent"), fontWeight: active ? 500 : 400 });
  const label = { fontSize: 10, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "#0B0B0B" };
  const ell = { flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
  return (
    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 262, zIndex: 7, transform: `translateX(${-262 * (1 - p)}px)`, opacity: p > 0 ? 1 : 0 }}>
      <div style={{ width: 262, height: "100%", padding: "100px 14px 18px", display: "flex", flexDirection: "column", gap: 14, background: "#EFEDF1", borderRight: "1px solid #F3EDF7", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, alignSelf: "flex-start", border: "1px solid #E0D2EA", borderRadius: 8, fontSize: 12, padding: "8px 12px", color: "#622C7B" }}>{Icon.plus}Nueva conversación</div>
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 32, paddingRight: 4 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px" }}><span style={label}>Carpetas</span><span style={{ display: "flex", color: "#622C7B", padding: 4 }}>{Icon.plus}</span></div>
            {[["Casos en trámite", 3], ["Investigación", 2]].map(([n, c]) => (
              <div key={n} style={row(false)}>{Icon.chevR}{Icon.folder}<span>{n}</span><span style={{ fontSize: 10, color: "#6B6377", marginLeft: -2 }}>{c}</span><span style={{ flex: 1 }}></span></div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ ...label, padding: "0 4px" }}>Conversaciones</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <div style={row(true)}><span style={ell}>Debida diligencia reforzada</span><span style={{ display: "flex", color: "#622C7B" }}>{Icon.dots}</span></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 1, padding: "2px 0 4px 14px", marginLeft: 8, borderLeft: "1px solid #E0D2EA" }}>
                {[["favRow", "Idea clave: debida diligencia reforzada"], ["favRow2", "Estándar aplicable: Belém do Pará, art. 7"], ["favRow3", "Idea clave: acceso a la justicia"]].map(([k, t], i) => (
                  <div key={k} style={i === 0 ? { height: 30, opacity: favP } : {}}>
                    <div ref={refs[k]} style={{ display: "flex", alignItems: "center", gap: 6, borderRadius: 6, padding: "6px 8px", fontSize: 12, color: "#622C7B", background: favSel === i ? "#DED9E4" : (i === 0 && flash > 0 ? `rgba(98,44,123,${0.14 * flash})` : (favHover === i ? "#E4E1E8" : "transparent")), boxShadow: i === 0 && flash > 0 ? `inset 0 0 0 1px rgba(98,44,123,${0.35 * flash})` : "none", fontWeight: favSel === i ? 500 : 400, transform: i === 0 ? `translateX(${(1 - favP) * -24}px)` : "none" }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ flex: "0 0 10px", transform: i === 0 ? `scale(${favP * (1 + 0.7 * Math.sin(Math.PI * favP))})}` : "none" }}><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"></path></svg>
                      <span style={ell}>{t}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={row(false)}><span style={ell}>Violencia obstétrica: estándares</span></div>
              <div style={row(false)}><span style={ell}>Medidas de protección</span></div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9, padding: "12px 4px 2px", borderTop: "1px solid #E0D2EA" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: "0 0 26px", width: 26, height: 26, borderRadius: "50%", background: "#622C7B", color: "#fff", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>U</div>
            <span style={{ flex: 1, fontSize: 12 }}>usuaria@jusfem.pe</span>
            <span style={{ display: "flex", color: "#622C7B" }}>{Icon.dots}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ height: 3, borderRadius: 2, background: "#DED9E4", overflow: "hidden" }}><div style={{ width: "38%", height: "100%", background: "#622C7B" }}></div></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#6B6377" }}><span>Consumo</span><span>38%</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

const DOC_N1 = {
  tab: "Corte IDH 2009", title: "N1 — Corte IDH, Caso González y otras vs. México (2009)", meta: "Sentencia · Serie C No. 205 · párr. 250–286",
  pages: [[
    "Los Estados deben adoptar medidas integrales para cumplir con la debida diligencia en casos de violencia contra las mujeres. En particular, deben contar con un adecuado marco jurídico de protección, con una aplicación efectiva del mismo y con políticas de prevención y prácticas que permitan actuar de una manera eficaz ante las denuncias (párr. 258).",
    "La Corte establece que, en un contexto de violencia contra las mujeres, el deber de debida diligencia adquiere carácter reforzado desde que las autoridades toman conocimiento de una situación de riesgo real e inmediato para una persona determinada (párr. 258).",
    "La ausencia de una respuesta estatal inmediata frente a la denuncia de desaparición constituye una forma de discriminación en el acceso a la justicia, porque revela que el Estado no valoró el riesgo con la seriedad que el contexto exigía (párr. 400).",
  ], [
    "Sobre el deber de prevención, la Corte precisa que las primeras horas son decisivas: exige medidas exhaustivas de búsqueda, coordinación entre instituciones y actuación de oficio, sin trasladar a la familia la carga de impulsar la investigación (párr. 283).",
    "La investigación debe descartar de plano el uso de estereotipos de género en la valoración de la conducta de la víctima; toda inferencia basada en su vida personal vicia la línea investigativa (párr. 401).",
  ]],
};

function DocsPanel({ p, refs, page, pageP, hl, prevHover }) {
  const body = (pg, op, key) => (
    <div key={key} style={{ position: key === "old" ? "absolute" : "relative", inset: key === "old" ? 0 : "auto", display: "flex", flexDirection: "column", gap: 12, opacity: op, transform: `translateY(${(1 - op) * (key === "old" ? -6 : 6)}px)` }}>
      {DOC_N1.pages[pg].map((t, i) => (
        <div key={i} ref={pg === 0 && i === 1 ? refs.par : null} style={{ textWrap: "pretty", borderRadius: 2, padding: "2px 4px", margin: "-2px -4px", background: pg === 0 && i === 1 ? `rgba(223,240,234,${hl})` : "transparent" }}>{t}</div>
      ))}
    </div>
  );
  return (
    <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 414, padding: "74px 14px 14px 0", zIndex: 7, transform: `translateX(${(1 - p) * 430}px)`, opacity: p > 0 ? 1 : 0 }}>
      <div style={{ height: "100%", border: "1px solid #F3EDF7", borderRadius: 12, background: "#fff", padding: "0 22px 20px", display: "flex", flexDirection: "column", gap: 14, overflow: "hidden", boxShadow: "0 10px 30px rgba(98,44,123,.08)" }}>
        <div style={{ display: "flex", alignItems: "center", height: 61, flex: "0 0 61px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, border: "1px solid #F3EDF7", borderRadius: 8, fontSize: 14, color: "#622C7B", padding: "7px 11px" }}>{DOC_N1.tab}{Icon.chev}</div>
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14.5, lineHeight: 1.5 }}>{DOC_N1.title}</div>
          <div style={{ fontSize: 12, color: "#6B6377", marginTop: 5 }}>{DOC_N1.meta}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid #F3EDF7", borderRadius: 8, padding: "6px 10px", fontSize: 12, color: "#622C7B" }}>{Icon.dl}Descargar</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid #F3EDF7", borderRadius: 8, padding: "6px 10px", fontSize: 12, color: "#622C7B" }}>{Icon.ext}Abrir en pestaña</div>
        </div>
        <div style={{ position: "relative", flex: 1, minHeight: 0, lineHeight: 1.65, fontSize: 14, overflow: "hidden" }}>
          {page === 0 ? body(0, 1, "cur") : [body(0, 1 - pageP, "old"), body(1, pageP, "cur")]}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 10, fontSize: 12, color: "#6B6377" }}>
          <div style={sqBtn(false)}>{Icon.zout}</div>
          <div style={sqBtn(false)}>{Icon.zin}</div>
          <span style={{ flex: 1 }}></span>
          <span>3 páginas</span>
          <div style={Object.assign(sqBtn(false), { color: page > 0 ? "#622C7B" : "#C7B3D2" })}>‹</div>
          <div style={sqBtn(true)}>{page + 1}</div>
          <div ref={refs.next} style={Object.assign(sqBtn(false), prevHover ? { background: "#F3EDF7" } : {})}>›</div>
        </div>
      </div>
    </div>
  );
}

const WSTEPS = {
  1: { title: "Especialidad del caso:" },
  2: { title: "Derecho o tema central en cuestión:" },
  3: { title: "Selecciona hechos relevantes del caso guardados en favoritos:", hint: "Selecciona hechos clave que deben ser considerados de tus favoritos" },
  4: { title: "Agregar hechos relevantes del caso no guardados:", hint: "Puede agregar un breve resumen de los hechos clave que deben ser considerados." },
  5: { title: "Objetivo del párrafo:" },
};
function Wizard({ w, refs }) {
  const m = WSTEPS[w.step];
  const field = (val, caret, tall, ref) => (
    <div ref={ref} style={{ width: tall ? "73%" : "83%", minHeight: tall ? 195 : 0, border: "1px solid " + (caret ? "#622C7B" : "#8F86A0"), borderRadius: 8, padding: "13px 15px", fontSize: 14, lineHeight: 1.6, color: val ? "#0B0B0B" : "#6B6377", background: "#fff" }}>
      {val || (caret ? "" : "Escriba aquí su respuesta")}{caret && <span style={{ display: "inline-block", width: 1.5, height: 17, background: "#0B0B0B", verticalAlign: "-3px", marginLeft: 1 }}></span>}
    </div>
  );
  const opt = (sel, hover) => ({ display: "flex", alignItems: "center", gap: 10, border: "1px solid " + (sel ? "#622C7B" : "#F3EDF7"), borderRadius: 8, padding: "9px 13px", fontSize: 14, color: "#0B0B0B", background: sel ? "#F3EDF7" : (hover ? "#F7F6F8" : "#fff") });
  const btn = (solid, enabled, hover) => solid
    ? { borderRadius: 8, padding: "9px 20px", fontSize: 12, background: enabled ? "#622C7B" : "#F3EDF7", color: enabled ? "#fff" : "#C7B3D2" }
    : { border: "1px solid #8F86A0", borderRadius: 8, padding: "8px 18px", fontSize: 12, color: "#622C7B", background: hover ? "#F3EDF7" : "#fff" };
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 43, zIndex: 12, pointerEvents: "none", opacity: w.p, transform: `translateY(${(1 - w.p) * 8}px)` }}>
      <div ref={refs.wiz} style={{ width: 690, minHeight: 530, background: "#fff", border: "1px solid #F3EDF7", borderRadius: 20, boxShadow: "0 12px 40px rgba(98,44,123,.12)", padding: "26px 34px 22px", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ background: "#622C7B", color: "#fff", borderRadius: 4, padding: "3px 9px", fontSize: 12, fontWeight: 600 }}>{w.step}/5</div>
          <div style={{ fontSize: 20, lineHeight: 1, color: "#622C7B" }}>×</div>
        </div>
        <div style={{ lineHeight: 1.6, fontSize: 14, textWrap: "pretty" }}>Para poder asistirte con la generación de párrafos argumentativos con enfoque de derechos humanos, necesito que me proporciones la siguiente información sobre el caso:</div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14, opacity: w.stepP, transform: `translateX(${(1 - w.stepP) * 12}px)` }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{m.title}</div>
          {m.hint && <div style={{ fontSize: 12, fontStyle: "italic", lineHeight: 1.7, color: "#6B6377", marginTop: -8 }}>{m.hint}</div>}
          {w.step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 9, maxWidth: 270 }}>
              {["Constitucional", "Civil", "Penal", "Familia", "Laboral"].map((l, i) => (
                <div key={l} ref={i === 0 ? refs.opt : null} style={opt(w.esp === l, w.optHover && i === 0)}>
                  <span style={{ width: 13, height: 13, borderRadius: "50%", flex: "0 0 13px", border: "1.5px solid #622C7B", boxShadow: w.esp === l ? "inset 0 0 0 2.5px #fff, inset 0 0 0 9px #622C7B" : "none" }}></span>{l}
                </div>
              ))}
            </div>
          )}
          {w.step === 2 && field(w.tema, w.caret, false, refs.field2)}
          {w.step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 340 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Favoritos</div>
              {["Idea clave: consentimiento informado", "Estándar aplicable: I.V. vs. Bolivia"].map((l, i) => {
                const on = i === 0 && w.favSel;
                return (
                  <div key={l} ref={i === 0 ? refs.favOpt : null} style={opt(on, i === 0 && w.favHover)}><span style={{ width: 15, height: 15, borderRadius: 4, flex: "0 0 15px", border: "1.5px solid #622C7B", background: on ? "#622C7B" : "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>{on && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg>}</span>{l}</div>
                );
              })}
            </div>
          )}
          {w.step === 4 && field(w.hecho, w.caret, true, refs.field4)}
          {w.step === 5 && field(w.obj, w.caret, true, refs.field5)}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={Object.assign(btn(false), { opacity: w.step > 1 ? 1 : 0 })}>Atrás</div>
          <div style={{ display: "flex", gap: 10 }}>
            <div ref={refs.omit} style={Object.assign(btn(false, true, w.omitHover), { opacity: w.step === 3 || w.step === 4 ? 1 : 0 })}>Omitir</div>
            <div ref={refs.next} style={btn(true, w.nextOn)}>{w.step === 5 ? "Finalizar" : "Siguiente"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnswerDD({ T, show, refs, linkHover, favActive, favHover }) {
  const r = (i) => show ? rise(T, show[i]) : {};
  return (
    <div ref={refs.ans} style={{ display: "flex", flexDirection: "column", gap: 22, fontFamily: SERIF, fontSize: 17, marginTop: -24 }}>
      <div style={{ alignSelf: "flex-start", background: "#035D4A", color: "#fff", borderRadius: 4, padding: "6px 11px", fontSize: 12, letterSpacing: ".02em", display: "flex", alignItems: "center", gap: 7, fontFamily: INTER, ...r(0) }}>{Icon.check}Verificada</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9, ...r(1) }}>
        <div style={{ fontWeight: 700 }}>Idea clave</div>
        <div style={{ lineHeight: 1.58, textWrap: "pretty" }}><span style={hlSpan}>El deber de debida diligencia reforzada obliga al Estado a actuar con especial rigor ante denuncias de violencia contra las mujeres, y su incumplimiento genera responsabilidad internacional.</span></div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9, lineHeight: 1.58, ...r(2) }}>
        <div style={{ fontWeight: 700 }}>Estándar aplicable</div>
        <div style={{ textWrap: "pretty" }}>La Corte IDH estableció que, ante un contexto de violencia contra las mujeres, el deber de debida diligencia adquiere carácter reforzado desde el momento en que las autoridades toman conocimiento del riesgo.</div>
      </div>
      <DocLinks refs={refs} linkHover={linkHover} style={r(3)} items={["N1 — Corte IDH, González y otras vs. México: debida diligencia reforzada", "N2 — Convención de Belém do Pará: debida diligencia"]} />
      {favActive !== undefined && (
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2, marginLeft: -10, fontFamily: INTER }}>
          <div style={pill(false)}>{Icon.copy}Copiar</div>
          <div ref={refs.fav} style={pill(favActive, favHover)}>{star(favActive ? "currentColor" : "none")}{favActive ? "En favoritos" : "Favorito"}</div>
          <div style={pill(false)}>{Icon.warn}</div>
          <span style={{ fontSize: 12, color: "#6B6377", marginLeft: 10 }}>Hace unos segundos</span>
        </div>
      )}
    </div>
  );
}
function DocLinks({ refs, linkHover, style, items }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, lineHeight: 1.58, ...style }}>
      <div style={{ fontWeight: 700 }}>Documentos consultados</div>
      {items.map((t, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span ref={i === 0 && refs ? refs.link : null} style={{ color: i === 0 && linkHover ? "#0B0B0B" : "#622C7B", textDecoration: "underline", textDecorationThickness: 1, textUnderlineOffset: 4 }}>{t}</span>
            {Icon.eye}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "#622C7B", fontFamily: INTER }}>{Icon.tri}<span>Ver cita textual</span></div>
        </div>
      ))}
    </div>
  );
}
const Bubble = ({ text, style }) => <div style={{ alignSelf: "flex-end", marginRight: -22, maxWidth: 420, background: "#DFF0EA", borderRadius: 20, padding: "11px 16px", fontSize: 14, lineHeight: 1.55, color: "#035D4A", ...style }}>{text}</div>;
const QUERY_DD = "Estándares internacionales de DDHH sobre debida diligencia reforzada";
const scrollTo = (b, comp) => b && comp ? Math.max(0, b.y + b.h - (comp.y - 26)) : 0;
const FB = { col: { x: 440, y: 84, w: 560, h: 700 }, comp: { x: 375, y: 642, w: 690, h: 122 }, ta: { x: 396, y: 663, w: 650, h: 21 }, send: { x: 1001, y: 705, w: 44, h: 44 }, tabA: { x: 900, y: 709, w: 95, h: 36 }, panelBtn: { x: 178, y: 18, w: 36, h: 36 } };

// 1 — Consulta → Argumento
const QUERY_CI = "¿Cuáles son los estándares internacionales de derechos humanos en consentimiento informado y autonomía reproductiva?";
const TEMA = "Autonomía reproductiva y consentimiento informado";
const OBJ = "Fundamentar la vulneración del consentimiento informado";
const HECHO = "La paciente fue esterilizada durante una cesárea sin que se le informara ni se le pidiera su consentimiento. Se enteró días después, al recibir el alta médica.";
function PieceArgumento({ flat }) {
  const { T: Tr, CUES: C0 } = useComposition();
  const K = (C0.Respuesta - C0.Consulta) / 2.7 || 1, T = Tr / K, C = {};
  Object.keys(C0).forEach(k => { C[k] = typeof C0[k] === "number" ? C0[k] / K : C0[k]; });
  const W0 = C.Asistente, tN1_ = W0 + 1.45, tN2_ = W0 + 3.75, tN3_ = W0 + 5.15, tN4_ = W0 + 8.05;
  const stepKey = T < tN1_ ? 1 : T < tN2_ ? 2 : T < tN3_ ? 3 : T < tN4_ ? 4 : 5;
  const [R, P0] = useMeasure(["col", "comp", "ta", "send", "tabA", "ans", "ans2", "wiz", "opt", "field", "omit", "next", "favOpt", "field2", "field4", "field5"],
    Object.assign({}, FB, { ans: { x: 440, y: 260, w: 560, h: 520 }, ans2: { x: 440, y: 820, w: 560, h: 380 }, wiz: { x: 375, y: 237, w: 690, h: 530 }, opt: { x: 409, y: 400, w: 270, h: 40 }, field2: { x: 409, y: 384, w: 570, h: 50 }, field4: { x: 409, y: 450, w: 454, h: 195 }, field5: { x: 409, y: 400, w: 454, h: 195 }, omit: { x: 870, y: 720, w: 80, h: 34 }, next: { x: 960, y: 720, w: 72, h: 34 }, favOpt: { x: 409, y: 464, w: 340, h: 40 } }), stepKey);
  const P = P0;
  if (!R.caret) R.caret = React.createRef();
  const [caretX, setCaretX] = React.useState(null);
  React.useLayoutEffect(() => {
    const el = R.caret.current, root = R.root.current;
    if (!el || !root) return;
    const x = offsetIn(el, root).x;
    if (caretX == null || Math.abs(x - caretX) > 0.5) setCaretX(x);
  });
  const Q = C.Consulta, Rs = C.Respuesta, A = C.Argumento, W = C.Asistente, Pa = C.Parrafo;
  const tFocus = Q + 0.3, tA = Q + 0.45, tB = Q + 1.55, tSend = Q + 2.45, tTab = A + 0.75;
  const tOpt = W + 0.75, tN1 = tN1_, tC2 = W + 2.15, tN2 = tN2_, tF = W + 4.45, tN3 = tN3_, tC4 = W + 5.85, tN4 = tN4_, tC5 = W + 8.75, tFin = W + 10.0;
  const sent = T >= tSend;
  const draft = sent ? "" : typed(QUERY_CI, T, tA, tB);
  const focused = T >= tFocus && !sent && T < tTab;
  const caret = focused && (T < tB || Math.floor(T * 2.2) % 2 === 0);
  const step = T < tN1 + 0.05 ? 1 : T < tN2 + 0.05 ? 2 : T < tN3 + 0.05 ? 3 : T < tN4 + 0.05 ? 4 : 5;
  const stepStart = [0, W, tN1, tN2, tN3, tN4][step];
  const tema = typed(TEMA, T, W + 2.25, W + 3.1), hecho = typed(HECHO, T, W + 5.95, W + 7.4), obj = typed(OBJ, T, W + 8.85, W + 9.35);
  const wizP = Math.min(fade(T, tTab + 0.1, 0.3), 1 - fade(T, tFin + 0.05, 0.25));
  const wiz = { p: wizP, step, stepP: step === 1 ? 1 : fade(T, stepStart + 0.05, 0.25), esp: T >= tOpt ? "Constitucional" : null, optHover: T > tOpt - 0.2 && T < tOpt, tema, hecho, obj, favSel: T >= tF, favHover: T > tF - 0.18 && T < tF + 0.3,
    caret: ((step === 2 && T >= tC2) || (step === 4 && T >= tC4) || (step === 5 && T >= tC5)) && Math.floor(T * 2.2) % 2 === 0, omitHover: false, nextOn: step === 1 ? T >= tOpt : step === 2 ? tema.length > 0 : step === 3 ? T >= tF : step === 4 ? hecho.length > 0 : obj.length > 0 };
  const s1 = scrollTo(P.ans, P.comp), s2 = scrollTo(P.ans2, P.comp);
  const scroll = kf([[Rs + 1.1, 0], [Rs + 2.1, s1], [Pa + 0.5, s1], [Pa + 1.5, s2]], T);
  const ta = [P.ta.x + 80, P.ta.y + 12], sb = ctr(P.send), tb = ctr(P.tabA), op = ctr(P.opt, 0.3), nx = ctr(P.next), fo = ctr(P.favOpt, 0.07), f2 = ctr(P.field2, 0.78, 0.5), f4 = ctr(P.field4, 0.8, 0.75), f5 = ctr(P.field5, 0.8, 0.75);
  const H = 0.15, D = 0.15;
  const cur = humanPath([
    [0, [ta[0] + 160, ta[1] + 70]], [tFocus - 0.05, ta], [tB, ta], [tSend - 0.15, sb], [tSend + H, sb], [Rs + 1.2, [sb[0] - 90, sb[1] - 240]], [A + 0.15, [sb[0] - 90, sb[1] - 240]],
    [tTab - 0.2, tb], [W + 0.2, tb], [tOpt - D, op], [tOpt + H, op], [tN1 - D, nx], [tN1 + H, nx], [tC2 - D, f2], [W + 3.2, f2], [tN2 - D, nx], [tN2 + H, nx],
    [tF - D, fo], [tF + H, fo], [tN3 - D, nx], [tN3 + H, nx], [tC4 - D, f4], [W + 7.5, f4], [tN4 - D, nx], [tN4 + H, nx], [tC5 - D, f5], [W + 9.45, f5], [tFin - D, nx], [tFin + H, nx], [Pa + 0.8, [nx[0] + 40, nx[1] - 120]],
  ], T);
  const press = pressAt(T, [tFocus, tSend, tTab, tOpt, tN1, tC2, tN2, tF, tN3, tC4, tN4, tC5, tFin]);
  const a2c = P.ans2.y + P.ans2.h / 2 - s2, wc = ctr(P.wiz);
  const fitZ = (w, z) => Math.min(z, SW / (BASE * (w + 50)));
  const wy = (y, z) => Math.max(y, 68 + SH / (BASE * z) / 2); // deja la barra superior fuera de cuadro
  const cc = ctr(P.comp), zq = fitZ(P.comp.w, 1.62), colX = P.col.x + P.col.w / 2, zc = fitZ(Math.max(P.col.w, P.ans.w), 1.2);
  // seguimiento del texto mientras se escribe
  const ZT = 1.62, zf = SW / (BASE * (P.comp.w + 40)), half = SW / (BASE * ZT) / 2;
  const fLo = P.ta.x + half - 30, fHi = P.ta.x + P.ta.w - half + 30, fx = x => clamp(x, fLo, fHi);
  const fx0 = fLo, fx1 = fx(caretX != null ? caretX - half * 0.4 : fLo);
  const followX = () => fx(caretX != null ? caretX - half * 0.4 : fLo); // centro siguiendo el cursor real
  const cam0 = kf([
    [0, [fx0, cc[1], ZT]], [tA, [fx0, cc[1], ZT]], [tB + 0.15, [fx1, cc[1], ZT]], [tB + 0.8, [cc[0], cc[1], zf]], [tSend, [cc[0], cc[1], zf]],
    [Rs + 0.5, [colX, 405, zc]], [A + 0.2, [colX, 405, zc]], [tTab - 0.1, [tb[0] - 120, tb[1] - 60, 1.56]], [W + 0.2, [wc[0], wy(wc[1], 1.2), 1.2]], [W + 0.8, [wc[0], wy(wc[1] + 10, 1.27), 1.27]], [tFin, [wc[0], wy(wc[1] + 10, 1.27), 1.27]],
    [Pa + 0.4, [colX, 405, zc]], [Pa + 1.6, [colX, a2c, fitZ(Math.max(P.col.w, P.ans2.w), 1.34)]],
  ], T);
  const cam = T >= tA && T <= tB + 0.15 ? [followX(), cc[1], ZT] : cam0;
  const camU = flat ? [720, cam[1], 1.0] : cam;
  const camS = BASE * camU[2], camLo = SW - AW * camS;
  const camLeft = -(camLo > 0 ? camLo / 2 : clamp(SW / 2 - camU[0] * camS, camLo, 0)) / camS;
  const titleIn = clamp((60 - camLeft) / 16, 0, 1); // el título solo se ve si entra completo
  const think1 = between(T, Rs + 0.15, Rs + 0.85, 0.2), think2 = between(T, Pa + 0.0, Pa + 0.7, 0.2);
  return (
    <Camera cam={camU} op={Math.min(fade(Tr, 0, 0.6), 1 - fade(Tr, ((JSON.parse(window.OM_SCENES || "[]")).reduce((a, x) => a + x.dur, 0) || 40) - 0.7, 0.6))}>
      <App refs={R} title="Consentimiento informado y autonomía reproductiva" titleOp={fade(T, Rs + 0.4) * titleIn} scroll={scroll} draft={draft} focused={focused} caret={caret}
        mode={T >= tTab ? "Argumento" : "Búsqueda"} tabAHover={T > tTab - 0.3} wizard={wiz}
        overlay={<React.Fragment><Ripples T={T} dur={0.2} list={[[...ta, tFocus], [...sb, tSend], [...tb, tTab], [...op, tOpt], [...nx, tN1], [...f2, tC2], [...nx, tN2], [...fo, tF], [...nx, tN3], [...f4, tC4], [...nx, tN4], [...f5, tC5], [...nx, tFin]]} /><Cursor x={cur[0]} y={cur[1]} press={press} /></React.Fragment>}>
        <Bubble text={QUERY_CI} style={rise(T, tSend + 0.02, 0.35)} />
        <Thinking T={T} on={think1} label="Buscando en jurisprudencia y tratados…" />
        <div ref={R.ans} style={{ display: "flex", flexDirection: "column", gap: 22, fontFamily: SERIF, fontSize: 17, marginTop: -24 }}>
          <div style={{ alignSelf: "flex-start", background: "#035D4A", color: "#fff", borderRadius: 4, padding: "6px 11px", fontSize: 12, letterSpacing: ".02em", display: "flex", alignItems: "center", gap: 7, fontFamily: INTER, ...rise(T, Rs + 0.85) }}>{Icon.check}Verificada</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9, ...rise(T, Rs + 1.05) }}>
            <div style={{ fontWeight: 700 }}>Idea clave</div>
            <div style={{ lineHeight: 1.58, textWrap: "pretty" }}><span style={hlSpan}>El consentimiento informado es un requisito previo a toda intervención en salud reproductiva: debe ser previo, libre, pleno e informado, y su ausencia vulnera la autonomía de la mujer.</span></div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9, lineHeight: 1.58, ...rise(T, Rs + 1.3) }}>
            <div style={{ fontWeight: 700 }}>Estándar aplicable</div>
            <div style={{ textWrap: "pretty" }}>La Corte IDH estableció que la esterilización sin consentimiento informado viola los derechos a la integridad personal, a la vida privada y a fundar una familia, y reconoce la autonomía reproductiva como parte del derecho a la vida privada.</div>
          </div>
          <DocLinks style={rise(T, Rs + 1.55)} items={["N1 — Corte IDH, I.V. vs. Bolivia: consentimiento informado", "N2 — CEDAW, Recomendación General 24: salud de la mujer"]} />
        </div>
        <Thinking T={T} on={think2} label="Redactando el párrafo argumentativo…" />
        <div ref={R.ans2} style={{ display: "flex", flexDirection: "column", gap: 18, fontFamily: SERIF, fontSize: 17, marginTop: -24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 9, lineHeight: 1.58, ...rise(T, Pa + 0.7, 0.45) }}>
            <div style={{ fontWeight: 700 }}>Párrafo argumentativo</div>
            <div style={{ textWrap: "pretty" }}>Conforme a la jurisprudencia de la Corte IDH, el consentimiento informado constituye un requisito previo e indispensable de toda intervención médica que afecte la salud reproductiva. En el caso I.V. vs. Bolivia (2016), la Corte sostuvo que debe ser previo, libre, pleno e informado, y que su ausencia vulnera los derechos a la integridad personal, a la vida privada y a fundar una familia. En consecuencia, corresponde al Estado garantizar que las decisiones sobre la propia capacidad reproductiva sean adoptadas por la persona titular, sin coerción ni sustitución de su voluntad.</div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: "#6B6377", fontFamily: INTER, lineHeight: 1.6, ...rise(T, Pa + 1.0) }}>
            <span style={{ display: "flex", flex: "0 0 13px", marginTop: 2, color: "#B08900" }}>{Icon.warn}</span>
            <span>Este párrafo es un borrador. Requiere revisión y edición antes de incorporarlo a una resolución.</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: -10, fontFamily: INTER, ...rise(T, Pa + 1.2) }}>
            <div style={pill(false)}>{Icon.copy}Copiar</div>
            <div style={pill(false)}>{star("none")}Favorito</div>
            <div style={pill(false)}>{Icon.dl14}Descargar</div>
            <span style={{ fontSize: 12, color: "#6B6377", marginLeft: 10 }}>Hace unos segundos</span>
          </div>
        </div>
      </App>
    </Camera>
  );
}

// 2 — Documento: link → panel → cambio de página
function PieceDocumento() {
  const { T: Tr, CUES: C0 } = useComposition();
  const K = (C0.Visor - C0.Documento) / 1.4 || 1, T = Tr / K, C = {};
  Object.keys(C0).forEach(k => { C[k] = typeof C0[k] === "number" ? C0[k] / K : C0[k]; });
  const total = (JSON.parse(window.OM_SCENES || "[]")).reduce((a, x) => a + x.dur, 0) || 15;
  const op = Math.min(fade(Tr, 0, 0.6), 1 - fade(Tr, total - 0.7, 0.6));
  const [R, P] = useMeasure(["col", "comp", "ans", "link", "par", "next"],
    Object.assign({}, FB, { ans: { x: 440, y: 180, w: 560, h: 560 }, link: { x: 440, y: 600, w: 520, h: 27 }, par: { x: 1048, y: 330, w: 356, h: 115 }, next: { x: 1382, y: 755, w: 30, h: 30 } }));
  const D = C.Documento, V = C.Visor, Pg = C.Pagina;
  const tLink = D + 1.05, tNext = Pg + 0.85;
  const scroll = scrollTo(P.ans, P.comp);
  const docsP = EZ.enter(clamp((T - (tLink + 0.08)) / 0.6, 0, 1));
  const page = T >= tNext + 0.05 ? 1 : 0, pageP = fade(T, tNext + 0.05, 0.4);
  const hl = page === 0 ? fade(T, V + 0.75, 0.5) : 0;
  const lk = [P.link.x + 170, P.link.y + 15 - scroll];
  const lkAfter = [lk[0] - 207, lk[1]];
  const pr = ctr(P.par, 0.55, 0.6), nx = ctr(P.next);
  const cur = humanPath([
    [0, [lk[0] + 140, lk[1] - 120]], [0.25, [lk[0] + 140, lk[1] - 120]], [tLink - 0.15, lk], [tLink + 0.65, lkAfter], [V + 0.7, lkAfter], [V + 1.5, pr], [Pg + 0.1, pr], [tNext - 0.12, nx], [Pg + 2.2, [nx[0] - 120, nx[1] - 200]],
  ], T);
  const cam = kf([
    [0, [620, 405, 1.2]], [0.3, [620, 405, 1.2]], [tLink - 0.1, [lk[0], lk[1] - 40, 1.62]], [tLink + 0.15, [lk[0], lk[1] - 40, 1.62]],
    [V + 0.6, [AW - 360, 405, 1.2]], [V + 1.6, [pr[0] - 20, pr[1], 1.56]], [Pg + 0.2, [pr[0] - 20, pr[1], 1.56]], [tNext - 0.1, [AW - 300, 560, 1.38]], [Pg + 1.6, [AW - 230, 420, 1.56]],
  ], T);
  return (
    <Camera cam={cam} op={op}>
      <App refs={R} title="Debida diligencia reforzada" scroll={scroll} docsPanel docsP={docsP} page={page} pageP={pageP} hl={hl} nextHover={T > tNext - 0.25 && T < tNext + 0.4}
        overlay={<React.Fragment><Ripples T={T} list={[[...lk, tLink], [...nx, tNext]]} /><Cursor x={cur[0]} y={cur[1]} press={pressAt(T, [tLink, tNext])} /></React.Fragment>}>
        <Bubble text={QUERY_DD} />
        <div style={{ height: 0 }}></div>
        <AnswerDD T={T} refs={R} linkHover={T > tLink - 0.3 && T < tLink + 0.5} />
      </App>
    </Camera>
  );
}

// 3 — Favoritos: guardar y verlo en el lateral
const QUERY_BP = "¿Qué dice la Convención de Belém do Pará sobre el acceso a la justicia?";
function PieceFavoritos() {
  const { T, CUES: C } = useComposition();
  const [R, P] = useMeasure(["col", "comp", "ans", "fav", "panelBtn", "favRow", "favRow2", "favRow3", "favA", "favB"],
    Object.assign({}, FB, { ans: { x: 440, y: 560, w: 560, h: 610 }, fav: { x: 525, y: 1140, w: 100, h: 30 }, favRow: { x: 36, y: 380, w: 190, h: 29 }, favRow2: { x: 36, y: 382, w: 190, h: 29 }, favRow3: { x: 36, y: 412, w: 190, h: 29 }, favA: { x: 440, y: 180, w: 560, h: 90 }, favB: { x: 440, y: 300, w: 560, h: 120 } }));
  const G = C.Guardar, L = C.Lateral, N = C.Navegar;
  const tFav = G + 1.2, tPanel = L + 0.9, tS2 = N + 0.9, tS3 = N + 4.4;
  const sBase = scrollTo(P.ans, P.comp), sB = Math.max(0, P.favB.y - 150), sA = Math.max(0, P.favA.y - 150);
  const scroll = kf([[tS2 + 0.1, sBase], [tS2 + 1.1, sB], [tS3 + 0.1, sB], [tS3 + 1.2, sA]], T);
  const saved = T >= tFav;
  const sideP = EZ.enter(clamp((T - (tPanel + 0.05)) / 0.5, 0, 1));
  const tipP = Math.min(fade(T, tFav + 0.25, 0.3), 1 - fade(T, tPanel, 0.2));
  const favRowP = fade(T, tPanel + 0.6, 0.45);
  const fv = [P.fav.x + P.fav.w / 2, P.fav.y + P.fav.h / 2 - sBase];
  const pb = ctr(P.panelBtn);
  const dy = 0;
  const fr = [P.favRow.x + 70, P.favRow.y + P.favRow.h / 2];
  const r2 = [P.favRow2.x + 80, P.favRow2.y + dy + P.favRow2.h / 2], r3 = [P.favRow3.x + 70, P.favRow3.y + dy + P.favRow3.h / 2];
  const H = 0.2, D = 0.18;
  const cur = humanPath([
    [0, [fv[0] + 150, fv[1] - 110]], [0.3, [fv[0] + 150, fv[1] - 110]], [tFav - D, fv], [tFav + H, fv], [G + 2.1, [fv[0] - 60, fv[1] - 160]], [tPanel - D, pb], [tPanel + H, pb],
    [L + 2.6, fr], [N + 0.3, fr], [tS2 - D, r2], [tS2 + H, r2], [N + 2.0, [640, 430]], [N + 3.3, [640, 430]], [tS3 - D, r3], [tS3 + H, r3], [N + 6.0, [660, 450]],
  ], T);
  const cam = kf([
    [0, [720, 405, 1.2]], [tFav - 0.7, [720, 405, 1.2]], [tFav - 0.1, [fv[0], fv[1] - 115, 1.38]], [tFav + 0.5, [fv[0], fv[1] - 115, 1.38]], [tFav + 1.2, [360, 405, 1.2]],
    [tS2 + 0.3, [360, 405, 1.2]], [tS2 + 1.2, [851, 405, 1.2]], [N + 3.0, [851, 405, 1.2]], [N + 3.8, [360, 405, 1.2]], [tS3 + 0.3, [360, 405, 1.2]], [tS3 + 1.2, [851, 405, 1.2]],
  ], T);
  const total = (JSON.parse(window.OM_SCENES || "[]")).reduce((a, x) => a + x.dur, 0) || N + 9;
  const op = Math.min(fade(T, 0, 0.6), 1 - fade(T, total - 0.7, 0.6));
  const favSel = T >= tS3 ? 2 : T >= tS2 ? 1 : -1;
  const favHover = T > L + 2.4 && T < N + 0.4 ? 0 : T > tS2 - 0.25 && T < tS2 ? 1 : T > tS3 - 0.25 && T < tS3 ? 2 : -1;
  const hlA = fade(T, tS3 + 0.9, 0.35), hlB = Math.min(fade(T, tS2 + 0.8, 0.35), 1 - fade(T, tS3, 0.3));
  const blk = (h) => ({ display: "flex", flexDirection: "column", gap: 9, lineHeight: 1.58, borderRadius: 6, padding: "10px 12px", margin: "-10px -12px", background: `rgba(223,240,234,${h})` });
  return (
    <Camera cam={cam} op={op}>
      <App refs={R} title="Debida diligencia reforzada" scroll={scroll} sidebar sideP={sideP} favRowP={favRowP} favFlash={between(T, tPanel + 0.55, tPanel + 2.0, 0.35)} favRowHover={favHover} favSel={favSel} tipP={tipP} panelHover={T > tPanel - 0.3 && T < tPanel + 0.4}
        overlay={<React.Fragment><Ripples T={T} dur={0.25} list={[[...fv, tFav], [...pb, tPanel], [...r2, tS2], [...r3, tS3]]} /><Cursor x={cur[0]} y={cur[1]} press={pressAt(T, [tFav, tPanel, tS2, tS3])} /></React.Fragment>}>
        <Bubble text={QUERY_BP} />
        <div style={{ display: "flex", flexDirection: "column", gap: 22, fontFamily: SERIF, fontSize: 17 }}>
          <div ref={R.favA} style={blk(hlA)}>
            <div style={{ fontWeight: 700 }}>Idea clave</div>
            <div style={{ textWrap: "pretty" }}>Los Estados deben garantizar a las mujeres víctimas de violencia un acceso efectivo a recursos judiciales sencillos, rápidos e imparciales.</div>
          </div>
          <div ref={R.favB} style={blk(hlB)}>
            <div style={{ fontWeight: 700 }}>Estándar aplicable</div>
            <div style={{ textWrap: "pretty" }}>El artículo 7 de la Convención de Belém do Pará obliga a los Estados a establecer procedimientos legales justos y eficaces para la mujer, que incluyan medidas de protección, un juicio oportuno y el acceso efectivo a tales procedimientos.</div>
          </div>
        </div>
        <Bubble text={QUERY_DD} />
        <div style={{ height: 0 }}></div>
        <AnswerDD T={T} refs={R} favActive={saved} favHover={T > tFav - 0.3 && T < tFav} />
      </App>
    </Camera>
  );
}

const mk = (Piece, extra) => function () {
  return <CompositionStage width={SW} height={SH} bg="#F7F6F8" scenes={window.OM_SCENES} playback={window.OM_PLAYBACK}><Piece {...extra} /></CompositionStage>;
};
window.JusfemArgumento = mk(PieceArgumento);
window.JusfemArgumentoFlat = mk(PieceArgumento, { flat: true });
window.JusfemDocumento = mk(PieceDocumento);
window.JusfemFavoritos = mk(PieceFavoritos);

// --- añadido para uso fuera del editor -------------------------------
// mk() lee window.OM_SCENES al renderizar, así que con varias animaciones
// montadas todas terminan leyendo el último valor. Este helper recibe las
// escenas como prop y evita depender del global.
window.JusfemAnim = function (props) {
  var piezas = { argumento: PieceArgumento, documento: PieceDocumento, favoritos: PieceFavoritos };
  var P = piezas[props.pieza];
  if (!P) return null;
  return <CompositionStage width={SW} height={SH} bg="#F7F6F8"
            scenes={props.scenes} playback='{"mode":"loop"}'><P /></CompositionStage>;
};
window.JusfemEscenas = {
  argumento: '[{"name":"Consulta","dur":5.4},{"name":"Respuesta","dur":5.2},{"name":"Argumento","dur":2.2},{"name":"Asistente","dur":21.4},{"name":"Parrafo","dur":5.8}]',
  documento: '[{"name":"Documento","dur":2.8},{"name":"Visor","dur":4.6},{"name":"Pagina","dur":7.6}]',
  favoritos: '[{"name":"Guardar","dur":2.6},{"name":"Lateral","dur":3.4},{"name":"Navegar","dur":9}]'
};
