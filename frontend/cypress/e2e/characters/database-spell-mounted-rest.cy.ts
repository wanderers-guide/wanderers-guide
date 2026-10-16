import { registerDatabaseSpellSelectionTests } from '../../support/database-spell-fixture';

describe(
  'Source-module spell choices',
  { baseUrl: Cypress.env('module_preview_url') ?? Cypress.config('baseUrl') },
  () => registerDatabaseSpellSelectionTests('module')
);
