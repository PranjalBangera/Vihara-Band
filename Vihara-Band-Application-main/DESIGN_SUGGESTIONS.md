# Vihara Band — UI Design Suggestions

> Generated from an exploration of the project source (`src/index.html`, `src/css/style.css`, `src/js/main.js`, `README.md`).
> Suggestions only — no changes have been applied.

---

## 1. Design System Audit

### Current State
- **Stack:** Vanilla HTML/CSS/JS + Vite + Capacitor (no UI framework). Custom design system.
- **Palette (dark default):**
  - Background: `#09090F`
  - Surfaces: `#111118`, `#18181F`, `#1E1E28`
  - Accent: teal `#00C896` → mint `#00FFD1`
  - SOS red: `#FF6B6B` / `#FF4444`
  - Info blue: `#6B8FFF`, warning yellow: `#FFD93D`
- **Typography:** Outfit (weights 300–800).
- **Glassmorphism:** Glass cards use `backdrop-filter: blur(12px)` with subtle borders.
- **Layout:** Max-width 430px mobile shell, full-height screens, safe-area insets, bottom nav (~72px + safe area).

### Suggested Refinements
1. **Glass depth:** Increase border opacity on primary/pressed surfaces (`rgba(255,255,255,0.06)` → consider `0.1` for hierarchy) and add a subtle top inner highlight.
2. **Typography:** Tighten tracking on large display values; enforce tabular numerals for ring/stats numbers.
3. **Semantic color ramp:** Separate success / warning / danger / info tokens instead of sharing hues.

---

## 2. Screen-by-Screen Suggestions

### Startup Splash
- Slow ring rotation slightly for reduced-motion comfort.
- Optional skip / sound cue.
- Ambient glow intensity should adapt to theme.

### Welcome / Auth
- Front-load animated activity ring as hero visual.
- Move feature highlights below the fold.
- Segmented control: Sign in / Guest.

### Pairing
- Discovered devices: add RSSI/signal strength bars.
- Auto-select strongest signal option.

### Dashboard
- Rings: add goal ring (consumed vs. goal), unit-formatted center value, smooth animation, haptics on completion.
- Stats grid: delta arrows vs. previous period.
- Quick actions: move to consistent 2×2 grid.

### Activity
- Animated sliding indicator for Day/Week/Month tabs.
- Sedentary alerts: escalate to full-screen gentle nudge when interrupting.

### SOS
- Visualize 5s cancel buffer as countdown ring.
- SOS button: pulse/waveform animation.
- Contacts: priority-sorted quick-dial grid.

### Insights
- Unify chart palette with activity ring colors.
- Empty states; recommendations should map to actions.

### Cross-cutting
- `prefers-reduced-motion` support.
- Touch targets ≥ 44px; haptic patterns via `navigator.vibrate`.

---

## 3. Open Questions
- Light-theme contrast verification (`--t2` on surfaces).
- Whether SOS should be full immersive red gradient vs. current.
