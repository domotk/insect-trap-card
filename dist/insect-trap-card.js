/**
 * Insect Trap Card — v0.26.0
 *
 * Companion card for the `insect_trap` integration.
 *
 *   type: custom:insect-trap-card
 *   entity: sensor.my_trap_life_left
 *   show_name: false     # hide the name: a room page usually says it already
 *   name: "Salón"        # show this instead of the entity's own name
 *   buy_url: https://…   # optional shopping link, a button on the brand band
 *   time_unit: hours     # auto | nights | hours — how the time left reads
 *
 * Tapping the diffuser turns the trap on or off. The white band below it
 * opens the history.
 *
 * The refill form asks about the REFILL and nothing else: which one, what it is
 * for, and how long it lasts. Brand, model and mode belong to the appliance and
 * are changed in the integration's options — asking for them here is what made
 * the three forms disagree.
 *
 * A trap with no refill registered says so plainly rather than drawing a full
 * bottle: a comfortable lie there is one you cannot see through until the
 * mosquitoes tell you.
 *
 * The old tag `custom:consumable-card` still works, so existing dashboards do
 * not break on upgrade.
 *
 * No dependencies, no build step: served as a plain ES module.
 */

const VERSION = "0.26.0";
const DOMAIN = "insect_trap";
// Served by the integration itself, not from www/. HACS installs this file and
// nothing else, so the catalogue and the artwork have to come from somewhere
// every user already has — and this way there is one catalogue, the same one
// the integration reads.
const STATIC = "/insect_trap/static";
const CATALOG_URL = `${STATIC}/catalog.json?v=${VERSION}`;

const COLOR = {
  ok: "#4caf50",
  warn: "#ffc65c",
  empty: "#ff5252",
  none: "#8e9aaf",
};

const STRINGS = {
  en: {
    name: "Insect trap",
    description: "Refill life left, counted in the hours the trap really runs",
    entity: "Life left sensor",
    buy_url: "Shopping link",
    show_name: "Show the name",
    name_label: "Name on the card",
    ends_on: "Runs out {d}",
    time_unit: "Time left shown in",
    tu_auto: "Automatic",
    tu_nights: "Nights",
    tu_hours: "Hours",
    no_entity: "Pick the 'Life left' sensor of an insect trap",
    nights_left: "{n} nights left",
    hours_left: "{h} h left",
    replace: "New refill",
    fit_one: "Register a refill",
    buy: "Buy",
    no_refill: "No refill fitted",
    depleted: "Refill exhausted",
    due: "Replace it soon",
    turn_on: "Turn on {name}",
    turn_off: "Turn off {name}",
    history: "History of {name}",
    sheet_title: "New refill",
    f_refill: "Refill",
    f_target: "What it is for",
    f_duration: "Duration on the box",
    f_unit: "Unit",
    select_one: "Select an option",
    lifetime_h: "Lifetime: {h} h",
    lifetime_n: "Lifetime: {n} × {p} h = {h} h",
    lifetime_mode: "{h} h in {mode} mode",
    cancel: "Cancel",
    confirm: "Confirm",
    mosquitos: "Mosquitoes",
    mosquitos_moscas: "Mosquitoes and flies",
    varios: "Several insects",
    normal: "Normal",
    max: "Max",
    nights: "Nights",
    hours_unit: "Running hours",
    unverified: "Unconfirmed figure — check your box.",
    no_catalog: "Catalogue unavailable: type the details by hand.",
  },
  es: {
    name: "Trampa de insectos",
    description: "Vida restante de la recarga, contada en horas reales de uso",
    entity: "Sensor de vida restante",
    buy_url: "Enlace de compra",
    show_name: "Mostrar el nombre",
    name_label: "Nombre en la tarjeta",
    ends_on: "Se agota el {d}",
    time_unit: "Mostrar el tiempo restante en",
    tu_auto: "Automático",
    tu_nights: "Noches",
    tu_hours: "Horas",
    no_entity: "Elige el sensor de «Vida restante» de una trampa",
    nights_left: "Quedan {n} noches",
    hours_left: "Quedan {h} h",
    replace: "Recarga nueva",
    fit_one: "Registrar recarga",
    buy: "Comprar",
    no_refill: "Sin recarga puesta",
    depleted: "Recarga agotada",
    due: "Cámbiala pronto",
    turn_on: "Encender {name}",
    turn_off: "Apagar {name}",
    history: "Historial de {name}",
    sheet_title: "Recarga nueva",
    f_refill: "Recarga",
    f_target: "Para qué es",
    f_duration: "Duración de la caja",
    f_unit: "Unidad",
    select_one: "Selecciona una opción",
    lifetime_h: "Vida útil: {h} h",
    lifetime_n: "Vida útil: {n} × {p} h = {h} h",
    lifetime_mode: "{h} h en modo {mode}",
    cancel: "Cancelar",
    confirm: "Confirmar",
    mosquitos: "Mosquitos",
    mosquitos_moscas: "Mosquitos y moscas",
    varios: "Varios insectos",
    normal: "Normal",
    max: "Max",
    nights: "Noches",
    hours_unit: "Horas de funcionamiento",
    unverified: "Dato sin confirmar: comprueba tu caja.",
    no_catalog: "Catálogo no disponible: escribe los datos a mano.",
  },
};

const TARGETS = ["mosquitos", "mosquitos_moscas", "varios"];
const UNIT_NIGHTS = "nights";
const UNIT_HOURS = "hours";

