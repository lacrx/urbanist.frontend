# Site Token Profiles

Per-site enforcement rules for token verification. Read alongside the site's DESIGN.md for full context. This file focuses on what to check and what constitutes a violation.

## ncyimby (NC YIMBY)

**Prod:** https://ncyimby.org
**Dev with data:** `STRAPI_URL=https://cms.ncyimby.org SITE=ncyimby gatsby develop`

**Palette:** Warm only. All color tokens are in the `--color-warm-*` family, plus `--color-neutral-200` (a warm tan, not a cool gray). One status color: `--color-status-error`.

**Color constraint:** No cool tones. If any computed color on a non-error element has a blue channel significantly higher than its red channel, that is a violation. Everything stays in the amber/orange/brown family.

**No dark mode.** No dark theme variant exists or should be created.

**No dashboard tokens.** `--dash-*` and `--severity-*` tokens do not exist in this site. If code references them, it will fall through to browser defaults (a bug).

**Key token values:**
| Token | Resolved | Role |
|---|---|---|
| `--bg-primary` | `#ffe8cc` | Page background (cream) |
| `--bg-surface` | `#f5deb3` | Card surface, hover |
| `--text-primary` | `#5b2800` | Body text (deep brown) |
| `--text-secondary` | `#7a4e20` | Secondary text |
| `--text-muted` | `#a07850` | Captions, placeholders |
| `--accent-primary` | `#a63d00` | Buttons, links (burnt orange) |
| `--btn-text` | `#ffe8cc` | Button label on accent bg |
| `--border-default` | `#d4b896` | Rules, dividers (warm tan) |

**Legacy aliases still active:** `--bg`, `--text`, `--accent`, `--accent-btn`, `--rule`, `--black`, `--grey`, `--light-grey`, `--serif`, `--sans`. Functional but should be migrated in new code.

**Forbidden:** Cool blues, cool grays, shadows, gradients, dark mode, rounded corners beyond `--radius-sm`/`--radius-md`.

---

## stoside (Strong Towns Oceanside)

**Prod:** https://stoside.org
**Dev with data:** `STRAPI_URL=https://cms.stoside.org SITE=stoside gatsby develop`

**Palette:** Strictly monochrome base. All non-dashboard color tokens in `--color-neutral-*` family (white through near-black).

**Color constraint:** Color is permitted ONLY in dashboard/data-viz contexts via `--dash-*` and `--severity-*` tokens. If a non-dashboard element (article text, nav, buttons, cards, headings) uses any chromatic color, that is a violation. Charts get color; everything else stays monochrome.

**No dark mode.** The monochrome palette IS the identity.

**Dashboard tokens (only for data pages):**
| Token | Resolved | Role |
|---|---|---|
| `--dash-accent` | `#2563eb` | Primary chart color, interactive |
| `--dash-positive` | `#16a34a` | Good/increase indicators |
| `--dash-negative` | `#dc2626` | Bad/decrease indicators |
| `--dash-neutral` | `#9ca3af` | Inactive, baseline |
| `--dash-surface` | `#f9fafb` | Dashboard card backgrounds |

**Severity tokens (dashboards/reports):**
| Token | Resolved | Role |
|---|---|---|
| `--severity-safe` | `#2a8a6a` | Good/safe conditions |
| `--severity-caution` | `#b07820` | Concerns/moderate issues |
| `--severity-danger` | `#c44020` | Unsafe/poor conditions |
| `--severity-connected` | `#3db893` | Connected/active indicator |

**Key base tokens:**
| Token | Resolved | Role |
|---|---|---|
| `--bg-primary` | `#ffffff` | Page background (white) |
| `--bg-surface` | `#f3f4f6` | Card surface, hover |
| `--text-primary` | `#121212` | Body text (near-black) |
| `--text-secondary` | `#333333` | Secondary text |
| `--text-muted` | `#767676` | Captions, placeholders |
| `--accent-primary` | `#121212` | Buttons, links (monochrome) |
| `--btn-text` | `#ffffff` | Button label on dark bg |
| `--border-default` | `#e2e2e2` | Rules, dividers |

**Has `--font-mono`** (`SF Mono, Cascadia Code, ui-monospace, monospace`) for dashboard data tables and statistics. ncyimby does not have this token.

**Legacy aliases:** `--bg`, `--text`, `--accent`, `--accent-btn`, `--rule`, `--black`, `--grey`, `--light-grey`, `--dark-grey`, `--serif`, `--sans`, `--dash-mono`.

**Forbidden:** Chromatic colors outside dashboard context, rounded corners on buttons, drop shadows, gradients. The stark, newspaper-like authority is intentional.
