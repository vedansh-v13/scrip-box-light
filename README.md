# Scripbox PMS Mobile Landing Page — Light Mode A/B Variant

This repository contains the standalone, production-ready **Light Mode A/B test variant** of the Scripbox Portfolio Management Services (PMS) mobile landing page.

It was created to test whether a **light, premium editorial wealth-management aesthetic** outperforms the existing approved dark-mode control in qualified conversion rates.

---

## 1. Project Overview & Architectural Isolation

- **Self-Contained Directory:** `hero-light/`
- **Zero Cross-Project Coupling:** Does not import or reference any styles, scripts, or assets from the original dark-mode project (`hero/`).
- **Full Content & Functional Parity:** Identical copy, financial figures, APMI calculation basis, regulatory disclosures, GSAP hero animation sequence, qualification modal flow, and interactive behavior.

---

## 2. File & Asset Inventory

```
hero-light/
├── index.html                 # Light-mode semantic HTML5 markup with calibrated inline SVGs
├── style.css                  # Self-contained Light Mode design system stylesheet
├── app.js                     # Prototype logic, GSAP hero timeline & form state management
├── performance-data.js        # APMI India performance dataset (2Y, 3Y, 4Y, SI) & compliance notes
├── gsap.min.js                # Standalone GreenSock Animation Platform bundle (v3.12)
├── scripbox-logo.svg          # Official Scripbox SVG vector brandmark
├── favicon.svg & favicon.ico  # Scripbox browser icon assets
├── test-suite.js              # Multi-viewport automated Chrome DevTools Protocol (CDP) test suite
├── test-results.json          # Machine-readable test execution report (34 passed, 0 failed)
├── README.md                  # Project documentation, local preview & deployment guide
├── assets/                    # Authentic leadership photography
│   ├── atul-shinghal.jpg      # Founder
│   ├── sanjiv-singhal.jpg     # Co-founder
│   ├── mandar-bagul.jpg       # Director & Senior VP - Advisory
│   ├── mayur-parkeria.jpg     # Equity Fund Manager
│   ├── sanjiv-singhal-card.jpg
│   └── sanjiv-singhal-portrait.jpg
└── shots/                     # High-resolution multi-viewport verification screenshots
    ├── comparison-dark-hero-360x640.png
    ├── comparison-light-hero-360x640.png
    ├── comparison-dark-hero-390x844.png
    ├── comparison-light-hero-390x844.png
    ├── comparison-dark-hero-430x932.png
    ├── comparison-light-hero-430x932.png
    ├── light-modal-step-1-390x844.png
    ├── light-modal-step-2-390x844.png
    ├── light-modal-step-3-390x844.png
    ├── light-modal-step-4-390x844.png
    ├── light-perf-section-390x844.png
    ├── light-strat-optimiser-closed-390x844.png
    ├── light-strat-optimiser-open-390x844.png
    ├── light-strat-growth-390x844.png
    └── light-leadership-section-390x844.png
```

---

## 3. Light-Mode Art Direction & Design Decisions

### Color System & Contrast
- **Canvas (`--bg-surface`):** Warm soft ivory (`#FAF8F5`). Eliminates sterile white glare while cultivating a calm private-banking feel.
- **Card Surfaces (`--bg-card`):** Pure white (`#FFFFFF`) with subtle warm hairline borders (`#E5DFD4`) and soft micro-elevation (`0 1px 3px rgba(30,20,10,0.03)`).
- **Primary Typography:** Deep warm charcoal (`#1A1816`) with an exceptional **16.7:1 WCAG AAA contrast ratio** on the ivory canvas.
- **Secondary Typography:** Calibrated warm slate (`#5C564E`) delivering **6.2:1 WCAG AA contrast**.
- **Brand Accent:** Canonical Scripbox Orange (`#F58024`) for CTA buttons, logo, and active badges. Text accents use darkened amber (`#C85D0E`) to achieve &ge; 4.8:1 contrast on white.
- **CTA Treatment:** `#F58024` button with `#110F0E` near-black bold text (**7.3:1 WCAG AAA contrast**), matching the control's approved high-contrast CTA.

### Chart Adaptation
- **SVG Trajectory & Geometry:** Preserved 100% identically (`viewBox="0 0 328 102"`).
- **Portfolio Curve:** Institutional deep sage green (`#246B46`, stroke-width 2.0px) for sharp legibility on light ivory.
- **Benchmark Curve:** Warm slate charcoal (`#7A7268`, stroke-width 1.4px).
- **Gridlines:** Subtle hairline `rgba(30, 25, 20, 0.06)` with baseline at `rgba(30, 25, 20, 0.12)`.
- **Stat Values:** Scripbox `₹2.47 Cr` rendered in deep sage green (`#246B46`), Benchmark `₹1.62 Cr` in warm slate (`#5C564E`).

---

## 4. Local Preview & Running Instructions

### Method 1: Python HTTP Server (Recommended)
```bash
# Navigate to project directory
cd hero-light

# Start HTTP server on port 8090
python3 -m http.server 8090
```
Open [http://localhost:8090/index.html](http://localhost:8090/index.html) in your mobile browser or device emulator.

### Method 2: Node.js / npx serve
```bash
cd hero-light
npx serve -l 8090
```

---

## 5. Running the Automated Test Suite

The test suite runs headlessly using Google Chrome DevTools Protocol (CDP) to measure exact layout metrics, compute color contrast ratios, test interactive flows, and take high-resolution screenshots.

```bash
# Ensure local server is running on port 8090
cd hero-light
node test-suite.js
```

Execution results are written to `hero-light/test-results.json` and screenshots are saved in `hero-light/shots/`.

---

## 6. A/B Testing Discipline & Analytics Parity

To isolate the visual theme as the pure independent variable:
1. **Identical DOM IDs & Event Names:** All interactive triggers (`btnHeroB`, `stickyCtaBtn`, `btnSecondaryCta`, form input fields) share exact IDs and event structures with the dark mode control.
2. **Identical Conversion Funnel:**
   - Funnel Step 1: `modal_open` (Triggered by hero/sticky CTA)
   - Funnel Step 2: `objective_selected` (Step 1 choice)
   - Funnel Step 3: `scale_selected` (Step 2 choice)
   - Funnel Step 4: `lead_submitted` (Step 3 form validation and submit)
   - Funnel Step 5: `callback_preference_saved` (Step 4 chip toggle)
3. **Traffic Split Recommendation:** 50/50 randomized split at the CDN or edge layer (e.g. Cloudflare Worker, Netlify Edge Functions, or Vercel Edge Middleware) targeting mobile user-agents.

---

## 7. Deployment Instructions for Separate Repository

When ready to publish this variant to a dedicated GitHub repository and hosting provider:

```bash
# 1. Initialize git in a separate standalone directory
mkdir scripbox-pms-light && cd scripbox-pms-light
cp -r /path/to/hero-light/* .
git init
git add .
git commit -m "feat(pms-light): initial release of Scripbox PMS light mode A/B test variant"

# 2. Connect to your new remote repository
git remote add origin git@github.com:scripbox/<repo-name>.git
git branch -M main
git push -u origin main
```

### Static Hosting Deployments:
- **Netlify:** Set Publish directory to `.`. No build command required.
- **Vercel:** Framework Preset: `Other`, Root Directory: `.`.
- **Cloudflare Pages:** Build command: *none*, Output directory: `.`.
