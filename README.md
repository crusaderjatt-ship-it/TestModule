# Game Module Operations Console

This repository now contains a full React/Vite Game Module admin application for configuring game-menu monetization. It replaces the previous placeholder with a working console for paywall templates, confirmation screens, configurable menu flows, dynamic pricing, assignments, and a live purchase preview.

## Local startup

```bash
npm install
npm run dev
```

Open the Vite URL printed by the terminal, normally <http://localhost:5173>.

To also run the local JSON persistence API in another terminal:

```bash
npm run api
```

Or run both together:

```bash
npm run dev:full
```

## API persistence layer

The demo API lives in `api/server.mjs` and serves CRUD endpoints for simple file-backed resources:

- `GET /api/paywalls`, `POST /api/paywalls`, `GET|PUT|PATCH|DELETE /api/paywalls/:id`
- `PATCH /api/paywalls/:id/rollback` with `{ "version": 1 }`
- `GET|POST|PUT|PATCH|DELETE /api/flows/:id`
- `GET|POST|PUT|PATCH|DELETE /api/pricing-rules/:id`
- `GET|POST|PUT|PATCH|DELETE /api/assignments/:id`
- `GET|POST|PUT|PATCH|DELETE /api/metrics/:id`
- `GET|POST|PUT|PATCH|DELETE /api/purchases/:id`

Writes are performed through a temporary file followed by `rename`, which is atomic enough for local demo use.

Data is stored in:

- `data/paywalls.json`
- `data/flows.json`
- `data/pricing-rules.json`
- `data/assignments.json`
- `data/metrics.json`
- `data/purchases.json`

## Feature coverage

### Paywall Template System

- Create, edit, duplicate, publish, draft, archive, rollback/version history support.
- Naming convention examples such as `HLN Summer Promo v3`.
- Assignment targets for builds, brands, locations, schedules, and A/B traffic split.
- Metrics fields for conversion rate, engagement, and revenue per session.

### Paywall Builder UI

- Background references for PNG/JPG/GIF/MP4-style assets.
- Scaling modes: cover, contain, and custom zoom.
- X/Y positioning, overlay opacity, blur, and dark/light/brand gradients.
- Editable headline, subtext, typography size, shadow, glow, price label, close button, bottom Play Games button.
- CTA controls for text, font size/weight, shape, dimensions, placement, fill, gradient, border, and text color.
- Global CTA synchronization so the paywall CTA, bottom Play Games CTA, and confirmation CTA can share styling.

### Confirmation Screen Builder

- Mirrored layout and CTA flexibility for the confirmation screen.
- Confetti toggle, transition animation selector, auto-close timing, and secondary cancel CTA.

### Configurable Game Menu Flow Engine

- Flow builder with screen order, visibility toggles, and trigger labels.
- Entry full-screen paywall toggle and CTA destination options.
- Global confirmation screen enable/disable and placement modeling.
- Home screen toggles for categories, arrows, featured rows, and grid/carousel layout.
- Bottom CTA and tile-click behavior configuration.
- Game info page enable/disable and per-game paywall assignment.
- Draft/published/default locked fallback flow data model.

### Dynamic Pricing & Scheduling Engine

- Central utility functions in `frontend/src/utils/pricing.ts` drive displayed and charged prices.
- Day-of-week and minute-level schedules, including end-of-minute validity.
- Price lock at CTA click time via `lockPriceAtCtaClick`.
- Assignment matching by game-menu version/build, brand, and location.
- Temporary promotional overrides.
- Algorithmic pricing fields for future demand, usage, and conversion-rate adjustments.
- POS/check integration mode selection: direct price update or credit/discount line item.
- Schedule activation fields for flow and paywall versions.
- Overlap detection and free/negative pricing safeguards.

### Preview UX

- Live device-frame preview for game menu, paywall, confirmation screen, and purchased states.
- Simulated brand, location, build, and time selectors.
- Interactive game tiles and bottom CTA journey.
- Visual indicators for active flow, paywall, price, schedule minute, and locked purchase price.
- Built-in sample catalog data for immediate use.

## Validation and tests

Run utility tests:

```bash
npm test
```

Run a production build and typecheck:

```bash
npm run build
```
