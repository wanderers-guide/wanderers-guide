export {};

type CampaignFixture = {
  key: string;
  campaignId: number;
  gm: { email: string; password: string };
};

describe('Campaign notes', () => {
  let fixture: CampaignFixture | undefined;

  beforeEach(() => {
    fixture = undefined;
    cy.viewport(1280, 900);
    cy.task<CampaignFixture>('campaignFixture:create', null, { log: false }).then((created) => {
      fixture = created;
      cy.login(created.gm.email, created.gm.password);
    });
  });

  afterEach(() => {
    if (fixture) cy.task('campaignFixture:cleanup', fixture.key, { log: false });
  });

  it('saves edits to two pages made inside one debounce window', () => {
    let captureEdits = false;

    cy.intercept('POST', '**/functions/v1/create-campaign', (request) => {
      if (request.body.id !== fixture!.campaignId) return;
      if (request.body.notes?.pages?.length === 2 && !captureEdits) request.alias = 'twoPageCampaign';
      if (captureEdits) request.alias = 'campaignNoteSave';
    });

    cy.then(() => cy.visit(`/campaign/${fixture!.campaignId}`));
    cy.contains('button[role="tab"]', /^Add Page$/, { timeout: 30000 }).click();
    cy.wait('@twoPageCampaign');
    cy.then(() => {
      captureEdits = true;
    });

    cy.get('button[role="tab"]').filter(':contains("Overview")').first().click();
    cy.clock(Date.now()).as('browserClock');
    cy.get('[role="tabpanel"]:visible [contenteditable="true"]').clear().type('First page edit', { delay: 0 });
    cy.get('button[role="tab"]').filter(':contains("Overview")').last().click();
    cy.get('[role="tabpanel"]:visible [contenteditable="true"]').clear().type('Second page edit', { delay: 0 });

    cy.tick(501);
    cy.then(() => undefined);
    cy.tick(201);
    cy.get('@browserClock').invoke('restore');

    cy.wait('@campaignNoteSave').then(({ request }) => {
      expect(JSON.stringify(request.body.notes.pages[0].contents)).to.include('First page edit');
      expect(JSON.stringify(request.body.notes.pages[1].contents)).to.include('Second page edit');
    });
  });
});
