---
name: design-tokens
description: Use when changing any colour, spacing, font, radius or shadow in this repo — sites/<SITE>/DESIGN.md, sites/<SITE>/token-manifest.json, sites/<SITE>/tokens/primitives.json, tokens/semantic.json, theme.css, aliases.json, src/components/Dashboard/palette.ts, color-scales.ts — the per-site token profiles for ncyimby and stoside, how to prove a computed value traces back to a token, the contrast and drift sweeps, and the two-site theme matrix.
---

# Design tokens, and how a change is proved against them

This is the design-system half of UI work in this repository. It is the companion to the
global `ui-surgeon` skill, which owns the generic edit-verify-iterate loop: find the dev
server, baseline, acceptance criteria by tier (T1 a11y tree, T2 computed values, T3
screenshot, T4 video), classify, iterate, ship, verify production. Everything here is what
that loop cannot know without reading this repository.

**It lived in the global skill until 2026-11-16, and that was wrong.** `ui-surgeon` fires on
any frontend task in any project, and it hardcoded `sites/<SITE>/DESIGN.md`,
`token-manifest.json`, `gatsby develop`, a default site of `ncyimby` and this repository's own
token names. In any other project those are instructions to read files that do not exist,
which reads as a broken tool rather than as a skill aimed somewhere else. The split is
along the line that always applies: a fact about the outside world or about one repository
belongs with that thing, not in something loaded everywhere.

## Load this before defining acceptance criteria

This is step 0.5 of the `ui-surgeon` loop — after the dev server is up and the viewport is
set, before a baseline is captured and before any criterion is written.

1. **Determine the active site.** Read the dev server's `SITE` env var or its startup output.
   The default is `ncyimby`. `@/site` resolves to `sites/<SITE>/` at build time.

2. **Read `sites/<SITE>/DESIGN.md`.** Visual direction, and its do's and don'ts are hard
   constraints rather than suggestions. See **DESIGN.md is law** below.

3. **Load `sites/<SITE>/token-manifest.json`.** Every token name, its `value`, its `resolved`
   concrete value after the whole `var()` chain, its `references` parent, its `layer`
   (`primitive` / `semantic` / `alias`), and `contrastPairs` pre-computed as hex. If it is
   missing, run `npm run build:tokens` first.

4. **Note the site's constraints** from `references/site-token-profiles.md`: which tokens this
   site has, and which would be a violation. ncyimby has no `--dash-*` or `--severity-*`
   tokens at all, so code referencing one falls through to a browser default, which is a bug
   that looks like a styling choice. stoside allows colour only in dashboard contexts.

Dev with real CMS data, which matters because an empty dev server hides layout bugs:

```bash
STRAPI_URL=https://cms.ncyimby.org SITE=ncyimby gatsby develop
STRAPI_URL=https://cms.stoside.org SITE=stoside gatsby develop
```

Production: **ncyimby.org**, **stoside.org**. Those are the URLs for the production reference
capture in step 1 and the production verification in step 9.

## Token criteria: add them for every style change

For every CSS property the edit touches, add a T2 criterion asserting the computed value
matches what the manifest says that token resolves to. They are T2-tier (~100-500 tokens
each) and run alongside the other T2 diagnostics, not as a separate pass.

```
TOKEN CRITERIA:
- [ ] T2-token: body background-color matches --bg-primary (resolved: #ffe8cc)
- [ ] T2-token: .button background-color matches --accent-primary (resolved: #a63d00)
- [ ] T2-token: .button color matches --btn-text (resolved: #ffe8cc)
- [ ] T2-contrast: --text-primary on --bg-primary contrast ratio >= 4.5:1
- [ ] T2-drift: no element on the page uses a hardcoded colour where a token exists
```

How to generate them:

1. Identify the elements the edit touches.
2. For each, identify which CSS properties use tokens.
3. Look up each token's `resolved` value in the manifest.
4. Add a T2-token criterion per token.
5. For any foreground/background pair, add a T2-contrast criterion from `contrastPairs`.
6. Always add one T2-drift criterion, to sweep for hardcoded values the edit introduced.

`references/token-verification.md` holds the `agent-browser eval` snippets: the rgb-to-hex
helper, the per-element token check, the WCAG contrast computation, and the full T2-drift
sweep with its violation taxonomy.

## The repository's own rules

From `CLAUDE.md`, restated here only as the list a verification criterion is written against:

- Colours come from CSS custom properties in `sites/<SITE>/theme.css`. Never a literal hex,
  rgb, hsl or named colour.
- Spacing from `--space-*`; font sizes from `--font-size-*`; families from `--font-display`,
  `--font-body`, `--font-mono`; radii from `--radius-*`.
- Dashboard data-viz colours from `--dash-*`. **stoside only.**
- Semantic names in new code (`--bg-primary`, `--text-primary`, `--accent-primary`), not
  legacy (`--bg`, `--text`, `--accent`) and not primitives (`--color-warm-100`).
- Alpha tints via `color-mix(in srgb, var(--token) N%, transparent)`, never rgba or an
  opacity hack.
- `theme.css` is generated by `npm run build:tokens`. Do not edit it.

Two classifications in the `ui-surgeon` bug table exist for this system specifically:

| Classification | Symptom | Fix |
|---|---|---|
| **hardcoded-value** | Computed colour matches no token's `resolved` value | Replace the raw value with `var(--token-name)` |
| **wrong-layer** | Uses a primitive where a semantic wrapper exists | `var(--color-warm-100)` becomes `var(--bg-primary)` |
| **token-drift** | A token's live value differs from the manifest | The pipeline is stale, or a cascade override is active |

## The compliance sweep, at the end of every style change

```bash
agent-browser eval "
  function rgbToHex(rgb) {
    const m = rgb.match(/\\d+/g);
    if (!m) return rgb;
    return '#' + m.slice(0,3).map(n => (+n).toString(16).padStart(2,'0')).join('');
  }
  const root = getComputedStyle(document.documentElement);
  const pairs = [
    ['--bg-primary', '--text-primary'],
    ['--accent-primary', '--btn-text'],
    ['--bg-surface', '--text-secondary']
  ];
  JSON.stringify(pairs.map(([bg,fg]) => ({
    bg: { token: bg, hex: rgbToHex(root.getPropertyValue(bg).trim() || 'n/a') },
    fg: { token: fg, hex: rgbToHex(root.getPropertyValue(fg).trim() || 'n/a') }
  })));
"
```

Compare every returned value against the manifest. Any difference is `token-drift`. Then run
the T2-drift sweep from `references/token-verification.md` for hardcoded values the edit
introduced.

## The theme matrix: a shared component renders on both sites

**If the edited component is in `src/` rather than under `sites/`, it renders on both sites
and one site's verification proves nothing about the other.** Skip this for anything under
`sites/`.

1. Start or switch to the other site's dev server: `SITE=<other> gatsby develop -p 8001`.
2. Open the same page on that port.
3. Run the T2-token sweep again.
4. **The same semantic token should resolve to a different concrete value per site.** If both
   sites report an identical `--bg-primary`, something is wrong — unless the two genuinely
   share that value, which is worth confirming in the manifests rather than assuming.
5. Check the other site's DESIGN.md constraints too: stoside's monochrome rule, ncyimby's
   warm-only rule.

## DESIGN.md is law

The active site's DESIGN.md defines hard constraints. **A violation of it is a bug even when
every computed value matches a token**, because a token can be technically correct and
semantically wrong for the site: no cool tones on ncyimby, monochrome-only on stoside outside
dashboard contexts. Token compliance and design compliance are two separate checks and both
have to pass.
