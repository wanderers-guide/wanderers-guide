import { ContentUpdate } from '../../../src/schemas/content';

const actor = '00000000-0000-4000-8000-000000000069';
const source = {
  id: 906900,
  created_at: '',
  updated_at: '2026-10-05T00:00:00Z',
  name: 'Content Review Fixture',
  foundry_id: null,
  url: null,
  description: '',
  operations: null,
  user_id: null,
  contact_info: null,
  require_key: false,
  keys: null,
  is_published: true,
  deprecated: false,
  required_content_sources: null,
  group: 'Rulebooks',
  artwork_url: null,
  meta_data: null,
};
const profile = {
  id: 916900,
  user_id: actor,
  display_name: 'Reviewer With a Long Display Name',
  is_admin: false,
  is_mod: false,
};
const ability = {
  id: 946901,
  uuid: 8946901,
  created_at: '',
  name: 'Review Example',
  type: 'feat',
  description: 'Original rules.',
  operations: null,
  actions: null,
  level: 1,
  rarity: 'COMMON',
  prerequisites: null,
  frequency: null,
  cost: null,
  trigger: null,
  requirements: null,
  access: 'Original access',
  special: null,
  traits: [],
  content_source_id: source.id,
  version: '1.0',
  meta_data: { unselectable: false, can_select_multiple_times: false },
};
const trait = {
  id: 946902,
  created_at: '',
  name: 'Review Trait',
  description: 'Trait rules.',
  content_source_id: source.id,
  meta_data: {
    unselectable: false,
    ancestry_trait: true,
    class_trait: false,
    archetype_trait: false,
    creature_trait: false,
    versatile_heritage_trait: false,
    companion_type_trait: false,
    important: false,
    retained_review_metadata: { value: 'Visible in the full record' },
  },
};

/** Creates an isolated review request; every API read is intercepted and writes are rejected. */
function makeReview(
  type: ContentUpdate['type'],
  action: ContentUpdate['action'],
  data: Record<string, unknown>
): ContentUpdate {
  return {
    id: 946969,
    created_at: '',
    user_id: actor,
    type,
    action,
    ref_id: action === 'CREATE' ? null : Number(data.id),
    data,
    content_source_id: source.id,
    status: { state: 'PENDING' },
    upvotes: [],
    downvotes: [],
    discord_msg_id: null,
  };
}

/** Seeds a synthetic session that only reaches the intercepted fixture endpoints. */
function session(win: Cypress.AUTWindow) {
  const host = new URL(Cypress.env('functions_url')).hostname.split('.')[0];
  const token = `${win.btoa('{}')}.${win.btoa(JSON.stringify({ sub: actor, exp: 4102444800 }))}.fixture`;
  win.localStorage.setItem(
    `sb-${host}-auth-token`,
    JSON.stringify({
      access_token: token,
      refresh_token: 'fixture',
      token_type: 'bearer',
      expires_at: 4102444800,
      expires_in: 3600,
      user: {
        id: actor,
        aud: 'authenticated',
        role: 'authenticated',
        email: 'fixture@example.invalid',
        app_metadata: {},
        user_metadata: {},
        created_at: '',
      },
    })
  );
  win.localStorage.setItem('user-data', JSON.stringify({ ...profile, display_name: 'Review Fixture' }));
  cy.spy(win.console, 'error').as('consoleError');
}

/** Asserts the labeled before/after values without depending on row positions. */
function setting(label: string, submitted: string, original?: string) {
  cy.contains('table[aria-label="Content settings"] tr', label).within(() => {
    cy.get('td').last().should('have.text', submitted);
    if (original !== undefined) cy.get('td').first().should('have.text', original);
  });
}

/** Checks the actual document geometry, including expanded raw records. */
function noOverflow() {
  cy.document().should((doc) => {
    expect(doc.documentElement.scrollWidth, 'page width').to.be.at.most(doc.documentElement.clientWidth + 1);
  });
  cy.get('.mantine-AppShell-main').should(($main) => {
    expect($main[0].scrollWidth, 'main width').to.be.at.most($main[0].clientWidth + 1);
  });
}

