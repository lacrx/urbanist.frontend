import { readdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

let build;
try {
  ({ build } = await import('@lacrx/design-system'));
} catch {
  console.log('⚠ @lacrx/design-system not installed — using pre-built theme.css files');
  process.exit(0);
}

function buildTokenManifest(themePath, site) {
  const css = readFileSync(themePath, 'utf8');
  const tokens = {};
  const varRegex = /\s+--([\w-]+):\s*(.+?);/g;
  let match;

  while ((match = varRegex.exec(css)) !== null) {
    const name = `--${match[1]}`;
    const raw = match[2].trim();
    tokens[name] = { raw };
  }

  const aliasStart = css.indexOf('/* Legacy aliases');
  for (const [name, entry] of Object.entries(tokens)) {
    const varMatch = entry.raw.match(/^var\((--[\w-]+)\)/);
    if (varMatch) {
      entry.references = varMatch[1];
      const pos = css.indexOf(`${name}:`);
      entry.layer = pos > aliasStart && aliasStart !== -1 ? 'alias' : 'semantic';
    } else {
      entry.references = null;
      entry.layer = 'primitive';
    }
  }

  function resolveToFinal(name, depth = 0) {
    if (depth > 10) return null;
    const entry = tokens[name];
    if (!entry) return null;
    if (!entry.references) return entry.raw;
    return resolveToFinal(entry.references, depth + 1);
  }

  const resolved = {};
  for (const name of Object.keys(tokens)) {
    resolved[name] = resolveToFinal(name) || tokens[name].raw;
  }

  for (const [name, entry] of Object.entries(tokens)) {
    entry.resolved = resolved[name];
    entry.value = entry.raw;
    delete entry.raw;
  }

  const contrastPairs = [];
  const fgBgPairs = [
    ['--text-primary', '--bg-primary'],
    ['--text-secondary', '--bg-primary'],
    ['--text-muted', '--bg-primary'],
    ['--btn-text', '--accent-primary'],
  ];
  if (tokens['--status-error-text'] && tokens['--status-error-surface']) {
    fgBgPairs.push(['--status-error-text', '--status-error-surface']);
  }

  for (const [fg, bg] of fgBgPairs) {
    if (tokens[fg] && tokens[bg]) {
      contrastPairs.push({
        fg,
        bg,
        fgHex: tokens[fg].resolved,
        bgHex: tokens[bg].resolved,
      });
    }
  }

  const manifest = {
    tokens,
    contrastPairs,
    site,
    generated: new Date().toISOString(),
  };

  const manifestPath = themePath.replace('theme.css', 'token-manifest.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(
    `  Generated token-manifest.json (${Object.keys(tokens).length} tokens, ${contrastPairs.length} contrast pairs)`,
  );
}

const sitesDir = join(process.cwd(), 'sites');
const sites = readdirSync(sitesDir).filter((name) => {
  const tokensDir = join(sitesDir, name, 'tokens');
  return existsSync(tokensDir);
});

if (sites.length === 0) {
  console.log('No sites with tokens/ directories found.');
  process.exit(0);
}

for (const site of sites) {
  console.log(`\nBuilding tokens for ${site}...`);

  await build({
    source: join('sites', site, 'tokens'),
    output: join('sites', site),
    filename: 'theme.css',
  });

  const aliasPath = join(sitesDir, site, 'aliases.json');
  if (existsSync(aliasPath)) {
    const aliases = JSON.parse(readFileSync(aliasPath, 'utf8'));
    const themePath = join(sitesDir, site, 'theme.css');
    let css = readFileSync(themePath, 'utf8');

    const aliasLines = Object.entries(aliases)
      .filter(([oldName, newName]) => oldName !== newName)
      .map(([oldName, newName]) => `  --${oldName}: var(--${newName});`)
      .join('\n');

    css = css.replace(
      /\}(\s*)$/,
      `\n  /* Legacy aliases (remove after migration) */\n${aliasLines}\n}$1`,
    );

    writeFileSync(themePath, css);
    const filtered = Object.entries(aliases).filter(([o, n]) => o !== n);
    console.log(`  Added ${filtered.length} legacy aliases`);
  }

  const themePath = join(sitesDir, site, 'theme.css');
  buildTokenManifest(themePath, site);
}

console.log(`\nDone. Built tokens for: ${sites.join(', ')}`);
