# Self-hosted basemap tiles

The 3D choropleth viz pulls its basemap from `oceanside.pmtiles` in this
directory. Gatsby's `static/` folder copies anything inside it verbatim
into `public/`, so the file is served at `https://stoside.org/tiles/oceanside.pmtiles`
after deploy — same origin as the app, no CORS handshake.

## How to regenerate

1. Open Protomaps' Small Extract tool: <https://app.protomaps.com/downloads/small>
2. Pan/zoom to the Oceanside area and set the bounding box to roughly:
   - West: `-117.42`
   - South: `33.15`
   - East: `-117.22`
   - North: `33.29`
   (Covers all of Oceanside plus a margin of ocean / Vista / Carlsbad so
   the map doesn't clip when the user pans slightly.)
3. Zoom range: **10 – 15** (matches what the viz renders; past zoom 15 the
   choropleth parcels lose context anyway).
4. Download the generated `.pmtiles` file.
5. Save it to this directory as `oceanside.pmtiles`, overwriting the old
   copy if present.
6. Commit, push, deploy. CloudFront's existing `Cache-Control: public,
   max-age=31536000, immutable` header on `/tiles/*` means returning
   users never re-fetch.

Expected file size: **3 – 10 MB**. If it's noticeably larger, you either
grabbed a bigger bbox or included zooms past 15.

## Env var override

If you want to point at a different URL (CloudFront, another CDN, a dev
tileset), set `GATSBY_BASEMAP_PMTILES_URL` at build time. The renderer
reads it with a `/tiles/oceanside.pmtiles` default.

## What happens when the file is missing

MapLibre logs a 404 for the PMTiles source. The basemap layers stay
blank but the deck.gl extrusions still render on a white background,
so the viz degrades gracefully rather than crashing.