describe('Content update review', () => {
  let review: ContentUpdate;
  let original: Record<string, unknown> | null;

  beforeEach(() => {
    original = structuredClone(ability);
    review = makeReview('ability-block', 'UPDATE', { ...ability, meta_data: { unselectable: true } });
    cy.intercept('**/auth/v1/**', () => {
      throw new Error('Review fixture must not contact authentication');
    });
    cy.intercept('**/discord.com/**', () => {
      throw new Error('Review fixture must not contact Discord');
    });
    cy.intercept('POST', '**/functions/v1/*', (req) => {
      const endpoint = new URL(req.url).pathname.split('/').pop()!;
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      let data: unknown;
      if (endpoint === 'get-user') data = { ...profile, display_name: 'Review Fixture' };
      else if (endpoint === 'get-public-user') data = profile;
      else if (endpoint === 'get-content-versions') data = [];
      else if (endpoint === 'find-content-update') data = review;
      else if (endpoint.startsWith('find-')) {
        let rows: Record<string, unknown>[] = [];
        if (endpoint === 'find-content-source') rows = [source];
        if (original && endpoint === `find-${review.type}`) rows = [original];
        if (body.id !== undefined) {
          const ids = Array.isArray(body.id) ? body.id : [body.id];
          rows = rows.filter((row) => ids.includes(row.id));
        }
        data = rows;
      } else throw new Error(`Unexpected review endpoint ${endpoint}: writes are forbidden`);
      req.reply({ body: { status: 'success', data } });
    });
  });

  afterEach(() => {
    cy.get<sinon.SinonSpy>('@consoleError').then((spy) => {
      const messages = spy.getCalls().map((call) => call.args);
      // The existing global LoginButton nests a decorative ActionIcon button. Keep
      // its two known React diagnostics separate from errors in this review page.
      const headerWarning = messages.some(
        (args) =>
          args[0] === 'In HTML, %s cannot be a descendant of <%s>.\nThis will cause a hydration error.%s' &&
          args[1] === '<button>' &&
          args[2] === 'button' &&
          String(args[3]).includes('<LoginButton ')
      );
      const reviewErrors = messages.filter(
        (args) =>
          !(
            headerWarning &&
            ((args[0] === 'In HTML, %s cannot be a descendant of <%s>.\nThis will cause a hydration error.%s' &&
              args[1] === '<button>' &&
              args[2] === 'button' &&
              String(args[3]).includes('<LoginButton ')) ||
              (args[0] === '<%s> cannot contain a nested %s.\nSee this log for the ancestor stack trace.' &&
                args[1] === 'button' &&
                args[2] === '<button>'))
          )
      );
      expect(reviewErrors, JSON.stringify(reviewErrors)).to.deep.equal([]);
    });
  });

  for (const [screen, width, height] of [
    ['desktop', 1280, 900],
    ['mobile', 390, 844],
  ] as const) {
    it(`compares hidden flags and all trait categories on ${screen}`, () => {
      original = structuredClone(trait);
      review = makeReview('trait', 'UPDATE', {
        ...trait,
        description: 'Updated trait rules.',
        meta_data: {
          ...trait.meta_data,
          unselectable: true,
          ancestry_trait: false,
          class_trait: true,
          archetype_trait: true,
          creature_trait: true,
          versatile_heritage_trait: true,
          companion_type_trait: true,
          important: true,
        },
      });
      cy.viewport(width, height);
      cy.visit(`/content-update/${review.id}`, { onBeforeLoad: session });
      cy.get('html').should('have.attr', 'data-mantine-color-scheme', 'dark');
      setting('Content type', 'Trait', 'Trait');
      setting('Hidden', 'Yes', 'No');
      setting('Ancestry trait', 'No', 'Yes');
      for (const label of [
        'Class trait',
        'Archetype trait',
        'Creature trait',
        'Versatile heritage trait',
        'Companion type trait',
        'Important trait',
      ])
        setting(label, 'Yes', 'No');
      cy.contains('button', 'View Original').should('be.enabled');
      cy.contains('button', 'View Updated').should('be.enabled');
      noOverflow();
      cy.get('table[aria-label="Content settings"]').scrollIntoView();
      cy.screenshot(`content-review-${screen}`, { capture: 'viewport' });
      cy.contains('button', 'Full content data').click();
      cy.get('textarea[readonly]')
        .should('have.length', 2)
        .then(($inputs) => {
          expect(JSON.parse($inputs.eq(0).val() as string)).to.deep.equal(original);
          expect(JSON.parse($inputs.eq(1).val() as string)).to.deep.equal(review.data);
        });
      noOverflow();
      cy.contains('label', 'Original data').scrollIntoView();
      cy.screenshot(`content-review-data-${screen}`, { capture: 'fullPage' });
    });
  }

  for (const subtype of ['action', 'heritage']) {
    it(`identifies a new ${subtype} and exposes every submitted field read-only`, () => {
      original = null;
      review = makeReview('ability-block', 'CREATE', {
        ...ability,
        type: subtype,
        meta_data: { unselectable: true, can_select_multiple_times: true },
        operations: [{ id: 'review-op', type: 'adjValue', data: { variable: 'SPEED', value: 5 } }],
      });
      cy.visit(`/content-update/${review.id}`, { onBeforeLoad: session });
      setting('Content type', subtype === 'action' ? 'Action' : 'Heritage');
      setting('Hidden', 'Yes');
      setting('Repeatable', 'Yes');
      cy.contains('table th', 'Original').should('not.exist');
      cy.contains('button', 'Full content data').click();
      cy.get('textarea[readonly]')
        .should('have.length', 1)
        .invoke('val')
        .then((value) => {
          expect(JSON.parse(value as string)).to.deep.equal(review.data);
        });
      cy.contains('button', /save|submit|approve/i).should('not.exist');
    });
  }

  it('detects removed fields and metadata in an update', () => {
    const { access: _removed, ...submitted } = ability;
    review = makeReview('ability-block', 'UPDATE', { ...submitted, meta_data: { unselectable: true } });
    cy.visit(`/content-update/${review.id}`, { onBeforeLoad: session });
    setting('Content type', 'Feat', 'Feat');
    setting('Hidden', 'Yes', 'No');
    setting('Repeatable', 'No (default)', 'No');
    cy.contains('.mantine-Badge-label', /^Access$/).should('be.visible');
    cy.contains('.mantine-Badge-label', /^Can Select Multiple Times$/).should('be.visible');
  });

  it('retains the submitted record when the original cannot be found', () => {
    original = null;
    cy.visit(`/content-update/${review.id}`, { onBeforeLoad: session });
    setting('Content type', 'Feat', 'Unavailable');
    cy.contains('button', 'Full content data').click();
    cy.contains('Original content is unavailable.').should('be.visible');
    cy.get('textarea[readonly]')
      .should('have.length', 1)
      .invoke('val')
      .then((value) => {
        expect(JSON.parse(value as string)).to.deep.equal(review.data);
      });
  });
});
