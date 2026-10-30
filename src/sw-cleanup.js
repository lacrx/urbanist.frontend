// Appended to the generated service worker by gatsby-plugin-offline's
// appendScript option. On SW activation (fires once per deploy, after a
// new sw.js is fetched and takes over), delete Workbox's runtime cache
// so cached JS chunks from the previous build don't keep being served.
// The precache cache is left alone -- Workbox manages its lifecycle
// separately and it's tiny.
//
// Without this, a rename like poster.png -> poster.jpg leaves the old
// chunk (which has the .png URL compiled into it) cached forever, and
// every page navigation that loads that chunk 404s trying to fetch the
// deleted asset.

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.includes("runtime"))
          .map((name) => caches.delete(name))
      );
    })()
  );
});
