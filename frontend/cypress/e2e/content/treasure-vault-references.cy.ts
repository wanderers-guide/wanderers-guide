import { z } from 'zod';
import { AbilityBlockSchema, ContentSourceSchema, ItemSchema, TraitSchema } from '../../../src/schemas/content';

/**
 * Check two finite official item descriptions through anonymous catalog drawers and real public reads.
 * No accounts, inventory, response stubs, or application/cache injection are used.
 * Exact IDs below are independent expectations, not inferred from fetched markup.
 */
type Reference = {
  label: string;
  type: 'item' | 'trait' | 'action' | 'feat';
  id: number;
  title: string;
  sourceId: number;
};
type ParagraphWitness = { prefix: string; references: Reference[]; generatedLabels?: string[] };
type CatalogWitness = {
  id: number;
  title: string;
  citation: string;
  paragraphs: ParagraphWitness[];
};

const solar: CatalogWitness = {
  id: 12426,
  title: 'Solar Shellflower',
  citation: 'https://2e.aonprd.com/Equipment.aspx?ID=1892',
  paragraphs: [
    {
      prefix: 'This +1 striking flintlock musket features',
      references: [
        { label: '+1', type: 'item', id: 7950, title: 'Weapon Potency (+1)', sourceId: 7 },
        { label: 'striking', type: 'item', id: 7862, title: 'Striking', sourceId: 7 },
        { label: 'flintlock musket', type: 'item', id: 13574, title: 'Flintlock Musket', sourceId: 17 },
        { label: 'solar shellflower', type: 'item', id: 12426, title: 'Solar Shellflower', sourceId: 16 },
        { label: 'fire', type: 'trait', id: 1542, title: 'Fire', sourceId: 3 },
      ],
    },
    {
      prefix: 'Activate',
      references: [
        { label: 'manipulate', type: 'trait', id: 1433, title: 'Manipulate', sourceId: 3 },
        { label: 'solar shellflower', type: 'item', id: 12426, title: 'Solar Shellflower', sourceId: 16 },
        { label: 'Strike', type: 'action', id: 19856, title: 'Strike', sourceId: 3 },
        { label: 'solar shellflower', type: 'item', id: 12426, title: 'Solar Shellflower', sourceId: 16 },
        { label: 'fire', type: 'trait', id: 1542, title: 'Fire', sourceId: 3 },
        { label: 'fire', type: 'trait', id: 1542, title: 'Fire', sourceId: 3 },
      ],
      /** Runtime condition links surround the existing Fire link; no stored condition markup. */
      generatedLabels: [
        'manipulate',
        'solar shellflower',
        'Strike',
        'solar shellflower',
        'fire',
        'persistent',
        'fire',
        'damage',
      ],
    },
    {
      prefix: 'The solar shellflower usually requires',
      references: [{ label: 'solar shellflower', type: 'item', id: 12426, title: 'Solar Shellflower', sourceId: 16 }],
    },
  ],
};

