#!/usr/bin/env node

/**
 * Captures screenshots of all data-viz elements for use as loading placeholders.
 *
 * Usage:
 *   SITE=stoside npm run capture:placeholders
 *
 * Prerequisites:
 *   1. Build the site first: SITE=stoside gatsby build
 *   2. Serve it: gatsby serve (runs on port 9000)
 *
 * Or point at a running dev server:
 *   CAPTURE_URL=http://localhost:8000 npm run capture:placeholders
 */

const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const SITE = process.env.SITE ?? "stoside";
const BASE_URL = process.env.CAPTURE_URL ?? "http://localhost:9000";
const OUT_DIR = path.resolve(__dirname, `../static/viz-placeholders/${SITE}`);
const VIEWPORT = { width: 1280, height: 800 };
const THEMES = ["light", "dark"];

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function waitForReady(page, selector, timeout = 15000) {
  try {
    await page.waitForSelector(`${selector}[data-viz-ready="true"]`, { timeout });
    return true;
  } catch {
    return false;
  }
}

async function setTheme(page, theme) {
  await page.emulateMediaFeatures([
    { name: "prefers-color-scheme", value: theme },
  ]);
  await page.evaluate((t) => {
    document.documentElement.setAttribute("data-theme", t);
  }, theme);
  await new Promise((r) => setTimeout(r, 300));
}

async function captureDashboard(page, url, dashboardType) {
  console.log(`  Dashboard: ${dashboardType} (${url})`);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

  // Wait for dashboard to render (data fetch + chart render)
  const dashSelector = '[class*="dashboard"]';
  try {
    await page.waitForSelector(dashSelector, { timeout: 30000 });
  } catch {
    console.warn(`    ⚠ Dashboard container not found, skipping`);
    return;
  }

  // Wait for charts/maps to finish rendering
  await new Promise((r) => setTimeout(r, 5000));

  const dashboard = await page.$(dashSelector);
  if (!dashboard) return;

  for (const theme of THEMES) {
    await setTheme(page, theme);
    const suffix = theme === "dark" ? "-dark" : "";
    const outPath = path.join(OUT_DIR, `dashboard-${dashboardType}${suffix}.webp`);

    await dashboard.screenshot({
      path: outPath,
      type: "webp",
      quality: 85,
    });
    console.log(`    ✓ ${path.basename(outPath)}`);
  }
}

async function captureVizBlocks(page, url) {
  console.log(`  Article viz blocks: ${url}`);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 5000));

  // Find all viz containers with data-viz-ready
  const vizElements = await page.$$("[data-viz-ready]");
  if (!vizElements.length) {
    console.log("    No viz blocks found");
    return;
  }

  // Wait for all to be ready
  await page.waitForFunction(
    () => {
      const els = document.querySelectorAll("[data-viz-ready]");
      return Array.from(els).every((el) => el.getAttribute("data-viz-ready") === "true");
    },
    { timeout: 20000 },
  ).catch(() => console.warn("    ⚠ Not all viz blocks reached ready state"));

  // Also check for the wrapper figures with vizId data
  const vizFigures = await page.$$("figure[data-viz-id]");
  const vizContainers = await page.$$('[class*="vizStageContent"]');

  // Capture each viz by finding the closest vizId
  for (const container of vizContainers) {
    const vizId = await container.evaluate((el) => {
      const figure = el.closest("figure");
      return figure?.getAttribute("data-viz-id") ?? null;
    });

    if (!vizId) {
      // Try to get vizId from the ready element inside
      const readyEl = await container.$("[data-viz-ready]");
      if (!readyEl) continue;
      const id = await readyEl.evaluate((el) => {
        const figure = el.closest("figure");
        return figure?.getAttribute("data-viz-id") ?? null;
      });
      if (!id) continue;
    }

    const id = vizId ?? `unknown-${Date.now()}`;

    for (const theme of THEMES) {
      await setTheme(page, theme);
      const suffix = theme === "dark" ? "-dark" : "";
      const outPath = path.join(OUT_DIR, `viz-${id}${suffix}.webp`);

      await container.screenshot({
        path: outPath,
        type: "webp",
        quality: 85,
      });
      console.log(`    ✓ ${path.basename(outPath)}`);
    }
  }
}

async function discoverPages(page) {
  console.log("Discovering pages...");
  // Use the Gatsby 404 page which lists all routes
  await page.goto(`${BASE_URL}/___404`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 3000));

  const allLinks = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("a"))
      .map((a) => a.getAttribute("href"))
      .filter(Boolean);
  });

  const dataLinks = allLinks.filter((h) => h.startsWith("/data/") && h !== "/data/");
  const articleLinks = allLinks.filter((h) => h.startsWith("/articles/"));

  // Deduplicate
  const uniqueData = [...new Set(dataLinks)];
  const uniqueArticles = [...new Set(articleLinks)];

  console.log(`  Found ${uniqueData.length} data pages, ${uniqueArticles.length} articles`);
  return { dataLinks: uniqueData, articleLinks: uniqueArticles };
}

const DASHBOARD_MAP = {
  "permitted-units": "permitted-units",
  "affordable-units": "affordable-units",
  "affordability-map": "affordability-map",
};

async function main() {
  await ensureDir(OUT_DIR);

  console.log(`Capturing placeholders for site: ${SITE}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Output: ${OUT_DIR}\n`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);

  try {
    const { dataLinks, articleLinks } = await discoverPages(page);

    // Capture dashboards
    for (const link of dataLinks) {
      const slug = link.replace(/^\/data\//, "").replace(/\/$/, "");
      const dashboardType = DASHBOARD_MAP[slug];
      if (dashboardType) {
        await captureDashboard(page, `${BASE_URL}${link}`, dashboardType);
      }
    }

    // Capture article viz blocks
    for (const link of articleLinks) {
      await captureVizBlocks(page, `${BASE_URL}${link}`);
    }

    console.log("\nDone!");
  } catch (err) {
    console.error("Capture failed:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