function localize(hass, key, vars) {
  const lang = String(
    (hass && hass.locale && hass.locale.language) || (hass && hass.language) || "en"
  ).split("-")[0];
  const table = STRINGS[lang] || STRINGS.en;
  // An unknown key gives back the key itself rather than undefined: the old
  // code threw a TypeError on `text.replace` the moment such a key was asked
  // for with variables — precisely when the mistake is hardest to spot.
  let text = table[key] !== undefined ? table[key] : STRINGS.en[key];
  if (text === undefined) return key;
  if (vars) for (const [k, v] of Object.entries(vars)) text = text.replace(`{${k}}`, v);
  return text;
}

/** Fetched once per page load; a failure resolves to null, never rejects. */
let catalogPromise = null;
// Nothing paints until this turns true, success or failure alike.
let catalogSettled = false;
function loadCatalog() {
  if (!catalogPromise) {
    catalogPromise = fetch(CATALOG_URL)
      .then((r) => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .catch((err) => {
        console.warn("insect-trap-card: could not read the catalogue:", err.message);
        return null;
      })
      .then((cat) => {
        catalogSettled = true;
        return cat;
      });
  }
  return catalogPromise;
}

/** The two colours this brand's packaging uses, if the catalogue knows them. */
function brandColors(catalog, brand) {
  if (!catalog || !brand) return null;
  const b = (catalog.brands || []).find((x) => x.brand === brand);
  const c = b && b.colors;
  return Array.isArray(c) && c.length >= 2 ? c : null;
}

/**
 * Readable ink for text sitting on a solid colour.
 *
 * The lower band is a brand colour, and brands are not all white down there —
 * Raid's second colour is yellow. Picking the ink from the band's luminance
 * keeps the title legible without hard-coding one brand's palette.
 */
function inkFor(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || "").trim());
  if (!m) return null;
  const v = parseInt(m[1], 16);
  const [r, g, b] = [(v >> 16) & 255, (v >> 8) & 255, v & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? "#16203a" : "#ffffff";
}

/**
 * The artwork the catalogue has for this appliance, if any.
 *
 * A model with no `art` of its own borrows the catalogue's stand-in drawing,
 * so adding a brand never means having to draw it first. It is the wrong
 * diffuser, but it still reads as a diffuser — which is more than the
 * hand-drawn vector managed, and that is why this falls back to a drawing of
 * another appliance rather than to the outline.
 *
 * One file per appliance: a horizontal strip of frames of the same drawing with
 * the bottle at different levels. `levels` says what level each frame depicts,
 * so the card shows the nearest one and the strip may hold any number of them.
 *
 * This replaced a tinted silhouette clipped to the exact level. The silhouette
 * moved continuously, which the strip cannot, but it also meant every appliance
 * needed a second hand-cut mask file that had to line up with the first.
 *
 * The indicator light is drawn grey on purpose: the card lays its own dot over
 * it, so the one part that has to change colour is the one part not baked in.
 */
function artFor(catalog, brand, model) {
  if (!catalog) return null;
  const b = (catalog.brands || []).find((x) => x.brand === brand);
  const m = b && (b.models || []).find((x) => x.model === model);
  const art = (m && m.art) || (catalog.defaults && catalog.defaults.art) || null;
  const levels = art && Array.isArray(art.levels) ? art.levels.map(Number) : null;
  if (!art || !art.sprite || !levels || !levels.length) return null;
  const [w, h] = Array.isArray(art.aspect) ? art.aspect : [2, 3];
  return {
    sprite: `${STATIC}/art/${art.sprite}`,
    levels,
    aspect: `${w} / ${h}`,
    led: art.led || null,
  };
}

/**
 * Which frame of the strip to show, and how far to slide it.
 *
 * Nearest level wins rather than "the last one not exceeded": with frames at
 * 0 / 20 / 71 / 100 a bottle at 90 % looks far more like the full one than like
 * the two-thirds one, and rounding down would show it two-thirds empty.
 */
function frameShift(levels, percent) {
  const level = Math.max(0, Math.min(100, Number(percent) || 0));
  let best = 0;
  for (let i = 1; i < levels.length; i++) {
    if (Math.abs(levels[i] - level) < Math.abs(levels[best] - level)) best = i;
  }
  // The strip is laid out at `n * 100%` wide, where 0 % pins its left edge and
  // 100 % its right: frame i therefore sits at i / (n - 1).
  return levels.length > 1 ? (best * 100) / (levels.length - 1) : 0;
}

/** The refills the catalogue lists for this appliance. */
function refillsFor(catalog, brand, model) {
  if (!catalog) return [];
  const b = (catalog.brands || []).find((x) => x.brand === brand);
  if (!b) return [];
  const m = (b.models || []).find((x) => x.model === model);
  return (m && m.refills) || [];
}

/** Hours at the appliance's normal setting. Mirrors lifetime_hours() in const.py. */
function ratedHours(duration, unit, perNight) {
  const value = Number(duration) || 0;
  if (unit === UNIT_HOURS) return Math.round(value * 100) / 100;
  return Math.round(value * (Number(perNight) || 8) * 100) / 100;
}

function esc(value) {
  return String(value == null ? "" : value).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

// A real CustomEvent rather than an Event with `detail` bolted on: the shortcut
// worked only because Home Assistant reads `.detail` without checking the type.
function fire(node, type, detail) {
  node.dispatchEvent(
    new CustomEvent(type, { detail: detail || {}, bubbles: true, composed: true })
  );
}

function asButton(el, label, action) {
  el.setAttribute("role", "button");
  el.setAttribute("tabindex", "0");
  if (label) el.setAttribute("aria-label", label);
  el.addEventListener("click", (ev) => {
    ev.stopPropagation();
    action();
  });
  el.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      action();
    }
  });
}

