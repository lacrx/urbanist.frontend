## Architecture
Multi-site Gatsby project. `SITE` env var (default: `ncyimby`) selects which site to build.
- `sites/<id>/config.ts` holds all site-specific values (branding, nav links, feature flags)
- `sites/<id>/theme.css` holds CSS custom property tokens
- `@/site` webpack alias resolves to `sites/<SITE>/` at build time
- Dev: `SITE=stoside yarn dev` or `SITE=ncyimby yarn dev`
- Build: `SITE=stoside gatsby build`

## Workflow
After completing a code change, commit and push without asking. Deployment pipeline is attached to this repo.

## Knowledge Base
For engineering tasks, fetch from agent-knowledge-docs:
`gh api repos/lacrx/agent-knowledge-docs/contents/{path}?ref=main -H "Accept: application/vnd.github.raw+json"`

Discovery: fetch `QUICK-REF.md` first, find matching row, fetch that path. Fallback to `TOPIC-INDEX.md`.