const blade: CatalogWitness = {
  id: 11768,
  title: 'Blade Byrnie (Greater)',
  citation: 'https://2e.aonprd.com/Equipment.aspx?ID=4376',
  paragraphs: [
    {
      prefix: 'Instead of chain links, this +2 resilient chain shirt',
      references: [
        { label: '+2', type: 'item', id: 6720, title: 'Armor Potency (+2)', sourceId: 7 },
        { label: 'resilient', type: 'item', id: 7703, title: 'Resilient', sourceId: 7 },
        { label: 'chain shirt', type: 'item', id: 6779, title: 'Chain Shirt', sourceId: 1 },
      ],
    },
    {
      prefix: 'Activate',
      references: [{ label: 'manipulate', type: 'trait', id: 1433, title: 'Manipulate', sourceId: 3 }],
    },
    {
      prefix: 'Effect You pull a link from the armor',
      references: [
        { label: '+2', type: 'item', id: 7951, title: 'Weapon Potency (+2)', sourceId: 7 },
        { label: 'greater striking', type: 'item', id: 7860, title: 'Striking (Greater)', sourceId: 7 },
        { label: 'Dagger', type: 'item', id: 6854, title: 'Dagger', sourceId: 1 },
        { label: 'dagger', type: 'item', id: 6854, title: 'Dagger', sourceId: 1 },
        { label: 'Strike', type: 'action', id: 19856, title: 'Strike', sourceId: 3 },
        { label: 'Strike', type: 'action', id: 19856, title: 'Strike', sourceId: 3 },
        { label: 'blade byrnie', type: 'item', id: 11768, title: 'Blade Byrnie (Greater)', sourceId: 16 },
        { label: 'Interact', type: 'action', id: 19733, title: 'Interact', sourceId: 3 },
        { label: 'Quick Draw', type: 'feat', id: 20441, title: 'Quick Draw', sourceId: 1 },
      ],
    },
    {
      prefix: 'Upgrading the runes on the blade byrnie',
      references: [
        { label: 'blade byrnie', type: 'item', id: 11768, title: 'Blade Byrnie (Greater)', sourceId: 16 },
        { label: 'daggers', type: 'item', id: 6854, title: 'Dagger', sourceId: 1 },
        { label: 'daggers', type: 'item', id: 6854, title: 'Dagger', sourceId: 1 },
        { label: '+3 weapon potency', type: 'item', id: 7952, title: 'Weapon Potency (+3)', sourceId: 7 },
        { label: '+3 armor potency', type: 'item', id: 6721, title: 'Armor Potency (+3)', sourceId: 7 },
      ],
    },
  ],
};

const sourceTitles: ReadonlyMap<number, string> = new Map([
  [1, 'Player Core'],
  [3, 'Common Core'],
  [7, 'GM Core'],
  [16, 'Treasure Vault'],
  [17, 'Guns & Gears'],
]);
const drawerSelector: string = '.mantine-Drawer-content';
const readEndpoints: ReadonlySet<string> = new Set([
  'find-content-source',
  'find-item',
  'find-trait',
  'find-ability-block',
  'get-content-versions',
]);
const normalizeText = (text: string): string => text.replace(/\s+/g, ' ').trim();

/** Select only independently identified description paragraphs, excluding rune badges and trait chips. */
const paragraph = (witness: ParagraphWitness): Cypress.Chainable<JQuery<HTMLElement>> =>
  cy
    .get(`${drawerSelector} .mantine-ScrollArea-viewport p`)
    .filter((_index, element) => normalizeText(element.textContent ?? '').startsWith(witness.prefix))
    .should('have.length', 1);

/** Build a fresh whole-paragraph query for an exact repeated prose reference. */
const proseAnchor = (
  entry: ParagraphWitness,
  label: string,
  occurrence: number
): Cypress.Chainable<JQuery<HTMLElement>> =>
  paragraph(entry)
    .find('a')
    .filter((_index, element) => normalizeText(element.textContent ?? '') === label)
    .eq(occurrence);

const title = (expected: string): Cypress.Chainable<JQuery<HTMLElement>> =>
  cy
    .get(`${drawerSelector} .mantine-Drawer-header h3`, { timeout: 30000 })
    .should(($header) => {
      expect(normalizeText($header.text())).to.eq(expected);
    })
    .should('be.visible');

