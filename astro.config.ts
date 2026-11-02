import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import path from "node:path";

const SITE = process.env.SITE || "ncyimby";

export default defineConfig({
  output: "static",
  integrations: [react()],
  build: {
    format: "directory",
  },
  image: {
    remotePatterns: [
      { protocol: "https", hostname: "**.strapiapp.com" },
      { protocol: "https", hostname: "cms.stoside.org" },
      { protocol: "https", hostname: "cms.ncyimby.org" },
      { protocol: "https", hostname: "substackcdn.com" },
      { protocol: "https", hostname: "secure.meetupstatic.com" },
    ],
  },
  vite: {
    resolve: {
      alias: {
        "@/site": path.resolve(`./sites/${SITE}`),
        "@": path.resolve("./src"),
      },
    },
  },
});
