import type { GatsbyConfig } from "gatsby";
import ncyimbyConfig from "./sites/ncyimby/config";
import stosideConfig from "./sites/stoside/config";

const SITE = process.env.SITE || "ncyimby";
const siteConfig = SITE === "stoside" ? stosideConfig : ncyimbyConfig;

const config: GatsbyConfig = {
  jsxRuntime: "automatic",
  plugins: [
    "gatsby-plugin-image",
    "gatsby-plugin-sharp",
    "gatsby-transformer-sharp",
    {
      resolve: "gatsby-source-filesystem",
      options: {
        name: "images",
        path: `${__dirname}/src/assets/images/`,
      },
    },
    {
      resolve: "gatsby-source-filesystem",
      options: {
        name: "visualizations",
        path: `${__dirname}/src/assets/visualizations/`,
      },
    },
    {
      resolve: "gatsby-plugin-manifest",
      options: {
        icon: `${__dirname}/sites/${SITE}/images/favicon.png`,
      },
    },
    {
      resolve: "gatsby-plugin-offline",
      options: {
        appendScript: `${__dirname}/src/sw-cleanup.js`,
        workboxConfig: {
          maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
          globPatterns: ["**/offline-plugin-app-shell-fallback/*.html"],
          skipWaiting: true,
          clientsClaim: true,
          runtimeCaching: [
            { urlPattern: /\.(?:js|css)$/, handler: "CacheFirst" },
            { urlPattern: /\/static\/.*/, handler: "CacheFirst" },
            { urlPattern: /\/tiles\/.*\.pmtiles$/, handler: "CacheFirst" },
            {
              urlPattern:
                /^https:\/\/(demo-bucket\.protomaps\.com|protomaps\.github\.io)\//,
              handler: "CacheFirst",
            },
            {
              urlPattern: /\.(png|jpg|jpeg|svg|webp|avif|gif|woff2?)$/,
              handler: "CacheFirst",
            },
            { urlPattern: /\.html$/, handler: "NetworkFirst" },
            { urlPattern: /\/page-data\/.*\.json$/, handler: "NetworkFirst" },
          ],
        },
      },
    },
  ],
  siteMetadata: {
    title: siteConfig.title,
  },
};

export default config;
