---
name: "Strong Towns Oceanside"
tokens: "./tokens/"
built: "./theme.css"
---

# Overview

Community site for Strong Towns Oceanside, a grassroots urban resilience group. The design is monochrome, bold, and direct. The audience is Oceanside residents who care about their city's future. Data-heavy content alongside articles and events.

# Colors

Strictly monochrome. Near-black (`--text-primary`) on white (`--bg-primary`). No brand color beyond black; the logo and imagery carry the visual identity. Gray tones (`--text-secondary`, `--text-muted`) for hierarchy. The restraint is intentional: content and data speak louder than decoration.

# Typography

Display: Georgia (`--font-display`) for headlines. Strong, no-nonsense. Body: Helvetica/Arial (`--font-body`) for running text and UI. Mono: SF Mono (`--font-mono`) for dashboard data tables and statistics. The monochrome palette demands clear typographic hierarchy since color can't differentiate sections. All font sizes from the `--font-size-*` scale.

# Layout

Supports both article reading (~720px) and data-heavy pages (wider). Data pages use dense layouts with tables and charts. Article pages use generous spacing. Navigation includes more items (Articles, Data, Events, Report, About) reflecting the content breadth.

# Components

Buttons: black background, white text. No radius, no shadow; stark and functional. Links: black, underline on hover. Cards: bordered with `--border-default`, white background. Data visualizations: monochrome with sparing use of a single highlight color when needed for chart legibility.

# Dashboard Data Visualization

Dashboard pages use a separate semantic palette (`--dash-*` tokens): blue accent for primary data, green/red for positive/negative indicators, gray for neutral baselines, light surface for card backgrounds. Mono font (`--font-mono`) for all numeric data. These are the only colors beyond the monochrome base.

# Do's and Don'ts

- DO: Let the monochrome palette create a newspaper-like authority.
- DO: Use strong typographic hierarchy to compensate for the limited color range.
- DO: Use `--dash-*` tokens for all chart and data visualization colors.
- DON'T: Introduce color outside the dashboard palette. Charts get color; everything else stays monochrome.
- DON'T: Soften the edges. No rounded corners on buttons, no drop shadows, no gradients.
