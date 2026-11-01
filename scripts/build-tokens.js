import { readdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { build } from '@lacrx/design-system';

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
    console.log(`  Added ${Object.keys(aliases).length} legacy aliases`);
  }
}

console.log(`\nDone. Built tokens for: ${sites.join(', ')}`);
