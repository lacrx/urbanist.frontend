# Token Verification Reference

Quick-reference for design-token-aware verification in the ui-surgeon loop. All commands use `agent-browser eval` (headless Chrome via CDP).

## Loading the Token Manifest

At the start of every ui-surgeon session (step 0.5), load the active site's manifest:

```
sites/<SITE>/token-manifest.json
```

Determine SITE from the dev server startup output or `process.env.SITE` (default: `ncyimby`).

The manifest contains:
- `tokens`: map of `--name` to `{ value, resolved, references, layer }`
  - `value`: the CSS declaration (e.g. `var(--color-warm-100)` or `#ffe8cc`)
  - `resolved`: the final concrete value after resolving all var() chains (always a raw value like `#ffe8cc`, `16px`, etc.)
  - `references`: the token this one points to, or `null` for primitives
  - `layer`: `primitive` | `semantic` | `alias`
- `contrastPairs`: pre-computed fg/bg token pairs with resolved hex values
- `site`: which site this manifest is for

If the manifest is missing, run `npm run build:tokens` first.

## RGB/Hex Conversion

`getComputedStyle` returns colors as `rgb(r, g, b)`. The manifest stores hex. Convert with:

```javascript
function rgbToHex(rgb) {
  const m = rgb.match(/\d+/g);
  if (!m) return rgb;
  return '#' + m.slice(0,3).map(n => (+n).toString(16).padStart(2,'0')).join('');
}
```

Always convert computed RGB to hex before comparing against manifest values.

## T2-token: Verify Computed Values Match Tokens

Check that an element's computed style matches the expected token resolution.

```bash
agent-browser eval "
  function rgbToHex(rgb) {
    const m = rgb.match(/\\d+/g);
    if (!m) return rgb;
    return '#' + m.slice(0,3).map(n => (+n).toString(16).padStart(2,'0')).join('');
  }
  const el = document.querySelector('SELECTOR');
  const cs = getComputedStyle(el);
  JSON.stringify({
    backgroundColor: rgbToHex(cs.backgroundColor),
    color: rgbToHex(cs.color),
    fontFamily: cs.fontFamily,
    padding: cs.padding,
    borderColor: rgbToHex(cs.borderColor)
  });
"
```

Compare each returned value against the manifest's `resolved` field for the expected token. A match means the element correctly uses that token. A mismatch means either a hardcoded value, a wrong token, or a cascade override.

## T2-contrast: WCAG Contrast Verification

Verify that fg/bg token pairs meet WCAG AA contrast ratios in the actual browser.

```bash
agent-browser eval "
  function luminance(r,g,b) {
    const [R,G,B] = [r,g,b].map(c => { c /= 255; return c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4); });
    return 0.2126*R + 0.7152*G + 0.0722*B;
  }
  function cr(fg,bg) {
    const l1 = luminance(...fg), l2 = luminance(...bg);
    return ((Math.max(l1,l2)+0.05) / (Math.min(l1,l2)+0.05)).toFixed(2);
  }
  const body = getComputedStyle(document.body);
  const bgRgb = body.backgroundColor.match(/\\d+/g).map(Number);
  const fgRgb = body.color.match(/\\d+/g).map(Number);
  JSON.stringify({ contrast: cr(fgRgb, bgRgb), fg: body.color, bg: body.backgroundColor });
"
```

**WCAG AA thresholds:**
- Normal text (< 18px, or < 14px bold): >= 4.5:1
- Large text (>= 18px, or >= 14px bold): >= 3.0:1
- Non-text (icons, borders, focus rings): >= 3.0:1

Use the manifest's `contrastPairs` array to know which pairs to check. Each pair has pre-resolved `fgHex` and `bgHex` for reference.

## T2-drift: Sweep for Hardcoded Values

Scan visible elements and flag any whose computed color doesn't correspond to a known token value.

```bash
agent-browser eval "
  function rgbToHex(rgb) {
    const m = rgb.match(/\\d+/g);
    if (!m) return rgb;
    return '#' + m.slice(0,3).map(n => (+n).toString(16).padStart(2,'0')).join('');
  }
  const els = document.querySelectorAll('body *:not(script):not(style):not(svg):not(path):not(link):not(meta)');
  const seen = new Set();
  const issues = [];
  for (const el of Array.from(els).slice(0, 200)) {
    const cs = getComputedStyle(el);
    const bg = cs.backgroundColor;
    const color = cs.color;
    if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
      const hex = rgbToHex(bg);
      const key = el.tagName + '.' + el.className.toString().slice(0,20) + ':bg:' + hex;
      if (!seen.has(key)) { seen.add(key); issues.push({ tag: el.tagName, class: el.className.toString().slice(0,30), prop: 'background-color', hex }); }
    }
    const colorHex = rgbToHex(color);
    const colorKey = el.tagName + '.' + el.className.toString().slice(0,20) + ':color:' + colorHex;
    if (!seen.has(colorKey)) { seen.add(colorKey); issues.push({ tag: el.tagName, class: el.className.toString().slice(0,30), prop: 'color', hex: colorHex }); }
  }
  JSON.stringify(issues.slice(0, 30));
"
```

Compare each `hex` value against the manifest's resolved values. Any hex that doesn't match ANY token's `resolved` value is a potential hardcoded value. Exceptions:
- `rgba(0, 0, 0, 0)` / `transparent` (already filtered)
- Values from `color-mix()` that are tints of a token value (valid usage)
- Browser defaults on elements you didn't style (e.g. `rgb(0, 0, 238)` on unvisited links)

## Token Violation Classifications

Extends the existing bug taxonomy:

| Classification | Symptom | Diagnosis | Fix approach |
|---|---|---|---|
| **hardcoded-value** | Element's computed color doesn't match any token's resolved value | T2-drift sweep finds unmatched hex | Replace raw value with `var(--token-name)` in CSS |
| **wrong-layer** | Element uses a primitive token directly instead of its semantic wrapper | T2-token check shows correct hex but code uses `var(--color-warm-100)` instead of `var(--bg-primary)` | Replace primitive reference with semantic token |
| **contrast-fail** | fg/bg token pair doesn't meet WCAG AA ratio | T2-contrast returns ratio < 4.5 (or < 3.0 for large text) | Adjust primitive value in tokens/primitives.json, or choose a different semantic token |

Note: `wrong-layer` requires reading the source CSS, not just computed values (computed values are identical for `var(--bg-primary)` and `var(--color-warm-100)` since one resolves to the other). Flag this during code review after the edit, not during browser verification.

## Alias Deprecation

If a T2 check shows an element using a value that matches an `alias`-layer token but the source CSS uses the alias name (e.g. `var(--bg)` instead of `var(--bg-primary)`), note it as a soft warning. Aliases work but should be migrated to semantic names in new code.
