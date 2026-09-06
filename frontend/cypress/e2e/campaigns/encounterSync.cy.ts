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
    cy.then(() => {
      disrupted = false;
      failPolls = false;
    });
    cy.contains('button', 'Retry now').click();
    cy.wait('@recoveredGmSave', { timeout: 15000 }).its('response.body.status').should('eq', 'success');
    cy.contains('Not synced: retrying automatically').should('not.exist');
    readPlayer().its('hp_current').should('eq', 16);
    cy.viewport(1280, 900);
    cy.get('input[placeholder="HP"]', { timeout: 10000 }).should('have.value', '16');
  });
});
