/** Capture real visible states with source metadata; unopened triggers do not count as reviewed overlays. */
const scheme = Cypress.env('reviewScheme') ?? 'light';
const width = Cypress.config('viewportWidth');
const prefix = `${scheme}-${width}`;
const reviewedBackgrounds = new Set();
const slug = (value) => value.replaceAll(/[^a-zA-Z0-9._-]/g, '-');
export function settled(selector = 'body') {
  cy.wait(800, { log: false });
  cy.get(selector, { timeout: 120000 })
    .last({ timeout: 120000 })
    .should(($root) => {
      expect(
        $root.find('.mantine-Loader-root:visible,.mantine-LoadingOverlay-root:visible').length,
        'no visible loaders'
      ).to.eq(0);
      expect(
        [...$root[0].querySelectorAll('*')].filter(
          (el) =>
            el.children.length === 0 &&
            el.getClientRects().length &&
            /^Loading(?:\.\.\.|…)?$/.test(el.textContent.trim())
        ).length,
        'no loading status'
      ).to.eq(0);
    });
}
export function capture(name, interaction) {
  const id = `${prefix}/${name}`;
  cy.document().then(async (doc) => {
    await doc.fonts.ready;
    const urls = new Set(
      [...doc.querySelectorAll('*')]
        .filter((el) => el.getClientRects().length)
        .flatMap((el) =>
          [...doc.defaultView.getComputedStyle(el).backgroundImage.matchAll(/url\(["']?(.*?)["']?\)/g)].map(
            (match) => match[1]
          )
        )
    );
    await Promise.all(
      [...urls]
        .filter((url) => !reviewedBackgrounds.has(url))
        .map(
          (url) =>
            new Promise((resolve) => {
              const done = () => {
                reviewedBackgrounds.add(url);
                resolve();
              };
              const image = new doc.defaultView.Image();
              image.onload = done;
              image.onerror = done;
              image.src = url;
              setTimeout(done, 10000);
            })
        )
    );
  });
  cy.get('body', { log: false }).then((body) => body.find('[data-visual-dock]').css('visibility', 'hidden'));
  cy.screenshot(id, { capture: 'viewport', scale: false, overwrite: true });
  cy.get('body', { log: false }).then((body) => body.find('[data-visual-dock]').css('visibility', 'visible'));
  cy.document().then((doc) => {
    const visible = (el) => {
      const b = el.getBoundingClientRect(),
        s = doc.defaultView.getComputedStyle(el);
      return (
        b.width > 0 &&
        b.height > 0 &&
        b.bottom > 0 &&
        b.top < doc.defaultView.innerHeight &&
        b.right > 0 &&
        b.left < doc.defaultView.innerWidth &&
        s.display !== 'none' &&
        s.visibility !== 'hidden'
      );
    };
    const scope = [...doc.querySelectorAll('[role=dialog]')].filter(visible).at(-1) ?? doc.body;
    const sources = [
      ...new Set(
        [...scope.querySelectorAll('[data-ui-review-source]')]
          .filter(visible)
          .map((el) => el.getAttribute('data-ui-review-source'))
      ),
    ];
    const targets = [...scope.querySelectorAll('[data-ui-review-id]')]
      .filter(visible)
      .map((el) => ({
        id: el.getAttribute('data-ui-review-id'),
        kind: el.getAttribute('data-ui-review-kind'),
        expanded: el.getAttribute('aria-expanded'),
        selected: el.getAttribute('aria-selected'),
      }));
    const rgba = (value) => {
      const parts = value.match(/[\d.]+/g)?.map(Number);
      return parts?.length >= 3 ? [parts[0], parts[1], parts[2], parts[3] ?? 1] : [0, 0, 0, 0];
    };
    const blend = (top, bottom) => top.slice(0, 3).map((v, i) => v * top[3] + bottom[i] * (1 - top[3]));
    const luminance = (color) =>
      color
        .map((v) => {
          const s = v / 255;
          return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        })
        .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
    const lowContrast = [];
    for (const el of [...scope.querySelectorAll('*')].filter(
      (el) =>
        visible(el) && el.children.length === 0 && el.textContent.trim() && el instanceof doc.defaultView.HTMLElement
    )) {
      if (el.closest('[disabled],[data-disabled],[aria-disabled=true]')) continue;
      const style = doc.defaultView.getComputedStyle(el),
        size = parseFloat(style.fontSize);
      let background = [0, 0, 0];
      const ancestors = [];
      for (let parent = el; parent; parent = parent.parentElement) ancestors.unshift(parent);
      for (const parent of ancestors)
        background = blend(rgba(doc.defaultView.getComputedStyle(parent).backgroundColor), background);
      const foreground = blend(rgba(style.color), background),
        a = luminance(foreground),
        b = luminance(background),
        ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      const min = size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700) ? 3 : 4.5;
      if (ratio < min - 0.05)
        lowContrast.push({
          text: el.textContent.trim().slice(0, 100),
          ratio: Number(ratio.toFixed(2)),
          foreground: style.color,
          source: el.closest('[data-ui-review-source]')?.getAttribute('data-ui-review-source'),
          class: el.className,
        });
    }
    cy.writeFile(
      `${Cypress.env('reviewMetadataFolder')}/${id}.json`,
      { id, scheme, width, height: doc.defaultView.innerHeight, sources, targets, interaction, lowContrast },
      { log: false }
    );
  });
}
export function captureScrolls(name, selector = '.mantine-Modal-content:visible,.mantine-Drawer-content:visible') {
  settled(selector);
  cy.window().then((win) => win.scrollTo(0, 0));
  cy.get(selector)
    .last()
    .then(($root) => {
      const win = $root[0].ownerDocument.defaultView;
      for (const el of [$root[0], ...$root[0].querySelectorAll('*')])
        if (el.scrollHeight > el.clientHeight + 2 && /auto|scroll/.test(win.getComputedStyle(el).overflowY))
          el.scrollTop = 0;
    });
  capture(name + '/upper');
  cy.get(selector)
    .last()
    .then(($root) => {
      const root = $root[0],
        win = root.ownerDocument.defaultView;
      const views = [root, ...root.querySelectorAll('*')].filter(
        (el) =>
          el.clientHeight > 100 &&
          el.scrollHeight > el.clientHeight + 2 &&
          /auto|scroll/.test(win.getComputedStyle(el).overflowY)
      );
      for (const [i, el] of views.entries()) {
        const steps = Math.ceil((el.scrollHeight - el.clientHeight) / (el.clientHeight * 0.75));
        for (let step = 1; step <= steps; step++) {
          cy.wrap(el, { log: false }).scrollTo(
            0,
            Math.min(el.scrollHeight - el.clientHeight, step * el.clientHeight * 0.75),
            { duration: 0 }
          );
          capture(name + `/scroll-${i}-${step}`);
        }
        cy.wrap(el, { log: false }).scrollTo('top', { duration: 0 });
      }
    });
}
/** Tabs and accordion controls only: never click save, delete, purchases or grants during enumeration. */
export function reviewPanels(
  name,
  selector = '.mantine-Modal-content:visible,.mantine-Drawer-content:visible',
  seen = new Set(),
  count = 0
) {
  if (count > 350) throw new Error('Panel enumeration exceeded its explicit bound');
  cy.get(selector)
    .last()
    .then(($root) => {
      const root = $root[0];
      const extras = [...root.querySelectorAll('button')].filter((el) =>
        /^(Additional Options|Misc. Sections|Operations|Base Abilities|Added Abilities|Inventory|Heightened|Default Presets|Character Stats)$/.test(
          el.textContent.trim()
        )
      );
      const targets = [
        ...root.querySelectorAll('[role=tab],.mantine-Accordion-control,.mantine-Spoiler-control'),
        ...extras,
        ...root.querySelectorAll('.mantine-Stepper-step'),
      ].filter(
        (el) =>
          !el.disabled &&
          el.getClientRects().length &&
          !/^(New Encounter|Generate Encounter|Add Page)$/.test(el.textContent.trim()) &&
          !(el.classList.contains('mantine-Stepper-step') && el.textContent.trim() === 'Sheet')
      );
      const key = (el) =>
        [
          el.closest('[data-ui-review-id]')?.getAttribute('data-ui-review-id') ?? 'control',
          el.getAttribute('data-value') ?? el.textContent,
        ].join('-');
      const el = targets.find(
        (el) =>
          !seen.has(key(el)) &&
          !(el.classList.contains('mantine-Spoiler-control') && !/show more/i.test(el.textContent))
      );
      if (!el) return;
      const id = key(el);
      seen.add(id);
      cy.wrap(el, { log: false }).scrollIntoView().click({ force: true });
      captureScrolls(`${name}/panel-${slug(id)}`, selector);
      if (Cypress.env('reviewInteractions')) reviewPortals(name, selector);
      reviewPanels(name, selector, seen, count + 1);
    });
}
/** Open each existing portal without activating its menu items. */
const reviewedPortals = new Map();
export function reviewPortals(name, selector = '.mantine-Modal-content:visible,.mantine-Drawer-content:visible') {
  cy.get(selector)
    .last()
    .then(($root) => {
      const targets = [...$root[0].querySelectorAll('[data-ui-review-kind]')].filter(
        (el) =>
          ['Menu', 'Popover', 'HoverCard', 'Tooltip'].includes(el.dataset.uiReviewKind) &&
          !el.disabled &&
          el.getClientRects().length
      );
      for (const el of targets)
        cy.then(() => {
          if (!el.isConnected || !el.getClientRects().length) return;
          const kind = el.dataset.uiReviewKind,
            id = el.dataset.uiReviewId;
          const seen = reviewedPortals.get(name) ?? new Set();
          reviewedPortals.set(name, seen);
          if (seen.has(id)) return;
          seen.add(id);
          cy.wrap(el, { log: false }).scrollIntoView();
          if (kind === 'Menu' || kind === 'Popover') cy.wrap(el, { log: false }).click();
          else cy.wrap(el, { log: false }).trigger('mouseover').trigger('mouseenter').trigger('mousemove');
          const overlay = kind === 'Tooltip' ? '.mantine-Tooltip-tooltip' : `.mantine-${kind}-dropdown`;
          cy.get(overlay + ':visible', { timeout: 3000 }).should('be.visible');
          capture(`${name}/portal-${slug(id)}`, { id, kind, opened: true });
          if (kind === 'Menu' || kind === 'Popover') cy.wrap(el, { log: false }).click();
          else
            cy.wrap(el, { log: false })
              .trigger('mouseout', { relatedTarget: el.ownerDocument.body })
              .trigger('mouseleave');
          cy.get(overlay + ':visible', { timeout: 5000 }).should('not.exist');
        });
    });
}

/** Only visual reads are replayed from successful isolated-local API responses. Functional tests use the live API. */
export function recordedCatalogReads() {
  const file = Cypress.env('recordedCatalogFile');
  if (!file) return;
  cy.readFile(file, { log: false }).then((catalog) => {
    for (const [type, records] of Object.entries(catalog))
      cy.intercept('POST', `**/functions/v1/find-${type}`, (req) => {
        const body = req.body ?? {};
        let rows = records;
        if (body.id !== undefined) {
          const ids = (Array.isArray(body.id) ? body.id : [body.id]).map(Number);
          if (ids.some((id) => !records.some((row) => row.id === id))) {
            req.continue();
            return;
          }
        }
        if (type === 'creature') rows = rows.filter((row) => row.type === (body.type ?? 'creature'));
        if (type === 'content-source') {
          if (body.foundry_id !== undefined) rows = rows.filter((row) => row.foundry_id === body.foundry_id);
          if (body.group !== undefined) rows = rows.filter((row) => row.group === body.group);
          if (body.published !== undefined) rows = rows.filter((row) => row.is_published === body.published);
          if (!body.id && !body.homebrew) rows = rows.filter((row) => row.user_id === null);
        }
        for (const key of ['traits', 'prerequisites'])
          if (Array.isArray(body[key]))
            rows = rows.filter((row) => body[key].every((value) => row[key]?.includes(value)));
        if (body.id !== undefined) {
          const ids = Array.isArray(body.id) ? body.id : [body.id];
          rows = rows.filter((row) => ids.map(Number).includes(row.id));
        }
        if (body.name !== undefined) rows = rows.filter((row) => row.name.toLowerCase() === body.name.toLowerCase());
        if (Array.isArray(body.content_sources))
          rows = rows.filter((row) => body.content_sources.includes(row.content_source_id));
        if (body.type !== undefined) rows = rows.filter((row) => row.type === body.type);
        req.reply({
          status: 'success',
          data:
            (body.id !== undefined && !Array.isArray(body.id)) || body.foundry_id !== undefined
              ? (rows[0] ?? null)
              : rows,
        });
      });
  });
}

/** Open existing input dropdowns without changing their selected values. */
export function reviewInputs(name, selector = '.mantine-Modal-content:visible,.mantine-Drawer-content:visible') {
  cy.get(selector)
    .last()
    .then(($root) => {
      const inputs = [
        ...$root[0].querySelectorAll(
          '.mantine-Select-input,.mantine-MultiSelect-input,.mantine-Autocomplete-input,.mantine-TagsInput-input'
        ),
      ].filter((el) => !el.disabled && el.getClientRects().length);
      for (const [i, el] of inputs.entries())
        cy.then(() => {
          if (!el.isConnected || !el.getClientRects().length) return;
          cy.wrap(el, { log: false }).scrollIntoView().click();
          cy.get('.mantine-Combobox-dropdown:visible', { timeout: 10000 }).should('be.visible');
          capture(
            `${name}/input-${i}-${slug(el.closest('.mantine-InputWrapper-root')?.querySelector('label')?.textContent ?? el.getAttribute('placeholder') ?? 'options')}`,
            { kind: 'Combobox', opened: true }
          );
          cy.wrap(el, { log: false }).type('{esc}', { force: true });
          cy.get('.mantine-Combobox-dropdown:visible', { timeout: 5000 }).should('not.exist');
        });
    });
}
