/** The public sheet's pending-read state must fill the visible route content area. */
describe('Public sheet loader layout', () => {
  let releaseRead: (() => void) | undefined;

  afterEach(() => {
    releaseRead?.();
    releaseRead = undefined;
  });

  for (const [name, width, height, zoom] of [
    ['desktop', 1280, 900, 1],
    ['zoomed desktop', 1280, 900, 0.8],
    ['enlarged desktop', 1280, 900, 1.2],
    ['phone', 390, 844, 1],
    ['zoomed phone', 390, 844, 0.8],
    ['short phone', 390, 700, 1],
  ] as const) {
    it(`places the complete loading indicator 60% above the bottom of the ${name} content area`, () => {
      const pending = new Promise<void>((resolve) => {
        releaseRead = resolve;
      });
      cy.intercept('POST', '**/functions/v1/find-character', (request) =>
        pending.then(() => request.reply({ statusCode: 200, body: { status: 'success', data: null } }))
      );
      cy.viewport(width, height);
      cy.visit('/sheet/36514', {
        onBeforeLoad(win) {
          win.localStorage.setItem('customization-cache', JSON.stringify({ sheet_theme: { zoom } }));
          win.indexedDB.open = () => {
            throw new Error('Cold loader layout fixture');
          };
        },
      });
      cy.contains('Loading...').should('be.visible');
      cy.contains('Loading...')
        .parent()
        .should((indicator) => {
          const element = indicator[0];
          const main = element.closest('main');
          expect(main, 'the route loading indicator is inside the application main region').not.to.eq(null);
          if (!main) throw new Error('Missing application main region');
          const win = element.ownerDocument.defaultView;
          if (!win) throw new Error('Missing loading indicator window');
          const bounds = element.getBoundingClientRect();
          const mainBounds = main.getBoundingClientRect();
          const style = win.getComputedStyle(main);
          const centerX =
            (mainBounds.left +
              parseFloat(style.paddingLeft) * zoom +
              mainBounds.right -
              parseFloat(style.paddingRight) * zoom) /
            2;
          const contentTop = mainBounds.top + parseFloat(style.paddingTop) * zoom;
          const contentBottom = height - parseFloat(style.paddingBottom) * zoom;
          const centerY = contentTop + (contentBottom - contentTop) * 0.4;
          expect(indicator.find('svg'), 'measure the artwork together with its status label').to.have.length(1);
          expect(bounds.left + bounds.width / 2, 'horizontal center of the route content').to.be.closeTo(centerX, 2);
          expect(bounds.top + bounds.height / 2, '40% down the visible route content').to.be.closeTo(centerY, 2);
        });
      cy.document().its('documentElement.scrollWidth').should('be.at.most', width);
      cy.screenshot(`sheet-loader-raised-${width}x${height}-zoom-${zoom}`);
    });
  }
});
