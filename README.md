# Insect Trap Card

[![hacs][hacs-badge]][hacs-url]
[![release][release-badge]][release-url]
[![validate][validate-badge]][validate-url]
[![licence][licence-badge]](LICENSE)

The Lovelace card for [Insect Traps][integration]. It draws the appliance itself
— the bottle at the level the refill is really at, the indicator lit in the
colour of the mode, vapour rising only while it is working — so a glance tells
you whether the trap is doing anything and how much life it has left.

![The same drawing at four levels of refill](docs/frames.png)

## Why

A percentage in a row of text is easy to stop seeing. A bottle that empties, an
indicator that changes colour and vapour that stops when the trap does are read
without being read: you notice the trap is off from across the room.

## Features

- **The appliance, drawn.** One image strip per model; the card slides it to the
  frame that matches what is left.
- **The indicator says the mode.** Amber on normal, green on boosted, grey and
  unlit when off — the manufacturer's own convention.
- **Vapour only while running.** A diffuser that is on must never look like one
  that is off.
- **The brand's colours**, taken from the integration's catalogue.
- **One tap** switches the trap; the lower band opens its history; the button
  registers a new refill without leaving the dashboard.
- **Visual editor**, English and Spanish.

## Installation

### HACS (recommended)

1. HACS → three-dot menu → **Custom repositories**.
2. Add `https://github.com/domotk/insect-trap-card` with category **Dashboard**.
3. Install **Insect Trap Card** and reload your browser.

Needs the [Insect Traps integration][integration] 1.2.0 or newer: the catalogue
and the artwork are served by it.

### Manual

1. Copy `dist/insect-trap-card.js` into `config/www/`.
2. Settings → Dashboards → three-dot menu → **Resources** → add
   `/local/insect-trap-card.js` as **JavaScript module**.

## Usage

```yaml
type: custom:insect-trap-card
entity: sensor.bedroom_trap_life_left
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `entity` | string | **required** | The trap's **Life left** sensor. |
| `show_name` | boolean | `true` | Hide the name when the page heading already says it. |
| `name` | string | — | Show this instead of the entity's own name. |
| `time_unit` | string | `auto` | `auto`, `nights` or `hours`. |
| `buy_url` | string | — | Adds a shopping button to the brand band. |

The entity picker only offers sensors that can actually be drawn. The
integration gives every trap six sensors and only one of them carries the
refill.

### Interaction

| Gesture | Result |
|---|---|
| Tap the appliance | Switches the trap on or off |
| Tap the lower band | Its history |
| Tap the refill button | The "new refill" sheet |
| Tap the cart button | Your `buy_url` |

## The artwork

Each appliance is one PNG: a horizontal strip of frames of the same drawing with
the bottle at different levels. The catalogue says what level each frame depicts,
so the card shows the nearest one and a strip may hold any number of them.

Two details make it work:

- **The indicator is drawn grey.** The card lays its own dot over it, so the one
  part that has to change colour is the one part not baked into the image.
- **The frames must be the same drawing**, not four separate renderings. Image
  generators are poor at redrawing one object consistently; the reliable route is
  one frame with the bottle empty and the levels composited afterwards.

A model with no artwork of its own borrows the catalogue's stand-in. It is the
wrong diffuser, but it still reads as a diffuser.

## Performance

Nothing is drawn until the catalogue has arrived, success or failure alike. The
card used to paint once bare and once branded, which showed as a flash on every
reload.

## Contributing

Issues and pull requests are welcome. The card is a single file with no
dependencies and no build step, so a plain editor is all you need.

## Built with

Every push is checked by the [HACS action](https://github.com/hacs/action).
No build step, no bundler: the card is a plain ES module, served as it is
written.

## Licence

MIT © Rubén Brieva

[integration]: https://github.com/domotk/insect-trap
[hacs-badge]: https://img.shields.io/badge/HACS-Custom-41BDF5.svg
[hacs-url]: https://github.com/hacs/integration
[release-badge]: https://img.shields.io/github/v/release/domotk/insect-trap-card
[release-url]: https://github.com/domotk/insect-trap-card/releases
[validate-badge]: https://github.com/domotk/insect-trap-card/actions/workflows/validate.yml/badge.svg
[validate-url]: https://github.com/domotk/insect-trap-card/actions/workflows/validate.yml
[licence-badge]: https://img.shields.io/github/license/domotk/insect-trap-card
