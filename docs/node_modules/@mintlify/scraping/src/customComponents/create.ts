import type { Root as HastRoot, Element } from 'hast';
import { visit, SKIP, CONTINUE } from 'unist-util-visit';

import {
  gitBookScrapeAccordion,
  readmeScrapeAccordion,
  docusaurusScrapeAccordion,
} from '../components/Accordion.js';
import {
  gitBookScrapeAccordionGroup,
  readmeScrapeAccordionGroup,
  docusaurusScrapeAccordionGroup,
} from '../components/AccordionGroup.js';
import {
  gitBookScrapeCallout,
  readmeScrapeCallout,
  docusaurusScrapeCallout,
} from '../components/Callout.js';
import { gitBookScrapeCard, readmeScrapeCard, docusaurusScrapeCard } from '../components/Card.js';
import {
  gitBookScrapeCardGroup,
  readmeScrapeCardGroup,
  docusaurusScrapeCardGroup,
} from '../components/CardGroup.js';
import {
  gitBookScrapeCodeGroup,
  readmeScrapeCodeGroup,
  docusaurusScrapeCodeGroup,
} from '../components/CodeGroup.js';
import {
  gitBookScrapeFrame,
  readmeScrapeFrame,
  docusaurusScrapeFrame,
} from '../components/Frame.js';
import { gitBookScrapeTabs, readmeScrapeTabs, docusaurusScrapeTabs } from '../components/Tabs.js';
import type { ScrapeFuncType } from '../types/scrapeFunc.js';
import { framework } from '../utils/detectFramework.js';
import { log } from '../utils/log.js';

function createComponent(
  gitBookScrapeFunc: ScrapeFuncType,
  readmeScrapeFunc: ScrapeFuncType,
  docusaurusScrapeFunc: ScrapeFuncType
) {
  return function (tree: HastRoot) {
    return visit(tree, 'element', function (node, index, parent) {
      if (node.tagName === 'code' || node.tagName === 'pre') return SKIP;
      let result: Element | undefined = undefined;

      switch (framework.vendor) {
        case 'gitbook':
          result = gitBookScrapeFunc(node, index, parent);
          break;
        case 'readme':
          result = readmeScrapeFunc(node, index, parent);
          break;
        case 'docusaurus':
          result = docusaurusScrapeFunc(node, index, parent);
          break;
        default:
          log('Invalid documentation vendor requested: ' + framework.vendor);
          return SKIP;
      }

      if (!result) return CONTINUE;

      if (parent && typeof index === 'number') {
        parent.children[index] = result;
        return SKIP;
      }
      return CONTINUE;
    });
  };
}

export function createLinks() {
  return createComponent(gitBookScrapeCard, readmeScrapeCard, docusaurusScrapeCard);
}
export function createCard() {
  return createComponent(gitBookScrapeCard, readmeScrapeCard, docusaurusScrapeCard);
}
export function createAccordion() {
  return createComponent(gitBookScrapeAccordion, readmeScrapeAccordion, docusaurusScrapeAccordion);
}
export function createAccordionGroup() {
  return createComponent(
    gitBookScrapeAccordionGroup,
    readmeScrapeAccordionGroup,
    docusaurusScrapeAccordionGroup
  );
}
export function createFrame() {
  return createComponent(gitBookScrapeFrame, readmeScrapeFrame, docusaurusScrapeFrame);
}
export function createCodeGroup() {
  return createComponent(gitBookScrapeCodeGroup, readmeScrapeCodeGroup, docusaurusScrapeCodeGroup);
}
export function createTabs() {
  return createComponent(gitBookScrapeTabs, readmeScrapeTabs, docusaurusScrapeTabs);
}
export function createCallout() {
  return createComponent(gitBookScrapeCallout, readmeScrapeCallout, docusaurusScrapeCallout);
}
export function createCardGroup() {
  return createComponent(gitBookScrapeCardGroup, readmeScrapeCardGroup, docusaurusScrapeCardGroup);
}
