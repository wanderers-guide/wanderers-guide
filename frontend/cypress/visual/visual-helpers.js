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
  let screenshotPath;
  let previousDockVisibility;
  cy.document().then(async (doc) => {
    await doc.fonts.ready;
    if (name.startsWith('pages/builder-caster') && width === 390) {
      for (const el of doc.querySelectorAll('.mantine-Text-root[data-ui-review-source="common/RichText.tsx"]')) {
        const viewport = el.closest('.mantine-ScrollArea-viewport');
        if (!viewport || !el.getClientRects().length) continue;
        expect(el.getBoundingClientRect().width, 'rules paragraphs fit their scroll viewport').to.be.at.most(
          viewport.getBoundingClientRect().width + 1
        );
      }
    }
    await Promise.all(
      [...doc.images]
        .filter((img) => img.getClientRects().length && !img.complete)
        .map(
          (img) =>
            new Promise((resolve) => {
              img.addEventListener('load', resolve, { once: true });
              img.addEventListener('error', resolve, { once: true });
              setTimeout(resolve, 10000);
            })
        )
    );
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
  cy.get('body', { log: false }).then((body) => {
    previousDockVisibility = body.find('[data-visual-dock]').css('visibility');
    body.find('[data-visual-dock]').css('visibility', 'hidden');
  });
  cy.screenshot(id, {
    capture: 'viewport',
    scale: false,
    overwrite: true,
    onAfterScreenshot(_element, details) {
      screenshotPath = details.path;
    },
  });
  cy.get('body', { log: false }).then((body) =>
    body.find('[data-visual-dock]').css('visibility', previousDockVisibility ?? 'visible')
  );
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
    // Hover cards can also have dialog roles. They must not hide the surrounding page from the source inventory.
    const scope =
      [...doc.querySelectorAll('.mantine-Modal-content,.mantine-Drawer-content')].filter(visible).at(-1) ?? doc.body;
    const sources = [
      ...new Set(
        [scope, ...scope.querySelectorAll('[data-ui-review-source]')]
          .filter(visible)
          .map((el) => el.getAttribute('data-ui-review-source'))
          .filter(Boolean)
      ),
    ];
    const targets = [scope, ...scope.querySelectorAll('[data-ui-review-id]')]
      .filter((el) => visible(el) && el.hasAttribute('data-ui-review-id'))
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
          background,
          source: el.closest('[data-ui-review-source]')?.getAttribute('data-ui-review-source'),
          class: el.className,
        });
    }
    // Cypress appends retry suffixes to image names; keep each image's evidence paired with that exact capture.
    const captureId = screenshotPath?.split(`/${prefix}/`)[1]?.replace(/\.png$/, '');
    const metadataId = captureId ? `${prefix}/${captureId}` : id;
    cy.writeFile(
      `${Cypress.env('reviewMetadataFolder')}/${metadataId}.json`,
      {
        id: metadataId,
        scheme,
        width,
        height: doc.defaultView.innerHeight,
        sources,
        targets,
        interaction,
        lowContrast,
      },
      { log: false }
    );
  });
}
export function captureScrolls(
  name,
  selector = '.mantine-Modal-content:visible,.mantine-Drawer-content:visible',
  includeHorizontal = true
) {
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
  // Standalone routes scroll the document without an explicit overflow container.
  if (selector === 'body')
    cy.document().then((doc) => {
      const win = doc.defaultView;
      const range = doc.scrollingElement.scrollHeight - win.innerHeight;
      const steps = Math.ceil(range / (win.innerHeight * 0.75));
      for (let step = 1; step <= steps; step++) {
        cy.window().then((live) => live.scrollTo(0, Math.min(range, step * live.innerHeight * 0.75)));
        capture(name + `/document-scroll-${step}`);
      }
      cy.window().then((live) => live.scrollTo(0, 0));
    });
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
          // React can replace a viewport after a panel opens. Requery before each scroll.
          cy.get(selector)
            .last()
            .then(($current) => {
              const live = [$current[0], ...$current[0].querySelectorAll('*')].filter(
                (node) =>
                  node.clientHeight > 100 &&
                  node.scrollHeight > node.clientHeight + 2 &&
                  /auto|scroll/.test(win.getComputedStyle(node).overflowY)
              )[i];
              if (live)
                live.scrollTop = Math.min(live.scrollHeight - live.clientHeight, step * live.clientHeight * 0.75);
            });
          capture(name + `/scroll-${i}-${step}`);
        }
        cy.get(selector)
          .last()
          .then(($current) => {
            for (const node of [$current[0], ...$current[0].querySelectorAll('*')])
              if (/auto|scroll/.test(win.getComputedStyle(node).overflowY)) node.scrollTop = 0;
          });
      }
      if (includeHorizontal) {
        const horizontalViews = [root, ...root.querySelectorAll('*')].filter(
          (el) =>
            el.clientWidth > 100 &&
            el.scrollWidth > el.clientWidth + 2 &&
            /auto|scroll/.test(win.getComputedStyle(el).overflowX)
        );
        for (const i of horizontalViews.keys()) {
          cy.get(selector)
            .last()
            .then(($current) => {
              const live = [$current[0], ...$current[0].querySelectorAll('*')].filter(
                (node) =>
                  node.clientWidth > 100 &&
                  node.scrollWidth > node.clientWidth + 2 &&
                  /auto|scroll/.test(win.getComputedStyle(node).overflowX)
              )[i];
              if (live) live.scrollLeft = live.scrollWidth - live.clientWidth;
            });
          captureScrolls(name + '/horizontal-' + i, selector, false);
          cy.get(selector)
            .last()
            .then(($current) => {
              for (const node of [$current[0], ...$current[0].querySelectorAll('*')])
                if (/auto|scroll/.test(win.getComputedStyle(node).overflowX)) node.scrollLeft = 0;
            });
        }
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
      const choices = /^(editor-|operation-|panel-)/.test(name)
        ? [...root.querySelectorAll('.mantine-SegmentedControl-label')]
        : [];
      const targets = [
        ...choices,
        ...extras,
        ...root.querySelectorAll('.mantine-Accordion-control,.mantine-Spoiler-control'),
        ...root.querySelectorAll('[role=tab],.mantine-Stepper-step'),
      ].filter(
        (el) =>
          !el.disabled &&
          el.getClientRects().length &&
          el.ownerDocument.defaultView.getComputedStyle(el).pointerEvents !== 'none' &&
          // Shared operation controls are reviewed in their own operation cases.
          !(
            name.startsWith('editor-') &&
            el.closest('[data-ui-review-source]')?.getAttribute('data-ui-review-source')?.includes('/operations/')
          ) &&
          !/^(New Encounter|Generate Encounter|Add Page)$/.test(el.textContent.trim()) &&
          !(el.classList.contains('mantine-Stepper-step') && el.textContent.trim() === 'Sheet')
      );
      const key = (el) =>
        [
          el.classList.contains('mantine-SegmentedControl-label')
            ? 'choice-' + (el.closest('[data-ui-review-source]')?.getAttribute('data-ui-review-source') ?? 'control')
            : 'panel',
          el.closest('[data-ui-review-id]')?.getAttribute('data-ui-review-id') ?? 'control',
          // Repeated game-content rows share one UI template; preserve every distinct control.
          name.startsWith('navigation/') &&
          el.classList.contains('mantine-Accordion-control') &&
          el.closest('[data-ui-review-id]')
            ? 'representative-content-row'
            : (el.getAttribute('data-value') ?? el.textContent),
        ].join('-');
      const el = targets.find(
        (el) =>
          !seen.has(key(el)) &&
          !(el.classList.contains('mantine-Spoiler-control') && !/show more/i.test(el.textContent))
      );
      if (!el) return;
      const id = key(el);
      seen.add(id);
      const modalDepth = [...root.ownerDocument.querySelectorAll('.mantine-Modal-content')].filter(
        (node) => node.getClientRects().length
      ).length;
      const alreadyOpen = el.getAttribute('aria-expanded') === 'true' || el.getAttribute('aria-selected') === 'true';
      cy.wrap(el, { log: false }).scrollIntoView();
      // Inspect initially open panels before another accordion or tab can hide their nested controls.
      if (!alreadyOpen) cy.wrap(el, { log: false }).click({ force: true });
      captureScrolls(`${name}/panel-${slug(id)}`, selector);
      if (Cypress.env('reviewInteractions')) reviewPortals(name, selector);
      cy.get('body').then(($body) => {
        if ($body.find('.mantine-Modal-content:visible').length > modalDepth) {
          // Nested editor dialogs must not hide the parent editor's remaining tabs.
          cy.get('.mantine-Modal-close:visible').last().click();
          cy.get('body').should(($current) =>
            expect($current.find('.mantine-Modal-content:visible').length, 'parent dialog restored').to.eq(modalDepth)
          );
        }
      });
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
          el.getClientRects().length &&
          el.ownerDocument.defaultView.getComputedStyle(el).pointerEvents !== 'none'
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
          // The sheet hides its fixed header while scrolling; its menu is reviewed separately at the top.
          if (el.closest('header') && el.getBoundingClientRect().bottom <= 0) return;
          cy.wrap(el, { log: false }).scrollIntoView();
          if (kind === 'Menu' || kind === 'Popover') cy.wrap(el, { log: false }).click();
          else cy.wrap(el, { log: false }).trigger('mouseover').trigger('mouseenter').trigger('mousemove');
          const overlay = kind === 'Tooltip' ? '.mantine-Tooltip-tooltip' : `.mantine-${kind}-dropdown`;
          cy.wait(kind === 'HoverCard' ? 1400 : 800, { log: false });
          if (kind === 'Menu')
            cy.get('body').then(($body) => {
              // Some native menus open on hover rather than click.
              if (!$body.find(overlay + ':visible').length && el.isConnected)
                cy.wrap(el, { log: false }).trigger('mouseover').trigger('mouseenter').trigger('mousemove');
            });
          if (kind === 'Menu') cy.wait(800, { log: false });
          cy.get('body').then(($body) => {
            if (!$body.find(overlay + ':visible').length) {
              cy.writeFile(
                `${Cypress.env('reviewMetadataFolder')}/${prefix}/${name}/unopened-${slug(id)}.json`,
                { id, kind, opened: false },
                { log: false }
              );
              return;
            }
            capture(`${name}/portal-${slug(id)}`, { id, kind, opened: true });
            if (kind === 'Menu' || kind === 'Popover') cy.wrap(el, { log: false }).click();
            // Hover-triggered menus need a leave event as well as click-menu cleanup.
            cy.wrap(el, { log: false })
              .trigger('mouseout', { relatedTarget: el.ownerDocument.body })
              .trigger('mouseleave');
            // Move the native pointer to the viewport edge without clicking a page action.
            cy.window().then((win) =>
              Cypress.automation('remote:debugger:protocol', {
                command: 'Input.dispatchMouseEvent',
                params: { type: 'mouseMoved', x: win.innerWidth - 2, y: win.innerHeight - 2 },
              })
            );
            cy.wait(500, { log: false });
            cy.get(overlay + ':visible', { timeout: 5000 }).should('not.exist');
          });
        });
    });
}

