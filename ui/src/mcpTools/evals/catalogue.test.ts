// Keeps gen/catalogue.json in step with the tools.
//
// This runs in the ORDINARY test suite, with no model and no backend, because the thing it guards
// is cheap to break and expensive to notice: a description edited in a tool with no regenerated
// catalogue means every eval afterwards judges a surface that is not the one shipping.
//
//   npm run eval:catalogue    regenerate it after changing a name, description or inputSchema

import { readFileSync } from 'fs';
import { catalogueTypes, diffCatalogues, loadCatalogue, writeCatalogue } from '@scality/webmcp-eval/v1';
import { CATALOGUE_PATH, CATALOGUE_TYPES_PATH, buildFromTools, writeCatalogueTypes } from './catalogue';

const WRITE = process.env.EVAL_WRITE_CATALOGUE === '1';

(WRITE ? it : it.skip)('regenerates catalogue.json from the tools', () => {
  const fresh = buildFromTools();
  writeCatalogue(CATALOGUE_PATH, fresh);
  writeCatalogueTypes(fresh);
});

(WRITE ? it.skip : it)('catalogue.json is the surface the tools currently advertise', () => {
  const fresh = buildFromTools();
  const committed = loadCatalogue(CATALOGUE_PATH);

  if (committed.digest === fresh.digest) return;

  // The diff rather than a digest mismatch: "sha256:a1b2… is not sha256:c3d4…" tells whoever reads
  // the failure nothing about what to re-read, which is the entire reason the file exists.
  throw new Error(
    `gen/catalogue.json is out of date — the tools moved: ${diffCatalogues(committed, fresh).summary}\n` +
      '  run `npm run eval:catalogue`, then review the description diff it produces — a scenario\n' +
      '  written against the old wording may still pass while testing something else.',
  );
});

// The digest check above cannot see this file: gen/toolArguments.d.ts is derived from the json, so
// a regeneration that wrote one and not the other leaves a mock typed against tools that moved —
// and it would still compile, which is why it needs a check of its own.
(WRITE ? it.skip : it)('gen/toolArguments.d.ts was regenerated with it', () => {
  const expected = catalogueTypes(loadCatalogue(CATALOGUE_PATH), 'MetalK8sToolArguments');

  if (readFileSync(CATALOGUE_TYPES_PATH, 'utf8') === expected) return;

  throw new Error(
    'gen/toolArguments.d.ts is out of date with catalogue.json — run `npm run eval:catalogue`.\n' +
      '  Until it is, a mock is type-checked against a tool surface that has moved.',
  );
});
