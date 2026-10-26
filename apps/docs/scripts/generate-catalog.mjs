import { readFileSync, writeFileSync } from 'node:fs';
import { parse } from 'yaml';
import { z } from 'zod';
import { catalogSchema } from '../catalog/schema.mjs';

/**
 * Turns catalog/catalog.yaml into core.md and potential.md. Run it from the repo root:
 * node apps/docs/scripts/generate-catalog.mjs && vp fmt apps/docs
 */

const at = (path) => new URL(path, new URL('../', import.meta.url));

const parsed = catalogSchema.safeParse(parse(readFileSync(at('catalog/catalog.yaml'), 'utf8')));
if (!parsed.success) {
  process.stderr.write(`catalog.yaml doesn't match the schema:\n${z.prettifyError(parsed.error)}\n`);
  process.exit(1);
}
const catalog = parsed.data;

const NOTICE =
  '<!-- Generated from catalog/catalog.yaml by scripts/generate-catalog.mjs. Edit the YAML, not this file. -->';

const STATUS_WORDS =
  '**Status words:** fixed (built on, never swapped), built, decided, default (the pick unless a decision changes it), option, proposed, later, open (needs a decision), reference (to learn from). Steps P1–P12 are the builder phases in the project plan.';

const capitalize = (word) => word.charAt(0).toUpperCase() + word.slice(1);

/** One table cell: one list item per line, pipes escaped, an en dash when empty. */
const cell = (value) => {
  const raw = Array.isArray(value) ? value.join('<br>') : (value ?? '');
  const flat = String(raw).replaceAll('\n', ' ').replaceAll('|', '\\|').trim();
  return flat === '' ? '–' : flat;
};

const table = (head, rows) =>
  [
    `| ${head.join(' | ')} |`,
    `| ${head.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(cell).join(' | ')} |`),
  ].join('\n');

/** Items grouped in the order their groups first appear. */
const byGroup = (items) => {
  const groups = new Map();
  for (const item of items) groups.set(item.group, [...(groups.get(item.group) ?? []), item]);
  return groups;
};

const capabilityName = new Map(catalog.capabilities.map((item) => [item.id, item.name]));
const names = (ids) => ids.map((id) => capabilityName.get(id) ?? id).join(', ');

const capabilityRows = (items) =>
  items.map((item) => [
    item.notes ? `**${item.name}.** ${item.notes}` : `**${item.name}**`,
    item.must,
    item.default,
    item.options,
    capitalize(item.status),
    item.step,
  ]);

const pluginRows = (items, withRuns) =>
  items.map((item) => [
    `**${item.name}**`,
    names(item.provides),
    item.adds,
    ...(withRuns ? [item.runs] : []),
    capitalize(item.status),
    withRuns ? item.step : item.notes,
  ]);

const core = () => {
  const capabilities = catalog.capabilities.filter((item) => item.tier === 'core');
  const plugins = catalog.plugins.filter((item) => item.tier === 'core');
  const parts = [
    '# Capability catalog: core',
    NOTICE,
    'What the builder is made of: the fixed foundations, the core capabilities with what each must do and which providers can fill it, and the plugins that are built or decided. Proposals and ideas are in [potential.md](potential.md). It covers the builder only; host apps such as rhb-cdss keep their own lists.',
    STATUS_WORDS,
    '## Fixed foundations',
    'Built on and never swapped. Everything else is a capability with a default provider.',
    table(
      ['Area', 'Choice', 'Notes'],
      catalog.foundations.map((item) => [item.area, item.choice, item.notes]),
    ),
    '## Core capabilities',
    'Each always exists in the app. "Must" is what any provider has to keep working; the default is what gets built first.',
  ];
  for (const [group, items] of byGroup(capabilities)) {
    parts.push(
      `### ${group}`,
      table(
        ['Capability', 'Must', 'Default', 'Can be swapped or extended with', 'Status', 'Step'],
        capabilityRows(items),
      ),
    );
  }
  parts.push(
    '## Plugins built or decided',
    'What each plugin provides (the core capabilities it can fill) and what it adds on top.',
    table(['Plugin', 'Provides', 'Adds', 'Runs', 'Status', 'Step'], pluginRows(plugins, true)),
  );
  return `${parts.join('\n\n')}\n`;
};

const potential = () => {
  const capabilities = catalog.capabilities.filter((item) => item.tier === 'potential');
  const plugins = catalog.plugins.filter((item) => item.tier === 'potential');
  const parts = [
    '# Capability catalog: potential',
    NOTICE,
    "Capabilities, plugins and patterns under consideration: nothing here is planned until it moves to [core.md](core.md). Domain packages, such as rhb-cdss's body map, belong to their host app and aren't listed.",
    STATUS_WORDS,
    '## Capabilities that could be added',
    table(
      ['Capability', 'What it adds', 'Candidates', 'Status'],
      capabilities.map((item) => [`**${item.name}**`, item.adds, item.candidates, capitalize(item.status)]),
    ),
    '## Plugins and integrations under consideration',
    'What each could provide (core or potential capabilities it can fill) and what it adds on top.',
  ];
  for (const [group, items] of byGroup(plugins)) {
    parts.push(
      `### ${group}`,
      table(['Plugin', 'Provides', 'Adds', 'Status', 'Notes'], pluginRows(items, false)),
    );
  }
  parts.push(
    '## Patterns and references',
    'Ideas to borrow from other products, not dependencies.',
    table(
      ['Pattern', 'From', 'For', 'Status'],
      catalog.patterns.map((item) => [
        item.name,
        `[${item.source}](${item.url})`,
        item.use,
        capitalize(item.status),
      ]),
    ),
  );
  return `${parts.join('\n\n')}\n`;
};

writeFileSync(at('core.md'), core());
writeFileSync(at('potential.md'), potential());
