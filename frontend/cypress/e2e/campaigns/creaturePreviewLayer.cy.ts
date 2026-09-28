export {};

type CampaignFixture = {
  key: string;
  campaignId: number;
  gm: { email: string; password: string };
};

describe('Creature preview from encounter selection', () => {
  let fixture: CampaignFixture | undefined;

  beforeEach(() => {
    cy.viewport(1280, 900);
    cy.task<CampaignFixture>('campaignFixture:create', null, { log: false }).then((created) => {
      fixture = created;
      cy.login(created.gm.email, created.gm.password);
      cy.visit(`/campaign/${created.campaignId}`);
      cy.contains('button[role="tab"]', /^Encounters$/, { timeout: 30000 }).click();
      cy.contains('button', 'Add Creature', { timeout: 30000 }).click();
    });
  });

  afterEach(() => {
    if (fixture) cy.task('campaignFixture:cleanup', fixture.key, { log: false });
  });

  it('shows the preview above the picker on desktop and mobile without closing the picker', () => {
    for (const width of [1280, 390]) {
      cy.viewport(width, width < 600 ? 844 : 900);
      cy.contains('.mantine-Modal-content', 'Select Creature').should('be.visible');
      cy.get('.mantine-Modal-content').contains('Animated Broom', { timeout: 30000 }).click();
      cy.contains('.mantine-Drawer-content', 'Animated Broom').should('be.visible');

      cy.contains('.mantine-Modal-root', 'Select Creature').then(($modal) => {
        cy.contains('.mantine-Drawer-root', 'Animated Broom').should(($drawer) => {
          const modalZ = Number(getComputedStyle($modal[0]).getPropertyValue('--mb-z-index'));
          const drawerZ = Number(getComputedStyle($drawer[0]).getPropertyValue('--mb-z-index'));
          expect(drawerZ, 'creature preview layer').to.be.greaterThan(modalZ);
        });
      });

      if (width === 1280) {
        cy.contains('.mantine-Drawer-root', 'Animated Broom').find('button[aria-label="Help and Feedback"]').click();
        cy.get('.mantine-Modal-root')
          .filter((_, element) => element.textContent?.includes('Content Details') ?? false)
          .should('have.length', 1);
        cy.contains('.mantine-Modal-content', 'Content Details').should('be.visible');
        cy.get('body').type('{esc}');
        cy.contains('.mantine-Drawer-content', 'Animated Broom').should('be.visible');
        cy.contains('.mantine-Drawer-root', 'Animated Broom').find('button[aria-label="Close drawer"]').click();
      } else {
        cy.get('body').type('{esc}');
      }
      cy.get('.mantine-Drawer-content').should('not.exist');
      cy.contains('.mantine-Modal-content', 'Select Creature').should('be.visible');
      cy.contains('.mantine-Modal-content', 'Animated Broom').should('be.visible');
    }
    cy.get('body').type('{esc}');
    cy.contains('.mantine-Modal-content', 'Select Creature').should('not.exist');
  });
});