// The hand-drawn vector appliance lived here, as the fallback for any model
// with no artwork of its own. It is gone for two reasons. It was the uglier
// drawing of the two, and because the catalogue arrives over the network the
// card painted the vector first and swapped it for the real drawing a moment
// later — a visible flash on every reload. Every catalogue model now carries
// its own strip, and `defaults.art` covers appliances typed in by hand.

class InsectTrapCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement("insect-trap-card-editor");
  }
  static getStubConfig(hass) {
    const first = trapSensors(hass)[0];
    return { type: "custom:insect-trap-card", entity: first ? first.value : "" };
  }

  setConfig(config) {
    if (!config || !config.entity) throw new Error(localize(this._hass, "no_entity"));
    this._config = { show_name: true, ...config };
    this._built = false;
    this._sheetOpen = false;
    if (this.shadowRoot) this.shadowRoot.innerHTML = "";
    // Warm the catalogue now: it makes the refill sheet open instantly, and the
    // card cannot paint the brand's colours until it has arrived.
    loadCatalog().then((cat) => {
      if (cat) this._catalog = cat;
      // Repaint even when it failed: the first paint is held back until the
      // catalogue settles, so skipping this would leave the card blank forever.
      this._paint();
    });
    this._paint();
  }

  getCardSize() {
    // One card left, one height: a 76 px band over a 56 px one.
    return 3;
  }

  // A card can be torn off the page with its refill sheet still open — editing
  // the dashboard, switching view — and the sheet's key listener lives on
  // `document`, so nothing else would ever take it down.
  disconnectedCallback() {
    if (this._onKey) {
      document.removeEventListener("keydown", this._onKey);
      this._onKey = null;
    }
    this._sheetOpen = false;
  }

  set hass(hass) {
    const before = this._hass;
    this._hass = hass;
    if (!before || this._changed(before, hass)) this._paint();
  }

  _changed(before, after) {
    if (!this._built) return true;
    for (const id of this._watched()) {
      if (before.states[id] !== after.states[id]) return true;
    }
    return before.locale !== after.locale;
  }

  _watched() {
    const main = this._config.entity;
    const st = this._hass && this._hass.states[main];
    const source = st && st.attributes ? st.attributes.source_entity : null;
    return [main, source].filter(Boolean);
  }

  // ---------- build ----------

  _build() {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `
      ha-card { padding: 0; overflow: hidden; transition: background 300ms ease; }
      /* Two solid brand bands. They are now real blocks stacked on top of each
         other, not one gradient with a stop at 52 %: the name is allowed two
         lines, and a fixed stop would have let it grow straight out of its own
         colour. Each band sizes itself to what it holds.
         The appliance is the only thing still placed by hand, because it is the
         only thing meant to straddle the join between the two. */
      .hero { position: relative; }
      .hero .band { box-sizing: border-box; padding: 12px 14px 12px 112px; }
      /* Centred, not top-aligned: a one-line name used to cling to the top edge
         of the band. Centring drops it into the middle of the colour and still
         looks right when the name takes both its lines. */
      .hero .band.top {
        background: var(--b1); color: var(--on-b1);
        min-height: 76px; display: flex; align-items: center; gap: 10px;
      }
      .hero .band.bottom {
        background: var(--b2); color: var(--ink);
        min-height: 56px; cursor: pointer;
      }
      /* Two lines, then ellipsis. Long trap names are the norm, not the edge
         case: "Antimosquitos Dormitorio Niñas" does not fit on one. */
      .nombre {
        flex: 1 1 auto; min-width: 0;
        font-size: 18px; font-weight: 700; letter-spacing: -0.01em; line-height: 1.25;
        display: -webkit-box; -webkit-box-orient: vertical;
        -webkit-line-clamp: 2; line-clamp: 2; overflow: hidden;
      }
      /* margin-left:auto rather than justify-content, so the buttons stay put
         when the name is hidden and there is nothing to push against. */
      .acts { flex: 0 0 auto; margin-left: auto; display: flex; gap: 8px; }
      .rbtn {
        width: 34px; height: 34px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; color: var(--on-b1); text-decoration: none;
        background: color-mix(in srgb, var(--on-b1) 16%, transparent);
        border: 1px solid color-mix(in srgb, var(--on-b1) 34%, transparent);
        --mdc-icon-size: 19px;
        transition: background 160ms ease, transform 120ms ease;
      }
      .rbtn:hover { background: color-mix(in srgb, var(--on-b1) 28%, transparent); }
      .rbtn:active { transform: scale(0.93); }
      .band.bottom .linea {
        font-size: 14.5px; font-weight: 600;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .band.bottom .fin {
        font-size: 12.5px; margin-top: 2px;
        color: color-mix(in srgb, var(--ink) 58%, transparent);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      /* Taller than the drawing on purpose. The appliance sits at the bottom of
         this box and the slack left at the top is where the vapour goes: the
         drawing fills its own frame edge to edge, so without that gap there is
         nowhere for anything to come out of. */
      .hero-art {
        position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
        height: 122px; cursor: pointer; color: var(--ink);
        display: flex; align-items: flex-end;
        transition: filter 220ms ease;
      }
      .hero-art > svg:not(.vapour) { width: 67px; height: 100px; display: block; }
      /* Something coming off the top while it works. The vector drawing had
         this and the photograph lost it — and a diffuser that is on looked
         exactly like one that is off, which is the one thing this card must
         never do. Three wisps out of phase, so it never reads as a loop. */
      .vapour {
        position: absolute; top: 0; left: 50%; transform: translateX(-50%);
        width: 46px; height: 20px; pointer-events: none;
        fill: none; stroke: var(--on-b1); stroke-width: 2.2; stroke-linecap: round;
      }
      .vapour path { opacity: 0.1; animation: vapour 3.2s ease-in-out infinite; }
      .vapour path:nth-child(2) { animation-delay: 1.05s; }
      .vapour path:nth-child(3) { animation-delay: 2.1s; }
      @keyframes vapour {
        0%, 100% { opacity: 0.08; }
        45% { opacity: 0.7; }
      }
      @media (prefers-reduced-motion: reduce) {
        .vapour path { animation: none; opacity: 0.4; }
      }
      /* Drawn appliance: one strip of frames, slid sideways to the frame that
         matches what is left, with the card's own indicator dot laid over the
         grey one the drawing carries.
         background-position is deliberately NOT transitioned: sliding between
         frames would walk through the ones in between, so the bottle would
         appear to refill itself on its way down. */
      .photo { position: relative; height: 100px; }
      .photo .frames {
        position: absolute; inset: 0;
        background-image: var(--sprite);
        background-repeat: no-repeat;
        background-size: calc(var(--frames) * 100%) 100%;
        background-position: var(--frame-x) 0;
      }
      .photo .led {
        position: absolute; border-radius: 50%;
        background: var(--led);
        transition: background 300ms ease, box-shadow 300ms ease;
      }
      .photo .led.lit {
        box-shadow: 0 0 7px 2px color-mix(in srgb, var(--led) 65%, transparent);
      }
      .hero-art.on { filter: drop-shadow(0 3px 10px rgba(0, 0, 0, 0.28)); }
      /* Off used to fade the appliance to 55 % and desaturate it. That dated
         from before the card drew its own indicator: now the lamp goes grey and
         loses its glow, which is what the real device does, so veiling the whole
         drawing on top of that only made a switched-off trap look broken.
         No :hover zoom either — it made the artwork twitch under the pointer. */
      /* Keeps the centring transform: a bare scale() here would drop the
         translateY and make the appliance jump on every press. */
      .hero-art:active { transform: translateY(-50%) scale(0.95); }
      .hero-art:focus-visible, .rbtn:focus-visible, .band.bottom:focus-visible {
        outline: 2px solid var(--ink); outline-offset: -3px;
      }
      /* ---- refill sheet: its buttons, shared with nothing else ---- */
      .actions { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
      .btn {
        flex: 1 1 auto; text-align: center; cursor: pointer; user-select: none;
        padding: 9px 14px; border-radius: 999px; font-size: 13px; font-weight: 600;
        color: var(--primary-text-color);
        background: color-mix(in srgb, var(--card-background-color) 60%, transparent);
        -webkit-backdrop-filter: blur(12px) saturate(160%);
        backdrop-filter: blur(12px) saturate(160%);
        border: 1px solid color-mix(in srgb, var(--primary-text-color) 16%, transparent);
        transition: background 160ms ease; text-decoration: none;
      }
      .btn:hover { background: color-mix(in srgb, var(--primary-text-color) 8%, transparent); }
      .btn.primary {
        background: var(--primary-color); color: var(--text-primary-color, #fff);
        border-color: transparent;
      }
      /* A coloured dot is the only warning that survives on a solid brand
         band: amber or red text would be unreadable on white or on yellow,
         but a dot beside ink-coloured text works on any of them. */
      .wdot {
        display: inline-block; width: 7px; height: 7px; border-radius: 50%;
        margin-right: 6px; vertical-align: 1px;
      }
      /* Sits inside the brand's own band, so it takes that band's ink instead
         of the theme's: the theme colour read fine on a white band and vanished
         on a coloured one. */
      .mode { color: inherit; font-weight: 700; opacity: 0.9; }
      .btn:focus-visible {
        outline: 2px solid var(--primary-color); outline-offset: 2px;
      }
      /* ---- refill sheet ---- */
      .backdrop {
        position: fixed; inset: 0; z-index: 9;
        display: flex; align-items: center; justify-content: center; padding: 18px;
        background: rgba(0, 0, 0, 0.45);
        -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
      }
      .sheet {
        width: 100%; max-width: 360px; max-height: 86vh; overflow: auto;
        padding: 18px; border-radius: 22px;
        background: color-mix(in srgb, var(--card-background-color) 88%, transparent);
        -webkit-backdrop-filter: blur(22px) saturate(180%);
        backdrop-filter: blur(22px) saturate(180%);
        border: 1px solid color-mix(in srgb, var(--primary-text-color) 16%, transparent);
        box-shadow: 0 18px 50px rgba(0, 0, 0, 0.45);
      }
      .sheet h3 { margin: 0; font-size: 17px; color: var(--primary-text-color); }
      .sheet .who {
        margin: 2px 0 0; font-size: 12px; font-weight: 600; color: var(--primary-color);
      }
      .field { margin-bottom: 12px; position: relative; }
      .field label {
        display: block; font-size: 11px; font-weight: 600; letter-spacing: 0.02em;
        color: var(--secondary-text-color); margin-bottom: 5px;
      }
      /* The browser's own select and number widgets look nothing like the rest
         of the card, so they are stripped back and rebuilt: same height, same
         radius, one chevron drawn in CSS so it follows the theme. */
      .field input, .field select {
        -webkit-appearance: none; -moz-appearance: none; appearance: none;
        width: 100%; box-sizing: border-box; height: 42px; padding: 0 13px;
        font-size: 14px; font-family: inherit; line-height: normal;
        border-radius: 12px; color: var(--primary-text-color);
        background: color-mix(in srgb, var(--primary-text-color) 6%, transparent);
        border: 1px solid color-mix(in srgb, var(--primary-text-color) 14%, transparent);
        transition: border-color 140ms ease, background 140ms ease, box-shadow 140ms ease;
      }
      .field select { padding-right: 36px; cursor: pointer; }
      .field input:hover, .field select:hover {
        background: color-mix(in srgb, var(--primary-text-color) 9%, transparent);
        border-color: color-mix(in srgb, var(--primary-text-color) 24%, transparent);
      }
      .field input:focus, .field select:focus {
        outline: none;
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-color) 22%, transparent);
      }
      /* Number inputs: the spinners are tiny, fiddly and off-theme. */
      .field input[type="number"] { -moz-appearance: textfield; }
      .field input[type="number"]::-webkit-outer-spin-button,
      .field input[type="number"]::-webkit-inner-spin-button {
        -webkit-appearance: none; margin: 0;
      }
      .field.sel::after {
        content: ""; position: absolute; right: 15px; bottom: 17px;
        width: 7px; height: 7px; pointer-events: none; opacity: 0.65;
        border-right: 2px solid var(--secondary-text-color);
        border-bottom: 2px solid var(--secondary-text-color);
        transform: rotate(45deg);
      }
      .two { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .note {
        margin: 2px 0 10px; font-size: 11.5px; line-height: 1.35;
        color: var(--secondary-text-color);
      }
      .note.warn { color: var(--warning-color, #ffc65c); }
      .calc {
        margin: 14px 0 2px; padding: 11px 12px; border-radius: 14px; font-size: 13.5px;
        font-weight: 600; text-align: center; color: var(--primary-text-color);
        background: color-mix(in srgb, var(--primary-color) 14%, transparent);
        border: 1px solid color-mix(in srgb, var(--primary-color) 30%, transparent);
      }
      .calc small { display: block; font-weight: 500; opacity: 0.75; margin-top: 3px; }
    `;
    this._card = document.createElement("ha-card");
    this._sheet = document.createElement("div");
    this.shadowRoot.append(style, this._card, this._sheet);
    this._built = true;
  }

  // ---------- paint ----------

  _paint() {
    if (!this._config || !this._hass) return;
    if (!this._built) this._build();
    // Held back until the catalogue settles. It decides the brand colours and
    // the drawing, so painting first rendered the card twice — once bare, once
    // branded — which is the flash that showed on every reload.
    if (!catalogSettled) return;
    // Never repaint under the user's fingers while the sheet is open.
    if (this._sheetOpen) return;

    const st = this._hass.states[this._config.entity];
    if (!st) {
      this._card.innerHTML = `<div style="padding:16px">${esc(this._config.entity)}: —</div>`;
      return;
    }
    const a = st.attributes || {};
    // The entity picker offers every sensor this integration owns, and only one
    // of them carries the refill. Picking "hours left" instead of "life left"
    // painted a card with no brand, no refill and the stand-in drawing — which
    // reads as the trap being broken rather than as the wrong entity chosen.
    // Say which sensor it wants instead of quietly rendering nonsense.
    if (a.refill_state === undefined) {
      this._card.innerHTML = `<div style="padding:16px">${esc(
        localize(this._hass, "no_entity")
      )}</div>`;
      return;
    }
    const L = (k, v) => localize(this._hass, k, v);
    const refillState = a.refill_state || "none";
    const hasRefill = refillState !== "none";
    const pct =
      hasRefill && st.state !== "unknown" && st.state !== "unavailable"
        ? Number(st.state)
        : null;
    const warn = Number(a.warn_percent ?? 10);
    const colour = !hasRefill
      ? COLOR.none
      : pct === null || pct <= 0
      ? COLOR.empty
      : pct <= warn
      ? COLOR.warn
      : COLOR.ok;
    // The card may carry its own name, or none at all: on a room page the trap
    // is often the only one there and the entity's name just repeats the
    // heading above it.
    const name = a.friendly_name || this._config.entity;
    const shortName = (this._config.name || name).replace(
      /\s*(Vida restante|Life left)$/i,
      ""
    );
    const showName = this._config.show_name !== false;
    const running = a.running === true;

    const aviso =
      refillState === "none"
        ? { t: L("no_refill"), c: COLOR.none }
        : refillState === "depleted"
        ? { t: L("depleted"), c: COLOR.empty }
        : pct !== null && pct <= warn
        ? { t: L("due"), c: COLOR.warn }
        : null;

    // Nights or hours, whichever the card is set to. The integration answers in
    // nights whenever there is a refill now — measured once the trap has enough
    // history, taken from the box until then — so the fall back to plain hours
    // survives only for a sensor from before that, which would send back null.
    const prefiereHoras = this._config.time_unit === "hours";
    const queda = !hasRefill
      ? L("no_refill")
      : !prefiereHoras && a.nights_left != null
      ? L("nights_left", { n: Math.round(a.nights_left) })
      : L("hours_left", { h: Math.round(a.remaining_hours ?? 0) });

    // The mode belongs on the white band: it changes often, and a control that
    // only reports it would take up more room than the word itself.
    const modo = a.mode ? localize(this._hass, a.mode) || a.mode : null;

    // When the refill runs out, in the viewer's own locale. Hours used and the
    // daily pace were dropped from the card: they answer "how has this been
    // going", which is a question for the history, not for a glance in passing.
    const fecha = a.depletion_estimate
      ? new Date(a.depletion_estimate).toLocaleDateString(
          (this._hass.locale && this._hass.locale.language) || "en",
          { day: "numeric", month: "short", year: "numeric" }
        )
      : null;

    const arte = artFor(this._catalog, a.brand, a.model);
    // The indicator follows the manufacturer's own convention — amber in normal
    // mode, green in boosted — which is the same thing the Mode control says.
    // Off it keeps the drawing's own grey: an unlit lamp is not a colour.
    const ledColour = !running ? "#9aa0a6" : a.mode === "max" ? "#37d67a" : "#ff9f43";

    // A bottle with a plus says "put a new one in". The circling arrows it
    // replaced are the universal sign for "refresh", which is not what the
    // button does. A tablet appliance gets a tray: a tonic bottle would be
    // a picture of the wrong object.
    // Three types exist — liquid, tablet and other — so this branches three
    // ways. Splitting them in two handed a tablet appliance a bottle icon.
    const refillIcon =
      a.consumable_type === "tablet"
        ? "mdi:pill"
        : a.consumable_type === "liquid"
        ? "mdi:bottle-tonic-plus-outline"
        : "mdi:tray-plus";
    const marca = brandColors(this._catalog, a.brand);
    const b1 = marca ? marca[0] : "var(--primary-color)";
    const b2 = marca ? marca[1] : "var(--card-background-color)";
    const ink = (marca && inkFor(marca[1])) || "var(--primary-text-color)";
    const onB1 = (marca && inkFor(marca[0])) || "var(--primary-text-color)";

    // There is no room for a chip, but dropping the warning altogether would
    // hide "refill spent" and "running low" — the one thing this card exists to
    // tell you. It goes on the white band's first line instead.
    // The hours say how much life is left; the percentage says how full the
    // bottle looks. Both, because the drawing now moves in four steps and the
    // number is the only thing that still tells you where between them it is.
    const pctTxt = hasRefill && pct !== null ? `${Math.round(pct)} %` : null;
    const heroSub = [
      aviso
        ? `<span class="wdot" style="background:${aviso.c}"></span>${esc(aviso.t)}`
        : esc(queda),
      pctTxt,
      modo ? `<span class="mode">${esc(modo)}</span>` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    const heroHtml = `
      <div class="hero" style="--b1:${b1}; --b2:${b2}; --ink:${ink}; --on-b1:${onB1}">
        <div class="band top">
          ${showName ? `<div class="nombre">${esc(shortName)}</div>` : ""}
          <div class="acts">
            <div class="rbtn" id="refill">
              <ha-icon icon="${refillIcon}"></ha-icon>
            </div>
            ${
              this._config.buy_url
                ? `<a class="rbtn" href="${esc(this._config.buy_url)}" target="_blank"
                      rel="noopener noreferrer" title="${L("buy")}"
                      aria-label="${L("buy")}"><ha-icon icon="mdi:cart-outline"></ha-icon></a>`
                : ""
            }
          </div>
        </div>
        <div class="band bottom" id="info">
          <div class="linea">${heroSub}</div>
          ${
            hasRefill && fecha
              ? `<div class="fin">${esc(L("ends_on", { d: fecha }))}</div>`
              : ""
          }
        </div>
        <div class="hero-art ${running ? "on" : ""}" id="art">
          ${
            running
              ? `<svg class="vapour" viewBox="0 0 40 22" aria-hidden="true" focusable="false">
                   <path d="M6 18 q5 -7 10 0 q5 7 10 0"/>
                   <path d="M9 12 q4 -6 8 0 q4 6 8 0"/>
                   <path d="M12 6 q3 -4 6 0 q3 4 6 0"/>
                 </svg>`
              : ""
          }
          ${
            arte
              ? `<div class="photo" style="
                   aspect-ratio:${arte.aspect};
                   --sprite:url('${arte.sprite}');
                   --frames:${arte.levels.length};
                   --frame-x:${frameShift(
                     arte.levels,
                     hasRefill ? pct ?? 0 : 0
                   ).toFixed(3)}%">
                   <div class="frames"></div>
                   ${
                     arte.led
                       ? `<span class="led ${running ? "lit" : ""}" style="
                            left:${(arte.led.x - arte.led.w / 2).toFixed(2)}%;
                            top:${(arte.led.y - arte.led.h / 2).toFixed(2)}%;
                            width:${arte.led.w}%; height:${arte.led.h}%;
                            --led:${ledColour}"></span>`
                       : ""
                   }
                 </div>`
              : ""
          }
        </div>
      </div>`;

    this._card.innerHTML = heroHtml;
    this._wire(a, shortName, running);
  }

  _wire(a, shortName, running) {
    const source = a.source_entity;
    const toggle = () => {
      if (!source) return;
      this._hass
        .callService("homeassistant", "toggle", { entity_id: source })
        .catch((err) => console.error("insect-trap-card: toggle failed:", err));
    };
    const label = localize(this._hass, running ? "turn_off" : "turn_on", { name: shortName });

    const art = this._card.querySelector("#art");
    if (art && source) {
      asButton(art, label, toggle);
      art.setAttribute("aria-pressed", running ? "true" : "false");
    }
    // The ring used to be what opened the history, and there is no ring any
    // more. The white band inherits the job: it is the half of the card that
    // reports rather than controls, so reading more of it belongs there.
    const info = this._card.querySelector("#info");
    if (info) {
      asButton(info, localize(this._hass, "history", { name: shortName }), () =>
        fire(this, "hass-more-info", { entityId: this._config.entity })
      );
    }
    const refill = this._card.querySelector("#refill");
    if (refill) {
      // The button is an icon now, so its label is the only thing that says
      // which of the two jobs it is doing: fitting the first refill, or
      // replacing one that is already in.
      const fitted = (a.refill_state || "none") !== "none";
      asButton(refill, localize(this._hass, fitted ? "replace" : "fit_one"), () =>
        this._openSheet(a)
      );
    }
  }

  // ---------- refill sheet ----------

  async _openSheet(a) {
    if (this._sheetOpen) return;
    this._sheetOpen = true;
    const L = (k, v) => localize(this._hass, k, v);
    const catalog = await loadCatalog();
    const lista = refillsFor(catalog, a.brand, a.model);

    const perNight = Number(a.hours_per_night) > 0 ? Number(a.hours_per_night) : 8;
    const factor = Number(a.mode_factor) > 0 ? Number(a.mode_factor) : 1;
    const unit = a.duration_unit === UNIT_HOURS ? UNIT_HOURS : UNIT_NIGHTS;
    const duration = Number(a.duration) > 0 ? Number(a.duration) : 45;
    const current = a.refill || "";
    const known = lista.some((r) => r.name === current);

    const aparato = [a.brand, a.model, a.mode ? L(a.mode) || a.mode : null]
      .filter(Boolean)
      .map(esc)
      .join(" · ");

    this._sheet.innerHTML = `
      <div class="backdrop" id="backdrop">
        <div class="sheet" role="dialog" aria-modal="true" aria-label="${L("sheet_title")}">
          <h3>${L("sheet_title")}</h3>
          ${aparato ? `<div class="who">${aparato}</div>` : ""}
          ${catalog ? "" : `<div class="note warn">${L("no_catalog")}</div>`}

          <div class="field sel"><label for="f-refill-sel">${L("f_refill")}</label>
            <select id="f-refill-sel">
              ${current ? "" : `<option value="" selected>${L("select_one")}</option>`}
              ${
                current && !known
                  ? `<option value="${esc(current)}" selected>${esc(current)}</option>`
                  : ""
              }
              ${lista
                .map(
                  (r) =>
                    `<option value="${esc(r.name)}"${
                      r.name === current ? " selected" : ""
                    }>${esc(r.name)}</option>`
                )
                .join("")}
            </select>
          </div>

          <div class="field sel"><label for="f-target">${L("f_target")}</label>
            <select id="f-target">
              ${TARGETS.map(
                (t) => `<option value="${t}"${t === a.target ? " selected" : ""}>${L(t)}</option>`
              ).join("")}
            </select>
          </div>

          <div class="two">
            <div class="field"><label for="f-duration">${L("f_duration")}</label>
              <input id="f-duration" type="number" min="1" max="10000" step="1" value="${duration}"></div>
            <div class="field sel"><label for="f-unit">${L("f_unit")}</label>
              <select id="f-unit">
                <option value="${UNIT_NIGHTS}"${unit === UNIT_NIGHTS ? " selected" : ""}>${L("nights")}</option>
                <option value="${UNIT_HOURS}"${unit === UNIT_HOURS ? " selected" : ""}>${L("hours_unit")}</option>
              </select></div>
          </div>

          <div class="note" id="note"></div>
          <div class="calc" id="calc"></div>
          <div class="actions">
            <div class="btn" id="cancel">${L("cancel")}</div>
            <div class="btn primary" id="confirm">${L("confirm")}</div>
          </div>
        </div>
      </div>`;

    const q = (id) => this._sheet.querySelector(id);

    const recalc = () => {
      const d = parseFloat(q("#f-duration").value) || 0;
      const u = q("#f-unit").value;
      const rated = ratedHours(d, u, perNight);
      const real = Math.round(rated / factor);
      const base =
        u === UNIT_HOURS
          ? L("lifetime_h", { h: Math.round(rated) })
          : L("lifetime_n", { n: d, p: perNight, h: Math.round(rated) });
      // When the appliance is on a boosted setting, the rated life is not what
      // this trap will actually get: say both numbers rather than one.
      const extra =
        factor !== 1 && a.mode
          ? `<small>${L("lifetime_mode", { h: real, mode: L(a.mode) || a.mode })}</small>`
          : "";
      q("#calc").innerHTML = base + extra;
    };

    const showNote = (refill) => {
      const note = q("#note");
      const texto = refill && refill.note ? refill.note : "";
      const sinConfirmar = refill && !refill.verified;
      if (!texto && !sinConfirmar) {
        note.textContent = "";
        note.className = "note";
        return;
      }
      note.textContent = sinConfirmar ? `${texto} ${L("unverified")}`.trim() : texto;
      note.className = sinConfirmar ? "note warn" : "note";
    };

    const onRefillChange = () => {
      const value = q("#f-refill-sel").value;
      const refill = lista.find((r) => r.name === value);
      showNote(refill);
      if (!refill) return;
      // A catalogue refill knows what it is for and how long it lasts.
      if (refill.target) q("#f-target").value = refill.target;
      if (refill.duration) q("#f-duration").value = refill.duration;
      if (refill.unit) q("#f-unit").value = refill.unit;
      recalc();
    };

    showNote(lista.find((r) => r.name === current));
    recalc();

    q("#f-refill-sel").addEventListener("change", onRefillChange);
    q("#f-duration").addEventListener("input", recalc);
    q("#f-unit").addEventListener("change", recalc);

    const close = () => {
      this._sheetOpen = false;
      this._sheet.innerHTML = "";
      if (this._onKey) document.removeEventListener("keydown", this._onKey);
      this._onKey = null;
      this._paint();
    };
    // Held on the instance rather than in a closure, so disconnectedCallback can
    // undo it even when close() never runs.
    this._onKey = (ev) => {
      if (ev.key === "Escape") close();
    };
    document.addEventListener("keydown", this._onKey);

    q("#backdrop").addEventListener("click", (ev) => {
      if (ev.target === q("#backdrop")) close();
    });
    asButton(q("#cancel"), L("cancel"), close);
    asButton(q("#confirm"), L("confirm"), () => {
      const refill = q("#f-refill-sel").value;
      // Close only once the service has accepted it. The sheet used to shut the
      // instant the call was fired, so a refill the integration rejected looked
      // registered and the card simply went back to showing the old one.
      this._hass
        .callService(DOMAIN, "replace_refill", {
          entity_id: this._config.entity,
          refill: refill || undefined,
          intended_for: q("#f-target").value,
          duration: parseFloat(q("#f-duration").value) || undefined,
          duration_unit: q("#f-unit").value,
        })
        .then(close)
        .catch((err) => {
          console.error("insect-trap-card: replace_refill failed:", err);
          const nota = q("#note");
          if (nota) {
            nota.className = "note warn";
            nota.textContent = String((err && err.message) || err);
          }
        });
    });
    setTimeout(() => q("#confirm").focus(), 30);
  }
}

