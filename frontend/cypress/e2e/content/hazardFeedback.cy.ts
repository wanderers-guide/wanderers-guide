export {};

const actor = '00000000-0000-4000-8000-000000000002';
const source = {
  id: 900400,
  created_at: '',
  updated_at: '2026-10-01T00:00:00Z',
  name: 'Hazard Feedback Fixture',
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
const trait = {
  id: 941101,
  created_at: '',
  name: 'Feedback Trait',
  description: 'A synthetic trait for drawer history regression testing.',
  content_source_id: source.id,
  meta_data: null,
};
const complexHazard = {
  id: 941001,
  uuid: 8941001,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
  type: 'hazard',
  name: 'Feedback Complex Hazard',
  level: 7,
  rarity: 'RARE',
  details: {
    complexity: 'COMPLEX',
    trait_ids: [trait.id],
    trait_labels: ['mechanical'],
    stealth: '+20 (expert)',
    description: 'A synthetic complex hazard for feedback regression testing.',
    disable: 'DC 25 Thievery to stop the mechanism.',
    defenses: { ac: 25, fort: 15, ref: 12, hardness: 10, hp: 60, bt: 30, immunities: 'critical hits' },
    activation: {
      name: 'Spring Mechanism',
      actions: 'REACTION',
      traits: ['attack'],
      trigger: 'A creature steps on the plate.',
      effect: 'The mechanism deals 2d6 bludgeoning damage.',
    },
    routine: { actions: 2, text: 'The mechanism attacks twice.' },
    reset: 'The mechanism resets after 1 minute.',
  },
  content_source_id: source.id,
  deprecated: false,
  version: '1.0',
  meta_data: {
    source: { book: source.name, page: '123', url: 'https://2e.aonprd.com/Hazards.aspx?ID=999999' },
    retained_fixture_metadata: { author: 'fixture', tags: ['keep-me'] },
  },
};
const simpleHazard = {
  ...complexHazard,
  id: 941002,
  uuid: 8941002,
  name: 'Feedback Simple Hazard',
  level: 2,
  rarity: 'COMMON',
  details: {
    complexity: 'SIMPLE',
    trait_ids: [],
    trait_labels: [],
    stealth: 'DC 18',
    description: 'A synthetic simple hazard with no optional defenses or routine.',
    disable: 'DC 18 Thievery to remove the trigger.',
    activation: { name: 'Release', trigger: 'A creature touches the latch.', effect: 'The latch releases.' },
  },
};
// A separate synthetic record keeps the legacy single-label fixtures and their assertions unchanged.
const extendedHazard = {
  ...complexHazard,
  id: 941003,
  uuid: 8941003,
  name: 'Feedback Extended Hazard',
  details: {
    ...complexHazard.details,
    description: 'An extended synthetic stat block, not imported game content.',
    defenses: {
      ac: 25,
      fort: 15,
      ref: 12,
      hp_note: '6 per 5-foot cube',
      immunities: 'critical hits',
      weaknesses: 'synthetic weakness 2',
      resistances: 'synthetic resistance 3',
    },
    passive_abilities: [
      { name: 'Shared Passive', text: 'First passive with [Feedback Trait](link_trait_941101).' },
      { name: 'Shared Passive', text: 'Second passive remains independent.' },
    ],
    activation: { ...complexHazard.details.activation, requirements: 'The primary mechanism is armed.' },
    secondary_activities: [
      {
        name: 'Shared Activity',
        actions: 'ONE-ACTION',
        traits: ['synthetic'],
        requirements: 'The first secondary mechanism is armed.',
        effect: 'First secondary effect with [Feedback Trait](link_trait_941101).',
      },
      {
        name: 'Shared Activity',
        actions: 'FREE-ACTION',
        traits: ['synthetic'],
        trigger: 'The second secondary trigger occurs.',
        requirements: 'The second secondary mechanism is armed.',
        effect: 'Second secondary effect remains independent.',
      },
    ],
  },
};
const profile = { id: 910002, user_id: actor, display_name: 'Feedback Fixture', is_admin: false, is_mod: false };
const encounter = {
  id: 943001,
  created_at: '',
  user_id: actor,
  name: 'Hazard Feedback Encounter',
  icon: 'combat',
  color: '#228be6',
  campaign_id: null,
  combatants: {
    list: [
      {
        _id: 'saved-hazard-instance',
        type: 'HAZARD',
        ally: false,
        initiative: 19,
        hazard: {
          ...complexHazard,
          details: { ...complexHazard.details, description: 'Previously saved encounter description.' },
        },
        hazard_state: { hp_current: 35, disabled: true },
      },
    ],
  },
  meta_data: { party_level: 7, party_size: 4 },
};
const review = {
  id: 942001,
  created_at: '',
  user_id: actor,
  type: 'creature',
  ref_id: complexHazard.id,
  action: 'UPDATE',
  data: {
    ...complexHazard,
    details: { ...complexHazard.details, description: 'Proposed updated hazard description.' },
  },
  content_source_id: source.id,
  status: { state: 'PENDING' },
  upvotes: [],
  downvotes: [],
  discord_msg_id: null,
};

function session(win: Window) {
  // This token only reaches intercepted fixture APIs, never a real account.
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
  win.localStorage.setItem('user-data', JSON.stringify(profile));
}

function modal(title: string) {
  return cy.contains('.mantine-Modal-content', title);
}

function field(label: string, selector = 'input,textarea') {
  const pattern = new RegExp(`^${label}\\s*\\*?$`, 'i');
  return cy
    .get('.mantine-Modal-content label')
    .filter((_, element) => {
      const input = element.ownerDocument.getElementById((element as HTMLLabelElement).htmlFor);
      return pattern.test(element.textContent ?? '') && !!input?.matches(selector);
    })
    .should('have.length', 1)
    .then(($label) => {
      const id = $label.attr('for');
      expect(id, `${label} input association`).to.be.a('string').and.not.be.empty;
      return cy.get(`[id="${id}"]`);
    });
}

function openEditor(hazard: { id: number; name: string } = complexHazard) {
  cy.visit(`/?open=link_hazard_${hazard.id}`, { onBeforeLoad: session });
  cy.contains('.mantine-Drawer-content', hazard.name, { timeout: 30000 }).should('be.visible');
  cy.get('button[aria-label="Help and Feedback"]').click();
  modal('Content Details').contains('button', 'Submit Content Update').click();
  modal('Edit Hazard').should('be.visible');
  cy.contains('button', /edit creature|save creature/i).should('not.exist');
}

/** Address nested form paths rather than ambiguous source names or duplicated field labels. */
function pathField(path: string) {
  return modal('Edit Hazard')
    .find(`input[data-path="${path}"], textarea[data-path="${path}"]`)
    .should('have.length', 1);
}

/** List controls operate by index; names intentionally repeat in this fixture. */
function entry(field: 'passive_abilities' | 'secondary_activities', index: number) {
  return pathField(`details.${field}.${index}.name`).closest('.mantine-Stack-root');
}

function addEntry(field: 'Passive abilities' | 'Secondary activities') {
  modal('Edit Hazard')
    .contains('p', new RegExp(`^${field}$`))
    .parent()
    .contains('button', /^Add$/)
    .click();
}

function assertNoOverflow() {
  cy.get('.mantine-Modal-content:visible').should(($contents) => {
    $contents.each((_, element) => {
      expect(element.scrollWidth, 'modal width').to.be.at.most(element.clientWidth + 1);
      expect(element.getBoundingClientRect().right, 'modal within viewport').to.be.at.most(
        element.ownerDocument.defaultView!.innerWidth + 1
      );
    });
  });
}

/** Check the settled drawer regions and controls measured in the legacy/extended geometry diagnosis. */
function assertDrawerBounds(width: number) {
  cy.document().should((doc) => {
    expect(doc.documentElement.scrollWidth, 'document width').to.be.at.most(doc.documentElement.clientWidth);
  });
  cy.get(
    '.mantine-Drawer-content, .mantine-Drawer-header, .mantine-Drawer-body, .mantine-Drawer-content .mantine-ScrollArea-viewport, button[aria-label="Help and Feedback"], button[aria-label="Close drawer"]'
  ).should(($nodes) => {
    for (const node of $nodes) {
      const rect = node.getBoundingClientRect();
      expect(rect.left, `${node.className} left`).to.be.at.least(-1);
      expect(rect.right, `${node.className} right`).to.be.at.most(width + 1);
      expect(node.scrollWidth, `${node.className} content width`).to.be.at.most(node.clientWidth + 1);
    }
  });
}

describe('Hazard content feedback', () => {
  let submissions: any[];
  let savedEncounter: typeof encounter;
  let proposedReview: typeof review;

  beforeEach(() => {
    submissions = [];
    savedEncounter = JSON.parse(JSON.stringify(encounter));
    proposedReview = JSON.parse(JSON.stringify(review));
    cy.intercept('**/auth/v1/**', () => {
      throw new Error('Feedback fixture must not contact authentication');
    });
    cy.intercept('**/discord.com/**', () => {
      throw new Error('Feedback fixture must not contact Discord');
    });
    cy.intercept('POST', '**/functions/v1/*', (req) => {
      const endpoint = new URL(req.url).pathname.split('/').pop()!;
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      let data: any;
      if (endpoint === 'get-user' || endpoint === 'get-public-user') data = profile;
      else if (endpoint === 'get-content-versions') data = [];
      else if (endpoint === 'find-encounter') data = [savedEncounter];
      else if (endpoint === 'find-content-update') data = proposedReview;
      else if (endpoint === 'create-content-update') {
        submissions.push(body);
        req.alias = 'submitHazardUpdate';
        data = {
          id: 942001,
          created_at: '',
          user_id: actor,
          ...body,
          status: { state: 'PENDING' },
          upvotes: [],
          downvotes: [],
          discord_msg_id: null,
        };
      } else if (endpoint.startsWith('find-')) {
        let rows: any[] = [];
        if (endpoint === 'find-content-source') rows = [source];
        if (endpoint === 'find-trait') rows = [trait];
        if (endpoint === 'find-creature') {
          rows = body.type === 'hazard' ? [complexHazard, simpleHazard, extendedHazard] : [];
        }
        if (body.id !== undefined) {
          const ids = Array.isArray(body.id) ? body.id : [body.id];
          rows = rows.filter((row) => ids.includes(row.id));
        }
        if (body.name) rows = rows.filter((row) => row.name.toLowerCase() === body.name.toLowerCase());
        if (Array.isArray(body.content_sources)) {
          rows = rows.filter((row) => body.content_sources.includes(row.content_source_id));
        }
        data = typeof body.id === 'number' && endpoint === 'find-creature' ? rows[0] : rows;
      } else throw new Error(`Unexpected fixture endpoint ${endpoint}: no real writes are permitted`);
      req.reply({ body: { status: 'success', data } });
    });
  });

  for (const [screen, width, height] of [
    ['desktop', 1280, 900],
    ['mobile', 390, 844],
  ] as const) {
    it(`shows hazard information and source provenance without changing the drawer on ${screen}`, () => {
      cy.viewport(width, height);
      cy.visit(`/?open=link_hazard_${complexHazard.id}`, { onBeforeLoad: session });
      cy.contains('.mantine-Drawer-content', complexHazard.name, { timeout: 30000 }).should('be.visible');
      cy.get('button[aria-label="Help and Feedback"]').should('be.visible').click();
      modal('Content Details')
        .should('be.visible')
        .within(() => {
          cy.contains(complexHazard.name).should('be.visible');
          cy.contains(source.name).should('be.visible');
          cy.contains(String(complexHazard.id)).should('be.visible');
          cy.contains('a', 'pg. 123').should('have.attr', 'href', complexHazard.meta_data.source.url);
          cy.contains('button', 'Submit Content Update').should('be.visible');
        });
      assertNoOverflow();
      cy.screenshot(`hazard-feedback-details-${screen}`, { capture: 'viewport' });
      cy.get('body').type('{esc}');
      modal('Content Details').should('not.exist');
      cy.contains('.mantine-Drawer-content', complexHazard.name).should('be.visible');
      cy.then(() => expect(submissions).to.have.length(0));
      cy.get('body').type('{esc}');
      cy.get('.mantine-Drawer-content').should('not.exist');
    });

    it(`prefills structured hazard fields and cancels without submitting on ${screen}`, () => {
      cy.viewport(width, height);
      openEditor();
      field('Name').should('have.value', 'Feedback Complex Hazard');
      field('Level').should('have.value', '7');
      field('Rarity').should('have.value', 'Rare');
      field('Complexity').should('have.value', 'Complex');
      field('Stealth').should('have.value', '+20 (expert)');
      field('Description').should('have.value', complexHazard.details.description);
      field('Disable').should('have.value', complexHazard.details.disable);
      modal('Edit Hazard').contains('.mantine-Pill-root', 'Feedback Trait', { timeout: 30000 }).should('be.visible');
      cy.screenshot(`hazard-feedback-form-${screen}`, { capture: 'viewport' });
      modal('Edit Hazard').contains('button[role="tab"]', 'Defenses').click();
      field('AC').should('have.value', '25');
      field('HP').should('have.value', '60');
      field('Immunities').should('have.value', 'critical hits');
      modal('Edit Hazard').contains('button[role="tab"]', 'Activation').click();
      field('Activation name').should('have.value', 'Spring Mechanism');
      field('Actions').should('have.value', 'Reaction');
      field('Trigger').should('have.value', complexHazard.details.activation.trigger);
      field('Effect').should('have.value', complexHazard.details.activation.effect);
      field('Routine actions').should('have.value', '2');
      field('Routine', 'textarea').should('have.value', complexHazard.details.routine.text);
      field('Reset').should('have.value', complexHazard.details.reset);
      modal('Edit Hazard').contains('button[role="tab"]', 'Source').click();
      field('Book').should('have.value', source.name);
      field('Source page').should('have.value', '123');
      field('Source URL').should('have.value', complexHazard.meta_data.source.url);
      assertNoOverflow();
      field('Name').clear().type('Cancelled change');
      modal('Edit Hazard')
        .contains('button', /^Cancel$/)
        .click();
      modal('Edit Hazard').should('not.exist');
      cy.then(() => expect(submissions).to.have.length(0));
      cy.visit(`/?open=link_hazard_${complexHazard.id}`, { onBeforeLoad: session });
      cy.contains('.mantine-Drawer-content', 'Feedback Complex Hazard', { timeout: 30000 }).should('be.visible');
      cy.contains('.mantine-Drawer-content', 'Cancelled change').should('not.exist');
    });

    it(`submits a hazard proposal using catalog identifiers and preserves unrelated fields on ${screen}`, () => {
      cy.viewport(width, height);
      openEditor();
      field('Description').clear().type('Corrected synthetic hazard description.');
      modal('Edit Hazard').contains('button[role="tab"]', 'Activation').click();
      field('Effect').clear().type('The mechanism deals 3d6 bludgeoning damage.');
      modal('Edit Hazard')
        .contains('button', /^Update$/)
        .click();
      cy.wait('@submitHazardUpdate').then(({ request }) => {
        const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
        expect(body).to.deep.eq({
          type: 'creature',
          action: 'UPDATE',
          ref_id: 941001,
          content_source_id: 900400,
          data: {
            ...complexHazard,
            details: {
              ...complexHazard.details,
              description: 'Corrected synthetic hazard description.',
              activation: {
                ...complexHazard.details.activation,
                effect: 'The mechanism deals 3d6 bludgeoning damage.',
              },
            },
          },
        });
        expect(body.data).not.to.have.any.keys('hp_current', 'abilities_base', 'operations', 'operation_data');
      });
      modal('Edit Hazard').should('not.exist');
      cy.then(() => expect(submissions).to.have.length(1));
    });

    it(`keeps feedback above encounter picker previews and restores navigation on ${screen}`, () => {
      cy.viewport(width, height);
      cy.visit('/encounters', { onBeforeLoad: session });
      cy.contains('button', 'Add Hazard', { timeout: 30000 }).click();
      cy.get('input[placeholder="Search hazards"]').type('Feedback Complex');
      cy.get('.mantine-Modal-body').contains(complexHazard.name, { timeout: 30000 }).click();
      cy.contains('.mantine-Drawer-content', complexHazard.name).should('be.visible');
      if (screen === 'desktop') {
        cy.get('button[aria-label="Help and Feedback"]').trigger('mouseover');
        cy.contains('.mantine-HoverCard-dropdown', 'Something wrong?')
          .should('be.visible')
          .then(($tooltip) => {
            cy.get('.mantine-Drawer-inner').should(($drawer) => {
              const win = $drawer[0].ownerDocument.defaultView!;
              expect(Number(win.getComputedStyle($tooltip[0]).zIndex), 'tooltip above preview').to.be.greaterThan(
                Number(win.getComputedStyle($drawer[0]).zIndex)
              );
            });
          });
      }
      cy.get('button[aria-label="Help and Feedback"]').click();
      modal('Content Details').should('be.visible').contains(String(complexHazard.id)).should('exist');
      modal('Content Details')
        .closest('.mantine-Modal-root')
        .find('.mantine-Modal-inner')
        .then(($modal) => {
          cy.get('.mantine-Drawer-inner').should(($drawer) => {
            const win = $drawer[0].ownerDocument.defaultView!;
            expect(Number(win.getComputedStyle($modal[0]).zIndex), 'feedback above preview').to.be.greaterThan(
              Number(win.getComputedStyle($drawer[0]).zIndex)
            );
          });
        });
      cy.get('body').type('{esc}');
      modal('Content Details').should('not.exist');
      cy.contains('.mantine-Drawer-content', complexHazard.name).should('be.visible');
      cy.contains('.mantine-Drawer-content .mantine-Badge-label', 'Feedback Trait').click();
      cy.contains('.mantine-Drawer-content', trait.description).should('be.visible');
      cy.get('button[aria-label="Go back to previous drawer"]').click();
      cy.contains('.mantine-Drawer-content', complexHazard.name).should('be.visible');
      cy.get('button[aria-label="Close drawer"]').click();
      cy.get('input[placeholder="Search hazards"]').should('be.visible').and('have.value', 'Feedback Complex');
      cy.then(() => expect(submissions).to.have.length(0));
    });

    it(`uses the catalog record for encounter feedback without changing saved hazard state on ${screen}`, () => {
      cy.viewport(width, height);
      cy.visit('/encounters', { onBeforeLoad: session });
      cy.contains('[data-hazard-id] button', complexHazard.name, { timeout: 30000 }).click();
      cy.contains('.mantine-Drawer-content', 'Previously saved encounter description.').should('exist');
      cy.get('button[aria-label="Help and Feedback"]').click();
      modal('Content Details').contains(String(complexHazard.id)).should('exist');
      modal('Content Details').contains('button', 'Submit Content Update').click();
      field('Description').should('have.value', complexHazard.details.description);
      modal('Edit Hazard')
        .contains('button', /^Cancel$/)
        .click();
      cy.get('input[aria-label="Feedback Complex Hazard HP"]').should('have.value', '35');
      cy.get('input[aria-label="Feedback Complex Hazard initiative"]').should('have.value', '19');
      cy.get('[data-hazard-id="saved-hazard-instance"] input[type="checkbox"]').should('be.checked');
      cy.then(() => expect(submissions).to.have.length(0));
    });

    it(`shows hazard review previews without creature editing or recursive feedback on ${screen}`, () => {
      cy.viewport(width, height);
      cy.visit(`/content-update/${review.id}`, { onBeforeLoad: session });
      cy.contains('button', 'View Original', { timeout: 30000 }).click();
      cy.contains('.mantine-Drawer-content', complexHazard.details.description).should('be.visible');
      cy.get('.mantine-Drawer-content').contains('Hazard 7').should('be.visible');
      cy.get('button[aria-label="Help and Feedback"]').should('be.visible');
      cy.get('button[aria-label="Close drawer"]').click();
      cy.contains('button', 'View Updated').click();
      cy.contains('.mantine-Drawer-content', 'Proposed updated hazard description.').should('be.visible');
      cy.get('.mantine-Drawer-content').contains('Hazard 7').should('be.visible');
      cy.get('button[aria-label="Help and Feedback"]').should('not.exist');
      cy.get('.mantine-Drawer-content input, .mantine-Drawer-content textarea').should('not.exist');
      cy.contains('.mantine-Drawer-content', /Perception|Speed|Edit Creature/).should('not.exist');
      cy.contains('.mantine-Drawer-content .mantine-Badge-label', 'Feedback Trait').click();
      cy.contains('.mantine-Drawer-content', trait.description).should('be.visible');
      cy.get('button[aria-label="Go back to previous drawer"]').click();
      cy.contains('.mantine-Drawer-content', 'Proposed updated hazard description.').should('be.visible');
      cy.get('button[aria-label="Help and Feedback"]').should('not.exist');
      cy.then(() => expect(submissions).to.have.length(0));
    });
  }

  for (const [screen, width, height] of [
    ['desktop', 1280, 900],
    ['mobile', 390, 844],
    ['narrow', 320, 740],
  ] as const) {
    it(`renders the optional stat block once in source order on ${screen}`, () => {
      cy.viewport(width, height);
      cy.visit(`/?open=link_hazard_${extendedHazard.id}`, { onBeforeLoad: session });
      cy.get('html').should('have.attr', 'data-mantine-color-scheme', 'dark');
      cy.contains('.mantine-Drawer-content', extendedHazard.name, { timeout: 30000 }).should('be.visible');
      cy.get('.mantine-Drawer-body').should(($body) => {
        const text = $body[0].textContent!;
        const ordered = [
          'Disable',
          'AC 25; Fort +15; Ref +12',
          'HP 6 per 5-foot cube',
          'Immunities critical hits',
          'Weaknesses synthetic weakness 2',
          'Resistances synthetic resistance 3',
          'First passive with Feedback Trait.',
          'Second passive remains independent.',
          'Spring Mechanism',
          extendedHazard.details.activation.trigger,
          extendedHazard.details.activation.requirements,
          extendedHazard.details.activation.effect,
          'Routine (2 actions)',
          extendedHazard.details.routine.text,
          extendedHazard.details.secondary_activities[0].requirements,
          'First secondary effect with Feedback Trait.',
          extendedHazard.details.secondary_activities[1].trigger!,
          extendedHazard.details.secondary_activities[1].requirements,
          extendedHazard.details.secondary_activities[1].effect,
          'Reset',
        ];
        let previous = -1;
        for (const token of ordered) {
          const position = text.indexOf(token);
          expect(position, `${token} is after the previous source field`).to.be.greaterThan(previous);
          expect(text.split(token), `${token} appears once`).to.have.length(2);
          previous = position;
        }
        expect(text).not.to.match(/\bBT\b|\bHardness\b|link_trait_|\[Feedback Trait\]/);
        expect(text.match(/Shared Passive/g)).to.have.length(2);
        expect(text.match(/Shared Activity/g)).to.have.length(2);
        expect(text.match(/Trigger/g)).to.have.length(2);
        expect(text.match(/Requirements/g)).to.have.length(3);
      });
      cy.get('.mantine-Drawer-body [style*="ActionIcons"]').should(($symbols) => {
        expect([...$symbols].map((element) => element.textContent)).to.deep.eq(['5', '1', '4']);
      });
      cy.get('.mantine-Drawer-body a')
        .filter((_, element) => element.textContent === 'Feedback Trait')
        .should('have.length', 2);
      cy.get('.mantine-Drawer-body input, .mantine-Drawer-body textarea').should('not.exist');
      assertDrawerBounds(width);
      cy.screenshot(`hazard-extended-${screen}-top`, { capture: 'viewport' });
      cy.get('.mantine-Drawer-content .mantine-ScrollArea-viewport').scrollTo('bottom');
      cy.get('.mantine-Drawer-body').contains('Reset').should('be.visible');
      assertDrawerBounds(width);
      cy.screenshot(`hazard-extended-${screen}-secondary`, { capture: 'viewport' });
      cy.get('.mantine-Drawer-body a')
        .filter((_, element) => element.textContent === 'Feedback Trait')
        .should('have.length', 2)
        .eq(1)
        .scrollIntoView()
        .click();
      cy.get('.mantine-Drawer-header')
        .contains('h3', /^Feedback Trait$/)
        .should('be.visible');
      cy.get('button[aria-label="Go back to previous drawer"]').click();
      cy.get('.mantine-Drawer-header').contains('h3', extendedHazard.name).should('be.visible');
    });

    it(`edits optional fields and duplicate-name ordered rows on ${screen}`, () => {
      cy.viewport(width, height);
      openEditor(extendedHazard);
      pathField('details.passive_abilities.0.name').should('have.value', 'Shared Passive');
      let secondPassive: HTMLElement;
      pathField('details.passive_abilities.1.text').then(($input) => {
        secondPassive = $input[0];
      });
      entry('passive_abilities', 0)
        .contains('button', /^Down$/)
        .click();
      pathField('details.passive_abilities.0.text')
        .should('have.value', 'Second passive remains independent.')
        .then(($input) => expect($input[0], 'stable local row identity moves with its value').to.eq(secondPassive));
      entry('passive_abilities', 1)
        .contains('button', /^Remove$/)
        .click();
      addEntry('Passive abilities');
      pathField('details.passive_abilities.1.name').type('Shared Passive');
      pathField('details.passive_abilities.1.text').type('New passive remains ordered.');
      assertNoOverflow();
      cy.screenshot(`hazard-extended-editor-${screen}-passives`, { capture: 'viewport' });
      modal('Edit Hazard').contains('button[role="tab"]', 'Defenses').click();
      field('HP').should('have.value', '');
      field('BT').should('have.value', '');
      field('HP note').should('have.value', '6 per 5-foot cube').clear().type('8 per 5-foot cube');
      field('Weaknesses').clear().type('synthetic weakness 4');
      field('Resistances').clear().type('synthetic resistance 5');
      modal('Edit Hazard').contains('button[role="tab"]', 'Activation').click();
      pathField('details.activation.trigger').should('not.have.attr', 'required');
      pathField('details.activation.requirements').clear();
      // Clearing an autosize field can align it under the sticky modal header; re-query and center it.
      pathField('details.activation.requirements').then(($field) => $field[0].scrollIntoView({ block: 'center' }));
      pathField('details.activation.requirements')
        .should('be.visible')
        .type('The corrected primary mechanism is armed.', { scrollBehavior: 'center' });
      pathField('details.secondary_activities.0.trigger').should('have.value', '');
      entry('secondary_activities', 1).contains('button', /^Up$/).click();
      pathField('details.secondary_activities.0.effect').should(
        'have.value',
        'Second secondary effect remains independent.'
      );
      entry('secondary_activities', 1)
        .contains('button', /^Remove$/)
        .click();
      addEntry('Secondary activities');
      pathField('details.secondary_activities.1.name').type('Shared Activity');
      pathField('details.secondary_activities.1.effect').type('New secondary effect remains ordered.');
      assertNoOverflow();
      cy.screenshot(`hazard-extended-editor-${screen}-activities`, { capture: 'viewport' });
      modal('Edit Hazard').contains('button[role="tab"]', 'Source').click();
      field('Book').clear().type('Corrected fixture citation');
      modal('Edit Hazard')
        .contains('button', /^Update$/)
        .click();
      cy.wait('@submitHazardUpdate').then(({ request }) => {
        const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
        expect(body).to.deep.eq({
          type: 'creature',
          action: 'UPDATE',
          ref_id: extendedHazard.id,
          content_source_id: source.id,
          data: {
            ...extendedHazard,
            details: {
              ...extendedHazard.details,
              defenses: {
                ...extendedHazard.details.defenses,
                hp_note: '8 per 5-foot cube',
                weaknesses: 'synthetic weakness 4',
                resistances: 'synthetic resistance 5',
              },
              passive_abilities: [
                extendedHazard.details.passive_abilities[1],
                { name: 'Shared Passive', text: 'New passive remains ordered.' },
              ],
              activation: {
                ...extendedHazard.details.activation,
                requirements: 'The corrected primary mechanism is armed.',
              },
              secondary_activities: [
                extendedHazard.details.secondary_activities[1],
                { name: 'Shared Activity', effect: 'New secondary effect remains ordered.' },
              ],
            },
            meta_data: {
              ...extendedHazard.meta_data,
              source: { ...extendedHazard.meta_data.source, book: 'Corrected fixture citation' },
            },
          },
        });
        expect(body.data.details.defenses).not.to.have.any.keys('hp', 'bt');
        for (const list of [body.data.details.passive_abilities, body.data.details.secondary_activities]) {
          for (const row of list) expect(row).not.to.have.any.keys('key', '_key', 'id', '_id');
        }
      });
      cy.then(() => expect(submissions).to.have.length(1));
    });
  }

  it('cancels optional-field deletions and restores absent arrays after the final removal', () => {
    cy.viewport(1280, 900);
    openEditor(extendedHazard);
    for (const index of [1, 0])
      entry('passive_abilities', index)
        .contains('button', /^Remove$/)
        .click();
    modal('Edit Hazard').contains('button[role="tab"]', 'Defenses').click();
    for (const label of ['HP note', 'Weaknesses', 'Resistances']) field(label).clear();
    modal('Edit Hazard').contains('button[role="tab"]', 'Activation').click();
    pathField('details.activation.requirements').clear();
    for (const index of [1, 0])
      entry('secondary_activities', index)
        .contains('button', /^Remove$/)
        .click();
    modal('Edit Hazard')
      .contains('button', /^Cancel$/)
      .click();
    cy.then(() => expect(submissions).to.have.length(0));
    openEditor(extendedHazard);
    pathField('details.passive_abilities.0.text').should(
      'have.value',
      extendedHazard.details.passive_abilities[0].text
    );
    for (const index of [1, 0])
      entry('passive_abilities', index)
        .contains('button', /^Remove$/)
        .click();
    // Add then remove also exercises the synchronous Mantine list-ref path from an absent array.
    addEntry('Passive abilities');
    entry('passive_abilities', 0)
      .contains('button', /^Remove$/)
      .click();
    modal('Edit Hazard').contains('button[role="tab"]', 'Defenses').click();
    field('HP note').should('have.value', '6 per 5-foot cube');
    for (const label of ['HP note', 'Weaknesses', 'Resistances']) field(label).clear();
    modal('Edit Hazard').contains('button[role="tab"]', 'Activation').click();
    pathField('details.activation.requirements').clear();
    for (const index of [1, 0])
      entry('secondary_activities', index)
        .contains('button', /^Remove$/)
        .click();
    addEntry('Secondary activities');
    entry('secondary_activities', 0)
      .contains('button', /^Remove$/)
      .click();
    modal('Edit Hazard')
      .contains('button', /^Update$/)
      .click();
    cy.wait('@submitHazardUpdate').then(({ request }) => {
      const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
      const expected = JSON.parse(JSON.stringify(extendedHazard));
      delete expected.details.passive_abilities;
      delete expected.details.secondary_activities;
      delete expected.details.defenses.hp_note;
      delete expected.details.defenses.weaknesses;
      delete expected.details.defenses.resistances;
      delete expected.details.activation.requirements;
      expect(body.data).to.deep.eq(expected);
      expect(body.data.details).not.to.have.any.keys('passive_abilities', 'secondary_activities');
      expect(body.data.details.defenses).not.to.have.any.keys('hp_note', 'weaknesses', 'resistances', 'hp', 'bt');
      expect(body.data.details.activation).not.to.have.key('requirements');
    });
  });

  it('keeps absent simple-hazard fields absent in a proposed update', () => {
    cy.viewport(1280, 900);
    openEditor(simpleHazard);
    field('Complexity').should('have.value', 'Simple');
    modal('Edit Hazard').contains('button[role="tab"]', 'Defenses').click();
    field('Defenses', 'input[type="checkbox"]').should('not.be.checked');
    cy.contains('.mantine-Modal-content label', /^HP$/).should('not.exist');
    modal('Edit Hazard').contains('button[role="tab"]', 'Activation').click();
    field('Actions').should('have.value', '');
    field('Routine', 'input[type="checkbox"]').should('not.be.checked');
    field('Reset').should('have.value', '');
    field('Effect').clear().type('The corrected latch releases.');
    modal('Edit Hazard')
      .contains('button', /^Update$/)
      .click();
    cy.wait('@submitHazardUpdate').then(({ request }) => {
      const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
      expect(body.ref_id).to.eq(941002);
      expect(body.content_source_id).to.eq(900400);
      expect(body.type).to.eq('creature');
      expect(body.data.details).to.deep.eq({
        ...simpleHazard.details,
        activation: { ...simpleHazard.details.activation, effect: 'The corrected latch releases.' },
      });
      expect(body.data.meta_data).to.deep.eq(simpleHazard.meta_data);
    });
  });

  it('does not trap Escape or start an unsupported creation for a snapshot without a catalog ID', () => {
    savedEncounter.combatants.list[0].hazard.id = -1;
    cy.viewport(1280, 900);
    cy.visit('/encounters', { onBeforeLoad: session });
    cy.contains('[data-hazard-id] button', complexHazard.name, { timeout: 30000 }).click();
    cy.get('.mantine-Drawer-content').then(($drawer) => {
      const help = $drawer.find('button[aria-label="Help and Feedback"]');
      if (help.length) cy.wrap(help).click();
    });
    modal('Content Details').should('not.exist');
    modal('Edit Hazard').should('not.exist');
    cy.get('body').type('{esc}');
    cy.get('.mantine-Drawer-content').should('not.exist');
    cy.then(() => expect(submissions).to.have.length(0));
  });

  it('keeps malformed hazard proposals inspectable without opening a broken proposed drawer', () => {
    delete (proposedReview.data.details as Record<string, unknown>).activation;
    cy.viewport(1280, 900);
    cy.visit(`/content-update/${review.id}`, { onBeforeLoad: session });
    cy.contains('button', 'View Updated', { timeout: 30000 }).should('be.disabled');
    cy.contains('Detected Field Changes').should('be.visible');
    cy.contains('.mantine-Badge-label', /^Details$/).should('be.visible');
    cy.get('.mantine-Drawer-content').should('not.exist');
    cy.contains('button', 'View Original').should('not.be.disabled').click();
    cy.contains('.mantine-Drawer-content', complexHazard.details.description).should('be.visible');
    cy.get('.mantine-Drawer-content').contains('Hazard 7').should('be.visible');
    cy.then(() => expect(submissions).to.have.length(0));
  });

  it('keeps unknown trait tags visible and lets explicit removal recover a valid proposal', () => {
    cy.viewport(1280, 900);
    openEditor();
    field('Traits')
      .should(($input) => expect($input).not.to.have.attr('readonly'))
      .type('Unlisted fixture trait{enter}');
    modal('Edit Hazard').contains('.mantine-Pill-root', 'Unlisted fixture trait').should('be.visible');
    modal('Edit Hazard').contains('Select a listed trait').should('be.visible');
    modal('Edit Hazard')
      .contains('button', /^Update$/)
      .should('be.disabled');
    cy.then(() => expect(submissions).to.have.length(0));
    modal('Edit Hazard').contains('.mantine-Pill-root', 'Unlisted fixture trait').find('button').click();
    modal('Edit Hazard').contains('.mantine-Pill-root', 'Unlisted fixture trait').should('not.exist');
    modal('Edit Hazard').contains('.mantine-Pill-root', 'Feedback Trait').should('be.visible');
    modal('Edit Hazard')
      .contains('button', /^Update$/)
      .should('not.be.disabled')
      .click();
    cy.wait('@submitHazardUpdate').then(({ request }) => {
      const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
      expect(body.data.details.trait_ids).to.deep.eq([941101]);
      expect(body.data.meta_data).to.deep.eq(complexHazard.meta_data);
    });
  });
});
