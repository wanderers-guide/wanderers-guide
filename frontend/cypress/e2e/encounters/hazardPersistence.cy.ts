export {};

describe('Hazard encounter API persistence', () => {
  let key: string | undefined;
  after(() => {
    if (key) cy.task('campaignFixture:cleanup', key);
  });
  it('round-trips all official hazard snapshots beside an unchanged campaign character', () => {
    
    cy.task<any>('contentFixture:hazardSnapshots', null, { log: false, timeout: 60000 }).then((rows) => {
      const hazards = rows;
      cy.task<{ key: string }>('campaignFixture:create', null, { timeout: 60000 }).then((fixture) => {
        key = fixture.key;
        cy.task('campaignFixture:hazardRoundTrip', { key, hazards }, { timeout: 60000 }).should('deep.eq', {
          hazardsSaved: 6,
          hazardsRemaining: 5,
          characterPreserved: true,
        });
      });
    });
  });
});