// ---------- editor ----------

/**
 * The sensors this card can actually draw.
 *
 * The integration gives every trap six sensors, and an entity picker filtered
 * only by integration offered all six — so "nights left" sat one row away from
 * "life left" in the list. Choosing it left a card with no brand, no refill and
 * a stand-in drawing, which reads as a broken trap rather than as the wrong
 * pick. Warning about it afterwards was treating the symptom.
 *
 * Carrying the refill is what makes a sensor usable here, so that is what the
 * list is built from: the card cannot offer a choice that does not work.
 */
function trapSensors(hass) {
  const states = (hass && hass.states) || {};
  return Object.keys(states)
    .filter((id) => states[id].attributes && states[id].attributes.refill_state !== undefined)
    .map((id) => ({ value: id, label: states[id].attributes.friendly_name || id }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** Built per editor, not once per module: the options depend on `hass`. */
function schemaFor(hass) {
  return [
    {
      name: "entity",
      required: true,
      selector: { select: { options: trapSensors(hass), mode: "dropdown" } },
    },
    { name: "show_name", selector: { boolean: {} } },
    { name: "name", selector: { text: {} } },
    { name: "buy_url", selector: { text: { type: "url" } } },
    {
      name: "time_unit",
      selector: {
        select: {
          mode: "dropdown",
          options: [
            { value: "auto", label: localize(hass, "tu_auto") },
            { value: "nights", label: localize(hass, "tu_nights") },
            { value: "hours", label: localize(hass, "tu_hours") },
          ],
        },
      },
    },
  ];
}

class InsectTrapCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
    this._render();
  }
  // Home Assistant hands over a fresh `hass` on every state change in the
  // house — several a second here. Re-rendering on each one reassigned the
  // form's `data` from `this._config`, and `this._config` only catches up once
  // a config-changed event has been round-tripped through HA. In that window
  // whatever the user had just picked was overwritten by the previous config,
  // which is why changing the entity looked like the card forgetting itself.
  // The form only needs the new hass; nothing else about it has changed.
  set hass(hass) {
    this._hass = hass;
    if (this._form) this._form.hass = hass;
    else this._render();
  }
  _render() {
    if (!this._config || !this._hass) return;
    if (!this._form) {
      if (!this.shadowRoot) this.attachShadow({ mode: "open" });
      this._form = document.createElement("ha-form");
      this._form.addEventListener("value-changed", (ev) =>
        // ha-form only ever sees the fields the schema declares, so it cannot
        // be relied on to carry the card's own `type` back out with them.
        fire(this, "config-changed", {
          config: { type: this._config.type, ...ev.detail.value },
        })
      );
      this.shadowRoot.append(this._form);
    }
    this._form.hass = this._hass;
    this._form.schema = schemaFor(this._hass);
    this._form.data = this._config;
    // `name` is both a config key and the card's own display name in the
    // strings, so asking for its label by key would have labelled the field
    // "Insect trap". It is the one field that needs a label of its own.
    this._form.computeLabel = (s) =>
      s.name ? localize(this._hass, s.name === "name" ? "name_label" : s.name) : "";
  }
}

customElements.define("insect-trap-card", InsectTrapCard);
customElements.define("insect-trap-card-editor", InsectTrapCardEditor);

// The card was called consumable-card until v0.4.0. Keep the old tag alive so
// dashboards that already use it do not break on upgrade.
if (!customElements.get("consumable-card")) {
  customElements.define("consumable-card", class extends InsectTrapCard {});
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: "insect-trap-card",
  name: STRINGS.en.name,
  description: STRINGS.en.description,
  preview: false,
});

console.info(
  `%c INSECT-TRAP-CARD %c v${VERSION} `,
  "color: white; background: #4caf50; font-weight: 700;",
  "color: #4caf50; background: white; font-weight: 700;"
);