/** Only visual reads are replayed from successful isolated-local API responses. Functional tests use the live API. */
export function recordedCatalogReads(transform) {
  const file = Cypress.env('recordedCatalogFile');
  if (!file) return;
  // Complete catalog recordings can exceed 10 MB; allow for disk reads on a busy review host.
  cy.readFile(file, { log: false, timeout: 60000 }).then((catalog) => {
    const reviewedCatalog = transform ? transform(catalog) : catalog;
    for (const [type, records] of Object.entries(reviewedCatalog))
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
          'input.mantine-Select-input,.mantine-MultiSelect-input input,input.mantine-Autocomplete-input,.mantine-TagsInput-input input,input.mantine-ColorInput-input'
        ),
      ].filter(
        (el) =>
          !el.disabled &&
          el.getClientRects().length &&
          el.ownerDocument.defaultView.getComputedStyle(el).pointerEvents !== 'none'
      );
      for (const [i, el] of inputs.entries())
        cy.then(() => {
          if (!el.isConnected || !el.getClientRects().length) return;
          cy.wrap(el, { log: false }).scrollIntoView().click();
          cy.wait(200, { log: false });
          capture(
            `${name}/input-${i}-${slug(el.closest('.mantine-InputWrapper-root')?.querySelector('label')?.textContent ?? el.getAttribute('placeholder') ?? 'options')}`,
            {
              kind: el.classList.contains('mantine-ColorInput-input') ? 'ColorInput' : 'Combobox',
              opened: !!el.ownerDocument.querySelector('[role=listbox],.mantine-ColorInput-dropdown'),
            }
          );
          if (el.classList.contains('mantine-ColorInput-input'))
            cy.get('.mantine-Modal-header:visible,.mantine-Drawer-header:visible').last().click('center');
          else cy.wrap(el, { log: false }).type('{esc}', { force: true });
          cy.get('[role=listbox]:visible,.mantine-ColorInput-dropdown:visible', { timeout: 5000 }).should('not.exist');
        });
    });
}

/** Verify the longest native rarity label without saving the local editing form. */
export function reviewRarity(name) {
  cy.get('.mantine-Modal-content:visible')
    .last()
    .then(($root) => {
      const label = [...$root[0].querySelectorAll('label')].find((el) => /^Rarity/.test(el.textContent));
      if (!label?.htmlFor) return;
      cy.get('input[id="' + label.htmlFor + '"]')
        .scrollIntoView()
        .click();
      cy.contains('[role=option]:visible', /^Uncommon$/).click();
      cy.get('input[id="' + label.htmlFor + '"]').should(($input) => {
        const input = $input[0],
          style = getComputedStyle(input);
        const context = input.ownerDocument.createElement('canvas').getContext('2d');
        context.font = style.fontWeight + ' ' + style.fontSize + ' ' + style.fontFamily;
        expect(context.measureText(input.value).width, 'full selected rarity fits').to.be.at.most(
          input.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) + 1
        );
      });
      capture(name + '/rarity-uncommon');
    });
}
