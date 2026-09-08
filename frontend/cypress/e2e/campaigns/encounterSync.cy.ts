/** Independent authenticated GM/player accounts exercise the actual encounter controls and API. */
type CampaignFixture = {
  key: string;
  campaignId: number;
  characterId: number;
  gm: { email: string; password: string };
};

describe('Campaign encounter synchronization', () => {
  let fixture: CampaignFixture | undefined;
  let campaignPolls = 0;
  let failPolls = false;

  beforeEach(() => {
    fixture = undefined;
    campaignPolls = 0;
    failPolls = false;
    cy.viewport(1280, 900);
    cy.task<CampaignFixture>('campaignFixture:create', null, { log: false }).then((created) => {
      fixture = created;
      cy.login(created.gm.email, created.gm.password);
      cy.intercept('POST', '**/functions/v1/find-character', (request) => {
        if (request.body.campaign_id !== created.campaignId) return;
        campaignPolls += 1;
        if (failPolls) {
          request.alias = 'failedCampaignPoll';
          request.reply({ statusCode: 503, body: { status: 'error', message: 'Simulated weak connection' } });
        }
      });
      cy.visit(`/campaign/${created.campaignId}`);
      cy.contains('button[role="tab"]', /^Encounters$/, { timeout: 30000 }).click();
      cy.get('input[placeholder="HP"]', { timeout: 30000 }).should('have.value', '20');
    });
  });

  afterEach(() => {
    if (fixture) cy.task('campaignFixture:cleanup', fixture.key, { log: false });
  });

  const readPlayer = () => cy.task<any>('campaignFixture:read', fixture!.key, { log: false });

  const addDrained = () => {
    cy.get('button[aria-label="Add Condition"]').click();
    cy.contains('.mantine-Modal-content', 'Select a Condition', { timeout: 30000 }).within(() => {
      cy.get('input').first().type('Drained');
      cy.contains(/^Drained$/, { timeout: 30000 }).click();
    });
  };

  it('saves GM Drained and HP together once through a lost acknowledgement, polls, and reopening', () => {
    let writes = 0;
    cy.intercept('POST', '**/functions/v1/update-character', (request) => {
      if (request.body.id !== fixture!.characterId) return;
      writes += 1;
      expect(request.body.hp_current).to.eq(19);
      expect(request.body.details.conditions.some((condition: { name: string }) => condition.name === 'Drained')).to.eq(
        true
      );
      request.alias = 'drainedSave';
      request.continue((response) => {
        expect(response.body.status).to.eq('success');
        expect(response.body.data[0].hp_current).to.eq(19);
        response.send({ statusCode: 503, body: { status: 'error', message: 'Simulated lost acknowledgement' } });
      });
    });
    addDrained();
    cy.wait('@drainedSave');
    cy.get('input[placeholder="HP"]').should('have.value', '19');
    cy.then(() => {
      const previousPolls = campaignPolls;
      cy.wrap(null, { timeout: 15000 }).should(() => expect(campaignPolls).to.be.at.least(previousPolls + 2));
    });
    cy.contains('Not synced: retrying automatically').should('not.exist');
    cy.then(() => expect(writes, 'accepted snapshot acknowledged by a read, without replay').to.eq(1));
    cy.reload();
    cy.contains('button[role="tab"]', /^Encounters$/, { timeout: 30000 }).click();
    cy.get('input[placeholder="HP"]', { timeout: 30000 }).should('have.value', '19');
    cy.contains('Drained').should('be.visible');
    readPlayer().then((character) => {
      expect(character.hp_current).to.eq(19);
      expect(
        character.details.conditions.filter((condition: { name: string }) => condition.name === 'Drained')
      ).to.have.length(1);
    });
    cy.screenshot('campaign-drained-lost-ack-recovered');
  });

  it('pauses GM Drained racing player damage even when both edits produce the same HP', () => {
    let writes = 0;
    let releaseSave: (() => void) | undefined;
    cy.intercept('POST', '**/functions/v1/update-character', (request) => {
      if (request.body.id !== fixture!.characterId) return;
      writes += 1;
      request.alias = 'heldDrainedSave';
      return new Promise<void>((resolve) => {
        releaseSave = () => {
          request.continue();
          resolve();
        };
      });
    });
    addDrained();
    cy.wrap(null).should(() => expect(releaseSave).to.be.a('function'));
    cy.task('campaignFixture:playerUpdate', { key: fixture!.key, hp: 19 }, { log: false }).then(() => releaseSave!());
    cy.wait('@heldDrainedSave').its('response.body.data.__conflict').should('eq', true);
    cy.contains('Saving paused: resolve conflicting edits', { timeout: 30000 }).should('be.visible');
    cy.contains('Review changes').should('be.visible');
    cy.get('input[placeholder="HP"]').should('have.value', '19');
    cy.contains('Drained').should('be.visible');
    readPlayer().then((character) => {
      expect(character.hp_current).to.eq(19);
      expect(character.details.conditions).to.deep.equal([]);
    });
    cy.window().then((win) => {
      const key = Object.keys(win.localStorage).find((key) =>
        key.startsWith(`autosave-character-${fixture!.characterId}-`)
      );
      const draft = JSON.parse(win.localStorage.getItem(key ?? '') ?? '{}');
      expect(draft.body.hp_current).to.eq(19);
      expect(draft.body.details.conditions.some((condition: { name: string }) => condition.name === 'Drained')).to.eq(
        true
      );
    });
    cy.then(() => expect(writes).to.eq(1));
    cy.screenshot('campaign-drained-player-damage-conflict');
  });

  it('keeps typed HP through fresh player polls, preserves player details, and sends one Enter/blur write', () => {
    let writes = 0;
    cy.intercept('POST', '**/functions/v1/update-character', (request) => {
      if (request.body.id !== fixture!.characterId) return;
      writes += 1;
      request.alias = 'gmSave';
    });
    cy.get('input[placeholder="HP"]').clear().should('have.value', '').type('18');
    cy.task('campaignFixture:playerUpdate', { key: fixture!.key, appearance: 'Updated by the player' }, { log: false });
    cy.then(() => {
      const previousPolls = campaignPolls;
      cy.wrap(null, { timeout: 15000 }).should(() => expect(campaignPolls).to.be.greaterThan(previousPolls));
    });
    cy.get('input[placeholder="HP"]').should('have.value', '18').type('{enter}');
    cy.wait('@gmSave').then(({ request, response }) => {
      expect(response?.body.status).to.eq('success');
      expect(response?.body.data[0].hp_current).to.eq(18);
      expect(Object.keys(request.body).sort()).to.deep.equal(['expected_updated_at', 'hp_current', 'id']);
    });
    readPlayer().then((character) => {
      expect(character.hp_current).to.eq(18);
      expect(character.details.info.appearance).to.eq('Updated by the player');
    });
    cy.then(() => {
      const previousPolls = campaignPolls;
      cy.wrap(null, { timeout: 15000 }).should(() => expect(campaignPolls).to.be.at.least(previousPolls + 2));
    });
    cy.then(() => expect(writes).to.eq(1));
    cy.get('input[placeholder="HP"]').should('have.value', '18');
    cy.screenshot('campaign-gm-confirmed-desktop');
  });

  it('uses incoming player HP when a GM condition picker has remained open', () => {
    cy.get('button[aria-label="Add Condition"]').click();
    cy.contains('.mantine-Modal-content', 'Select a Condition', { timeout: 30000 }).within(() => {
      cy.get('input').first().type('Drained');
      cy.contains(/^Drained$/, { timeout: 30000 }).should('be.visible');
    });
    cy.task('campaignFixture:playerUpdate', { key: fixture!.key, hp: 18 }, { log: false });
    cy.get('input[placeholder="HP"]', { timeout: 20000 }).should('have.value', '18');
    cy.intercept('POST', '**/functions/v1/update-character').as('currentDrainedSave');
    cy.contains('.mantine-Modal-content', 'Select a Condition')
      .contains(/^Drained$/)
      .click();
    cy.wait('@currentDrainedSave', { timeout: 15000 }).then(({ request, response }) => {
      expect(request.body.hp_current).to.eq(17);
      expect(response?.body.status).to.eq('success');
    });
    cy.get('input[placeholder="HP"]').should('have.value', '17');
    cy.contains('Saving paused: resolve conflicting edits').should('not.exist');
    readPlayer().then((character) => {
      expect(character.hp_current).to.eq(17);
      expect(character.details.conditions[0].name).to.eq('Drained');
    });
  });

  it('applies Drained to queued GM damage and preserves both through retry', () => {
    let disrupted = true;
    cy.intercept('POST', '**/functions/v1/update-character', (request) => {
      if (request.body.id !== fixture!.characterId) return;
      if (disrupted) {
        request.alias = 'blockedHealthSave';
        request.reply({ statusCode: 503, body: { status: 'error', message: 'Simulated weak connection' } });
      } else request.alias = 'combinedHealthSave';
    });
    cy.get('input[placeholder="HP"]').clear().type('16{enter}');
    cy.wait('@blockedHealthSave');
    cy.contains('Not synced: retrying automatically', { timeout: 15000 }).should('be.visible');
    addDrained();
    cy.get('input[placeholder="HP"]').should('have.value', '15');
    readPlayer().its('hp_current').should('eq', 20);
    cy.contains('button', 'Retry now', { timeout: 15000 })
      .should('be.visible')
      .then(($button) => {
        disrupted = false;
        $button[0].click();
      });
    cy.wait('@combinedHealthSave', { timeout: 15000 }).then(({ response }) => {
      expect(response?.body.status).to.eq('success');
      expect(response?.body.data[0].hp_current).to.eq(15);
    });
    readPlayer().then((character) => {
      expect(character.hp_current).to.eq(15);
      expect(character.details.conditions[0].name).to.eq('Drained');
    });
    cy.contains('Not synced: retrying automatically').should('not.exist');
  });

  it('retains unsynced GM HP through failed polls and mobile layout changes, then retries successfully', () => {
    let disrupted = true;
    cy.intercept('POST', '**/functions/v1/update-character', (request) => {
      if (request.body.id !== fixture!.characterId) return;
      if (disrupted) {
        request.alias = 'failedGmSave';
        request.reply({ statusCode: 503, body: { status: 'error', message: 'Simulated weak connection' } });
      } else request.alias = 'recoveredGmSave';
    });
    cy.get('input[placeholder="HP"]').clear().should('have.value', '').type('16{enter}');
    cy.wait('@failedGmSave');
    cy.contains('Not synced: retrying automatically', { timeout: 15000 }).should('be.visible');
    cy.then(() => {
      failPolls = true;
    });
    cy.wait('@failedCampaignPoll', { timeout: 15000 });
    cy.get('input[placeholder="HP"]').should('have.value', '16');
    cy.contains('Connection test player').should('be.visible');
    readPlayer().its('hp_current').should('eq', 20);
    cy.screenshot('campaign-gm-unsynced-desktop');

    cy.viewport(390, 844);
    cy.get('button[aria-label="Panel Grid"]').click();
    cy.contains('button', /^Encounters$/).click();
    cy.contains('Not synced: retrying automatically', { timeout: 10000 }).should('be.visible');
    cy.contains('button', 'Retry now').scrollIntoView();
    cy.document().should((document) => {
      expect(document.documentElement.scrollWidth).to.be.at.most(document.documentElement.clientWidth);
    });
    cy.screenshot('campaign-gm-unsynced-mobile');
    cy.contains('button', 'Retry now')
      .should('be.visible')
      .then(($button) => {
        // Restore transport and click in the same turn, before an automatic retry can remove the control.
        disrupted = false;
        failPolls = false;
        $button[0].click();
      });
    cy.wait('@recoveredGmSave', { timeout: 15000 }).its('response.body.status').should('eq', 'success');
    cy.contains('Not synced: retrying automatically').should('not.exist');
    readPlayer().its('hp_current').should('eq', 16);
    cy.viewport(1280, 900);
    cy.get('input[placeholder="HP"]', { timeout: 10000 }).should('have.value', '16');
  });
});