describe('Finite Treasure Vault catalog reference witnesses', { testIsolation: true }, () => {
  let authorization: string;

  /** Use the owned harness's actual public anonymous credential; observe without replacing requests. */
  beforeEach(() => {
    const key: unknown = Cypress.env('publicAnonKey');
    if (typeof key !== 'string' || key.length === 0)
      throw new Error('The owned harness must provide its actual public anonymous key');
    const parts: string[] = key.split('.');
    expect(parts.length, 'actual public JWT component count').to.eq(3);
    const payload: unknown = JSON.parse(Cypress.Buffer.from(parts[1], 'base64').toString('utf8'));
    z.object({ role: z.literal('anon') }).parse(payload);
    authorization = `Bearer ${key}`;
    const functionsUrl: string = String(Cypress.env('functions_url'));
    expect(new URL(functionsUrl).pathname).to.eq('/functions/v1');
    cy.intercept(`${functionsUrl}/**`, (request) => {
      if (request.method === 'OPTIONS') return request.continue();
      const endpoint: string = new URL(request.url).pathname.split('/').pop() ?? '';
      expect(request.method, 'catalog-only API method').to.eq('POST');
      expect(readEndpoints.has(endpoint), `catalog-only endpoint ${endpoint}`).to.eq(true);
      const header: unknown = request.headers.authorization;
      if (typeof header !== 'string' || header !== authorization)
        throw new Error('An App read did not use the owned public anonymous credential');
      request.continue();
    });
    const origin: string = new URL(functionsUrl).origin;
    for (const path of ['auth/v1', 'rest/v1']) {
      cy.intercept(`${origin}/${path}/**`, (request) => {
        expect(['GET', 'HEAD', 'OPTIONS'].includes(request.method), 'no Auth/catalog/account writes').to.eq(true);
        request.continue();
      });
    }
  });

  /** Schema-parse real public reads; cy.request does not fake or inject application responses. */
  const readRows = <T>(endpoint: string, body: Record<string, unknown>, schema: z.ZodType<T>): Cypress.Chainable<T[]> =>
    cy
      .then(() => {
        if (!readEndpoints.has(endpoint)) throw new Error('Only the reviewed public read endpoints are permitted');
        return cy.request({
          method: 'POST',
          url: `${Cypress.env('functions_url')}/${endpoint}`,
          headers: { Authorization: authorization },
          body,
          log: false,
          retryOnNetworkFailure: false,
          retryOnStatusCodeFailure: false,
        });
      })
      .then((response) => {
        expect(response.status).to.eq(200);
        return z.object({ status: z.literal('success'), data: z.array(schema) }).parse(response.body).data;
      });

  const validateCatalog = (witness: CatalogWitness): void => {
    const references: Reference[] = witness.paragraphs.flatMap((entry) => entry.references);
    const sources: number[] = [...new Set(references.map((entry) => entry.sourceId))];
    /** Read the ordinary published/non-homebrew list even when the App legitimately uses warm cache. */
    readRows('find-content-source', { homebrew: false, published: true }, ContentSourceSchema).then((rows) => {
      expect(new Set(rows.map((row) => row.id)).size, 'unique actual public source IDs').to.eq(rows.length);
      const required = rows.filter((row) => sources.includes(row.id));
      expect(required.map((row) => row.id).sort((a, b) => a - b)).to.deep.eq([...sources].sort((a, b) => a - b));
      for (const row of required) {
        expect(row.name, `source title ${row.id}`).to.eq(sourceTitles.get(row.id));
        expect(row.user_id).to.eq(null);
        expect(row.is_published).to.eq(true);
        expect(row.require_key).to.eq(false);
      }
    });
    readRows('find-item', { id: [witness.id] }, ItemSchema).then((rows) => {
      expect(rows).to.have.length(1);
      const owner = rows[0];
      expect(owner.id).to.eq(witness.id);
      expect(owner.name).to.eq(witness.title);
      expect(owner.content_source_id).to.eq(16);
      expect(owner.meta_data?.source?.url).to.eq(witness.citation);
      const stored = [...owner.description.matchAll(/\[([^\]\n]+)\]\(link_(item|trait|action|feat)_(\d+)\)/g)].map(
        (match) => ({ label: match[1], type: match[2], id: Number(match[3]) })
      );
      expect(stored, 'every independent stored reference in description order').to.deep.eq(
        references.map(({ label, type, id }) => ({ label, type, id }))
      );
      expect(owner.description.match(/<abbr cost="ONE-ACTION" class="action-symbol">1<\/abbr>/g)).to.have.length(1);
      expect(owner.description.includes('link_condition_'), 'conditions remain runtime-generated').to.eq(false);
      if (witness.id === 12426)
        expect(owner.description.includes('link_action_19733'), 'Solar is not legacy Interact').to.eq(false);
    });
    for (const type of ['item', 'trait', 'ability-block'] as const) {
      const expected: Reference[] = references.filter((entry) =>
        type === 'ability-block' ? entry.type === 'action' || entry.type === 'feat' : entry.type === type
      );
      const unique: Reference[] = [...new Map(expected.map((entry) => [entry.id, entry])).values()];
      const validateRows = (rows: { id: number; name: string; content_source_id: number; type?: string }[]): void => {
        expect(rows.map((row) => row.id).sort((a, b) => a - b)).to.deep.eq(
          unique.map((entry) => entry.id).sort((a, b) => a - b)
        );
        for (const entry of unique) {
          const row = rows.find((candidate) => candidate.id === entry.id);
          if (!row) throw new Error(`Missing genuine target ${type}:${entry.id}`);
          expect(row.name, `target title ${type}:${entry.id}`).to.eq(entry.title);
          expect(row.content_source_id, `target source ${type}:${entry.id}`).to.eq(entry.sourceId);
          if (type === 'ability-block') expect(row.type).to.eq(entry.type);
        }
      };
      if (type === 'item')
        readRows('find-item', { id: unique.map((entry) => entry.id) }, ItemSchema).then(validateRows);
      if (type === 'trait')
        readRows('find-trait', { id: unique.map((entry) => entry.id) }, TraitSchema).then(validateRows);
      if (type === 'ability-block')
        readRows('find-ability-block', { id: unique.map((entry) => entry.id) }, AbilityBlockSchema).then(validateRows);
    }
  };

  /** Verify all repetitions in prose and open every stored occurrence, including same-label destinations. */
  const verifyViewport = (witness: CatalogWitness, viewport: 'desktop' | 'narrow'): void => {
    if (viewport === 'desktop') cy.viewport(1280, 900);
    else cy.viewport(390, 844);
    title(witness.title);
    cy.get(drawerSelector).should(($drawer) => {
      const bounds: DOMRect = $drawer[0].getBoundingClientRect();
      expect(bounds.width).to.be.greaterThan(0);
      expect(bounds.height).to.be.greaterThan(0);
      expect(bounds.right).to.be.at.most(viewport === 'desktop' ? 1281 : 391);
    });
    for (const entry of witness.paragraphs) {
      const labels: string[] = entry.generatedLabels ?? entry.references.map((reference) => reference.label);
      paragraph(entry)
        .find('a')
        .should(($anchors) => {
          expect(
            [...$anchors].map((anchor) => normalizeText(anchor.textContent ?? '')),
            entry.prefix
          ).to.deep.eq(labels);
          for (const anchor of $anchors)
            expect(anchor.hasAttribute('href'), 'internal drawer link does not navigate externally').to.eq(false);
        });
      if (entry.prefix === 'Activate')
        paragraph(entry).find('abbr.action-symbol').should('have.length', 1).and('have.text', '1');
      for (const reference of entry.references) {
        const occurrence: number = entry.references
          .slice(0, entry.references.indexOf(reference))
          .filter((prior) => prior.label === reference.label).length;
        proseAnchor(entry, reference.label, occurrence).scrollIntoView();
        /** Scrolling can replace the subject, so query the current DOM again before clicking. */
        proseAnchor(entry, reference.label, occurrence).should('be.visible').click();
        title(reference.title);
        cy.get(`${drawerSelector} button[aria-label="Go back to previous drawer"]`).should('be.visible').click();
        title(witness.title);
      }
    }
    cy.get(`${drawerSelector} .mantine-ScrollArea-viewport`).scrollTo('top', { ensureScrollable: false });
    /** Outside within(): Cypress 13 otherwise replaces the screenshot subject with its within root. */
    cy.document().screenshot(`catalog-${witness.id}-${viewport}-top`, { capture: 'viewport' });
    cy.get(`${drawerSelector} .mantine-ScrollArea-viewport`).scrollTo('bottom', { ensureScrollable: false });
    cy.document().screenshot(`catalog-${witness.id}-${viewport}-bottom`, { capture: 'viewport' });
  };

  for (const witness of [solar, blade]) {
    it(`opens every exact ${witness.title} prose reference on desktop and narrow`, () => {
      cy.viewport(1280, 900);
      cy.visit(`/?open=link_item_${witness.id}`);
      title(witness.title);
      validateCatalog(witness);
      verifyViewport(witness, 'desktop');
      verifyViewport(witness, 'narrow');
      cy.get(`${drawerSelector} button[aria-label="Close drawer"]`).should('be.visible').click();
      cy.get(drawerSelector).should('not.exist');
    });
  }
});
