export {};

describe('Hazard encounter API persistence', () => {
  let key: string | undefined;
  after(() => {
    if (key) cy.task('campaignFixture:cleanup', key);
  });
  it('round-trips all official hazard snapshots beside an unchanged campaign character', () => {
    const fixtureScript = `
      import { readFile } from "node:fs/promises";
      const entries = JSON.parse((await readFile("../supabase/migrations/20260928020000_war_of_immortals_hazards.sql", "utf8")).split("$entries$")[1]);
      console.log(JSON.stringify(entries.map((entry, index) => ({
        id: 911001 + index, uuid: entry.uuid, created_at: "2026-09-28T00:00:00Z", type: "hazard",
        name: entry.name, level: entry.level, rarity: "RARE", details: entry.details,
        content_source_id: 400, deprecated: false, version: "1.0",
        meta_data: {source: {book: "War of Immortals", page: entry.page, url: entry.url}},
      }))));
    `;
    cy.exec(`node --input-type=module -e '${fixtureScript}'`, { log: false }).then(({ stdout }) => {
      const hazards = JSON.parse(stdout);
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
