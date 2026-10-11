import {
  AbilityBlockSchema,
  CharacterSchema,
  ClassSchema,
  ContentSourceSchema,
  SpellSchema,
  TraitSchema,
  type Character,
} from '../../../src/schemas/content';
import { OperationSchema } from '../../../src/schemas/operations';
import { isOperationsWorkerURL } from '../../support/operations-worker-fixture';

const actor = '00000000-0000-4000-8000-000000991902';
const first = '6082549e-6035-451d-a2dd-f90766e54d55';
const second = '5a22ab22-74b9-4658-b194-558c386668d4';
const predefined = 'a7da4994-13ef-4bfd-84a1-8d7380dc5cbd';
const predefinedChoice = '923ef5f1-2515-4734-b5f4-083ba9b8b93e';
const daily = 'c0186b58-5206-4e1b-9e07-e6878fd9dfbc';
const caster = 'TECHNOMANCER';
const cache = 'TECHNOMANCER_CACHE';
const profile = { id: 991902, user_id: actor, display_name: 'Database fixture', is_admin: false, is_mod: false };
const source = ContentSourceSchema.parse({
  id: 991902,
  created_at: '',
  name: 'Database fixture',
  foundry_id: null,
  url: null,
  description: '',
  operations: null,
  user_id: actor,
  contact_info: null,
  require_key: false,
  keys: null,
  is_published: false,
  deprecated: false,
  required_content_sources: null,
  group: 'Homebrew',
  artwork_url: null,
  meta_data: null,
});
const classTrait = TraitSchema.parse({
  id: 991905,
  created_at: '',
  name: 'Database Fixture',
  description: '',
  meta_data: { class_trait: true },
  content_source_id: source.id,
});
const fixtureClass = ClassSchema.parse({
  id: 991904,
  created_at: '',
  name: 'Database Fixture Class',
  rarity: 'COMMON',
  description: '',
  operations: [],
  skill_training_base: 0,
  trait_id: classTrait.id,
  artwork_url: null,
  deprecated: false,
  content_source_id: source.id,
  version: '1.0',
  meta_data: null,
});
const classFeature = AbilityBlockSchema.parse({
  id: 991906,
  created_at: '',
  name: 'Database Fixture Feature',
  operations: [],
  actions: null,
  level: 1,
  rarity: 'COMMON',
  availability: 'STANDARD',
  prerequisites: null,
  frequency: null,
  cost: null,
  trigger: null,
  requirements: null,
  access: null,
  description: '',
  special: null,
  type: 'class-feature',
  meta_data: null,
  traits: [classTrait.id],
  content_source_id: source.id,
  version: '1.0',
});
const pulse = SpellSchema.parse({
  id: 991902,
  created_at: '',
  name: 'Fixture Pulse',
  rank: 1,
  traditions: ['ARCANE'],
  rarity: 'COMMON',
  availability: 'STANDARD',
  cast: 'TWO-ACTIONS',
  requirements: null,
  cost: null,
  trigger: null,
  defense: null,
  range: '30 feet',
  area: null,
  targets: null,
  duration: null,
  description: '',
  heightened: null,
  traits: [],
  content_source_id: source.id,
  version: '1.0',
  meta_data: {},
});
const wave = SpellSchema.parse({ ...pulse, id: 991903, name: 'Fixture Wave', rank: 2 });
const spark = SpellSchema.parse({ ...pulse, id: 991907, name: 'Fixture Spark' });
const spells = [pulse, wave, spark];
const choices = [first, second].map((id, index) =>
  OperationSchema.parse({
    id,
    type: 'select',
    data: {
      title: 'Select a Spell',
      modeType: 'FILTERED',
      optionType: 'SPELL',
      optionsFilters: {
        id: index ? '4dd41bb1-99c2-4691-8437-018a882b021a' : 'dafc677e-8404-4a32-b15a-2400618034b1',
        type: 'SPELL',
        level: {},
        knownSpellSource: 'TECHNOMANCER',
        ...(index ? { distinctRankFromSelections: [first] } : {}),
        spellData: { type: 'NORMAL', castingSource: 'TECHNOMANCER', listSources: ['TECHNOMANCER_CACHE'] },
      },
    },
  })
);
const dailyChoice = OperationSchema.parse({
  id: daily,
  type: 'select',
  data: {
    title: 'Daily Library',
    modeType: 'FILTERED',
    optionType: 'SPELL',
    optionsFilters: {
      id: 'd649c54e-d055-4133-92aa-388d44857008',
      type: 'SPELL',
      level: { min: 1, max: 1 },
      knownSpellSource: caster,
      dailyPreparation: true,
      spellData: { type: 'NORMAL', castingSource: caster, listSources: [cache] },
    },
  },
});
const original = CharacterSchema.parse({
  id: 991902,
  created_at: '',
  updated_at: '2026-10-10T00:00:00.000Z',
  user_id: actor,
  campaign_id: null,
  name: 'Database fixture',
  level: 8,
  experience: 0,
  hero_points: 1,
  hp_current: 1,
  hp_temp: 0,
  stamina_current: 0,
  resolve_current: 0,
  notes: null,
  roll_history: null,
  spells: {
    slots: [],
    list: [
      { spell_id: pulse.id, rank: 1, source: 'TECHNOMANCER' },
      { spell_id: pulse.id, rank: 3, source: 'TECHNOMANCER' },
      { spell_id: wave.id, rank: 2, source: 'TECHNOMANCER' },
      { spell_id: spark.id, rank: 1, source: caster },
    ],
    innate_casts: [],
    focus_point_current: 0,
  },
  inventory: { items: [], coins: { cp: 0, sp: 0, gp: 0, pp: 0 } },
  details: { conditions: [], class: fixtureClass },
  meta_data: { reset_hp: false },
  operation_data: { selections: { [`character_${predefined}`]: predefinedChoice } },
  variants: null,
  content_sources: { enabled: [source.id] },
  companions: { list: [] },
  options: { custom_operations: true },
  custom_operations: [
    OperationSchema.parse({
      id: 'ee853837-dfe0-48e9-bb17-f2825c22072c',
      type: 'defineCastingSource',
      data: { variable: 'CASTING_SOURCES', value: `${caster}:::PREPARED-LIST:::ARCANE:::ATTRIBUTE_INT` },
    }),
    OperationSchema.parse({
      id: 'b947b5a6-ad0f-4228-9b2b-43e3cf065c02',
      type: 'giveSpellSlot',
      data: { castingSource: caster, spellListSource: cache, slots: [{ lvl: 8, rank: 1, amt: 1 }] },
    }),
    ...choices,
    {
      id: predefined,
      type: 'select',
      data: {
        title: 'Predefined Spell',
        modeType: 'PREDEFINED',
        optionType: 'SPELL',
        optionsPredefined: [
          {
            id: predefinedChoice,
            type: 'SPELL',
            operation: {
              id: 'd1a2304b-6f11-489a-af95-a841c9068e39',
              type: 'giveSpell',
              data: { type: 'NORMAL', castingSource: 'TECHNOMANCER', rank: 1, spellId: pulse.id },
            },
          },
        ],
      },
    },
    dailyChoice,
  ],
});

type FixtureFailureStage =
  | 'worker-constructor'
  | 'worker-url-inspection'
  | 'worker-descriptor'
  | 'worker-message-observer'
  | 'worker-message-setter'
  | 'worker-post-message'
  | 'worker-error'
  | 'worker-messageerror'
  | 'worker-response-error'
  | 'worker-response-inspection';
type FixtureFailure = { stage: FixtureFailureStage; message: string };

/** [WG-WORKER-DIAGNOSTIC] Keep safe error identity, never raw payloads, URLs or stacks. */
function getFixtureFailureMessage(value: unknown): string {
  let name = 'unknown error';
  let message: unknown;
  try {
    if (value !== null && typeof value === 'object') {
      if (
        'name' in value &&
        typeof value.name === 'string' &&
        [
          'Error',
          'EvalError',
          'RangeError',
          'ReferenceError',
          'SyntaxError',
          'TypeError',
          'URIError',
          'DataCloneError',
          'InvalidStateError',
          'SecurityError',
          'NotSupportedError',
          'QuotaExceededError',
          'AbortError',
        ].includes(value.name)
      )
        name = value.name;
      if ('message' in value) message = value.message;
    }
  } catch {
    return 'error identity unavailable';
  }
  if (
    typeof message === 'string' &&
    (message === 'Native worker message setter unavailable in fixture' ||
      message === 'Reload the character to recover its save version' ||
      message === 'Could not recover character save' ||
      message === 'Character save returned no saved row' ||
      message === 'update-character failed for character 991902' ||
      message === 'Maximum call stack size exceeded' ||
      /^[A-Za-z_$][A-Za-z0-9_$]{0,63} is not defined$/.test(message) ||
      /^Cannot read properties of (undefined|null) \(reading '(id|data|status|onmessage|prototype|postMessage|_meta_data|dailyPreparation|name|_select_uuid|set|call)'\)$/.test(
        message
      ))
  )
    return `${name}: ${message}`;
  return `${name} (raw detail omitted)`;
}

type FixtureOrigin = 'compiled-3000' | 'source-5174' | 'other' | 'missing';

/** Classify only known synthetic origins; never include a raw Origin header or page URL. */
function getFixtureOrigin(value: unknown): FixtureOrigin {
  if (value === undefined || value === null) return 'missing';
  if (value === 'http://localhost:3000') return 'compiled-3000';
  if (value === 'http://localhost:5174') return 'source-5174';
  return 'other';
}

type SaveVisitObservation = {
  visit: number;
  origin: FixtureOrigin;
  restored: boolean;
  pageHidden: boolean;
  saveFailureAfterPagehide: boolean;
  observedSaveCalls: number;
  saveFailures: string[];
  requestFailures: string[];
};

type DailyOption = {
  id: number;
  name: string;
  _select_uuid: string;
  _meta_data: { dailyPreparation: true };
};
type HeldAcknowledgement = { requestId: number; options: DailyOption[]; deliver: () => void };
type WorkerControl = {
  saveVisit: SaveVisitObservation;
  fixtureFailures: FixtureFailure[];
  saveFailures: string[];
  saveCalls: number;
  hold: boolean;
  queued: Array<() => void>;
  holdAcknowledgements: boolean;
  acknowledgements: HeldAcknowledgement[];
  offeredDailyOptions: DailyOption[];
  release: () => void;
  deliverLatest: () => void;
  releaseAcknowledgements: () => void;
  restore: () => void;
};
type FixtureWindow = Window & {
  Worker: typeof Worker;
  eval: typeof eval;
  databaseWorkerControl: WorkerControl;
};

/** Inspect the actual worker's opt-in descriptors, without assuming its opaque identity format. */
function getDailyOptions(value: unknown): DailyOption[] {
  if (value === null || typeof value !== 'object') return [];
  if (
    '_meta_data' in value &&
    value._meta_data !== null &&
    typeof value._meta_data === 'object' &&
    'dailyPreparation' in value._meta_data &&
    value._meta_data.dailyPreparation === true &&
    'id' in value &&
    typeof value.id === 'number' &&
    'name' in value &&
    typeof value.name === 'string' &&
    '_select_uuid' in value &&
    typeof value._select_uuid === 'string'
  )
    return [
      {
        id: value.id,
        name: value.name,
        _select_uuid: value._select_uuid,
        _meta_data: { dailyPreparation: true },
      },
    ];
  return Object.values(value).flatMap(getDailyOptions);
}

describe('Source-owned database spell choices', () => {
  let saved = structuredClone(original);
  let activeWorkerControl: WorkerControl | null = null;
  let nextFixtureVisit = 0;
  // Retain plain observations only, not outgoing windows, worker controls or delivery closures.
  const saveVisitHistory: SaveVisitObservation[] = [];
  const getSaveVisitHistory = (): string => {
    try {
      return JSON.stringify(
        saveVisitHistory.map((observation) => ({
          ...observation,
          active: observation === activeWorkerControl?.saveVisit,
          saveFailures: observation.saveFailures.slice(0, 16),
        }))
      );
    } catch {
      return 'unavailable';
    }
  };
  const visit = (page: 'builder' | 'sheet' = 'builder') => {
    cy.visit(`/${page}/${original.id}`, {
      onBeforeLoad(win) {
        const fixtureWindow = win as unknown as FixtureWindow;
        const NativeWorker = fixtureWindow.Worker;
        const saveVisit: SaveVisitObservation = {
          visit: ++nextFixtureVisit,
          origin: getFixtureOrigin(win.location.origin),
          restored: false,
          pageHidden: false,
          saveFailureAfterPagehide: false,
          observedSaveCalls: 0,
          saveFailures: [],
          requestFailures: [],
        };
        const control: WorkerControl = {
          saveVisit,
          fixtureFailures: [],
          saveFailures: saveVisit.saveFailures,
          saveCalls: 0,
          hold: false,
          queued: [],
          holdAcknowledgements: false,
          acknowledgements: [],
          offeredDailyOptions: [],
          release() {
            this.hold = false;
            for (const send of this.queued.splice(0)) send();
          },
          deliverLatest() {
            const newest = this.acknowledgements.sort((left, right) => left.requestId - right.requestId).pop();
            if (!newest) throw new Error('No held fixture acknowledgement');
            newest.deliver();
          },
          releaseAcknowledgements() {
            this.holdAcknowledgements = false;
            for (const acknowledgement of this.acknowledgements.splice(0)) acknowledgement.deliver();
          },
          restore() {
            this.release();
            this.releaseAcknowledgements();
            fixtureWindow.Worker = NativeWorker;
            try {
              saveVisit.restored = true;
            } catch {
              // Temporary observation cannot change the existing release or restoration behavior.
            }
          },
        };
        fixtureWindow.databaseWorkerControl = control;
        const recordFixtureFailure = (stage: FixtureFailureStage, error: unknown): void => {
          try {
            if (control.fixtureFailures.length < 16)
              control.fixtureFailures.push({ stage, message: getFixtureFailureMessage(error) });
          } catch {
            // Temporary observation must never replace the original error or packet delivery.
          }
        };
        activeWorkerControl = control;
        try {
          if (saveVisitHistory.length === 16) saveVisitHistory.shift();
          saveVisitHistory.push(saveVisit);
        } catch {
          // Temporary observation cannot change fixture setup.
        }
        try {
          win.addEventListener('pagehide', () => {
            saveVisit.pageHidden = true;
          });
        } catch {
          // Optional observation cannot block the fixture or browser lifecycle.
        }
        const originalConsoleError = win.console.error;
        win.console.error = function (...args: unknown[]) {
          try {
            if (args[0] === 'Character save failed:' && control.saveFailures.length < 16) {
              control.saveFailures.push(getFixtureFailureMessage(args[1]));
              saveVisit.saveFailureAfterPagehide ||= saveVisit.pageHidden;
            }
            if (saveVisit.requestFailures.length < 16 && typeof args[0] === 'string') {
              if (args[0] === "Request to 'update-character' failed:")
                saveVisit.requestFailures.push('transport-error');
              const http = /^Request to 'update-character' failed \(HTTP ([1-5][0-9]{2})\)$/.exec(args[0]);
              if (http) saveVisit.requestFailures.push(`HTTP-${http[1]}`);
            }
          } catch {
            // Temporary observation cannot change application error handling.
          }
          originalConsoleError.apply(win.console, args);
        };
        fixtureWindow.Worker = class extends NativeWorker {
          private fixtureCalculation: boolean;
          private fixtureRequests: Set<number>;
          constructor(url: string | URL, options?: WorkerOptions) {
            try {
              super(url, options);
            } catch (error) {
              try {
                if (isOperationsWorkerURL(url, win.location.href)) recordFixtureFailure('worker-constructor', error);
              } catch (inspectionError) {
                recordFixtureFailure('worker-url-inspection', inspectionError);
              }
              throw error;
            }
            this.fixtureRequests = new Set<number>();
            try {
              this.fixtureCalculation = isOperationsWorkerURL(url, win.location.href);
            } catch (error) {
              recordFixtureFailure('worker-url-inspection', error);
              throw error;
            }
            if (this.fixtureCalculation) {
              let descriptor: PropertyDescriptor;
              try {
                const nativeDescriptor = Object.getOwnPropertyDescriptor(NativeWorker.prototype, 'onmessage');
                if (!nativeDescriptor?.set) throw new Error('Native worker message setter unavailable in fixture');
                descriptor = nativeDescriptor;
              } catch (error) {
                recordFixtureFailure('worker-descriptor', error);
                throw error;
              }
              let listener: ((this: Worker, event: MessageEvent<unknown>) => unknown) | null = null;
              // Optional diagnostic listeners cannot make an otherwise valid constructor fail.
              try {
                this.addEventListener('error', (event: ErrorEvent) => {
                  try {
                    recordFixtureFailure('worker-error', event.error ?? { name: 'Error', message: event.message });
                  } catch {
                    // Do not change native event delivery if diagnostic event inspection fails.
                  }
                });
              } catch (error) {
                recordFixtureFailure('worker-message-observer', error);
              }
              try {
                this.addEventListener('messageerror', () =>
                  recordFixtureFailure('worker-messageerror', { name: 'DataCloneError' })
                );
              } catch (error) {
                recordFixtureFailure('worker-message-observer', error);
              }
              try {
                Object.defineProperty(this, 'onmessage', {
                  configurable: true,
                  get: () => listener,
                  set: (next: typeof listener) => {
                    listener = next;
                    try {
                      descriptor.set!.call(this, (event: MessageEvent<unknown>) => {
                        let response: { id?: number; status?: unknown; message?: unknown; data?: unknown };
                        let responseId: number | undefined;
                        try {
                          response = event.data as typeof response;
                          responseId = response.id;
                        } catch (error) {
                          recordFixtureFailure('worker-response-inspection', error);
                          throw error;
                        }
                        if (responseId === undefined || !this.fixtureRequests.has(responseId)) {
                          next?.call(this, event);
                          return;
                        }
                        let options: DailyOption[];
                        try {
                          if (response.status === 'error')
                            recordFixtureFailure('worker-response-error', { name: 'Error', message: response.message });
                          options = getDailyOptions(response.data);
                        } catch (error) {
                          recordFixtureFailure('worker-response-inspection', error);
                          throw error;
                        }
                        const deliver = () => {
                          control.offeredDailyOptions = options;
                          next?.call(this, event);
                        };
                        if (control.holdAcknowledgements)
                          control.acknowledgements.push({ requestId: responseId, options, deliver });
                        else deliver();
                      });
                    } catch (error) {
                      recordFixtureFailure('worker-message-setter', error);
                      throw error;
                    }
                  },
                });
              } catch (error) {
                recordFixtureFailure('worker-message-observer', error);
                throw error;
              }
            }
          }
          postMessage(message: unknown, options?: StructuredSerializeOptions | Transferable[]) {
            const send = () => {
              try {
                if (Array.isArray(options)) super.postMessage(message, options);
                else super.postMessage(message, options);
              } catch (error) {
                if (this.fixtureCalculation) recordFixtureFailure('worker-post-message', error);
                throw error;
              }
            };
            const packet = message as { id?: number; execution?: { data?: { character?: { id?: number } } } };
            if (
              this.fixtureCalculation &&
              packet.id !== undefined &&
              packet.execution?.data?.character?.id === original.id
            )
              this.fixtureRequests.add(packet.id);
            if (this.fixtureCalculation && control.hold && packet.execution?.data?.character?.id === original.id)
              control.queued.push(send);
            else send();
          }
        };
        const host = new URL(Cypress.env('functions_url')).hostname.split('.')[0];
        const token = `${win.btoa('{}')}.${win.btoa(JSON.stringify({ sub: actor, exp: 4102444800 }))}.fixture`;
        win.localStorage.setItem(
          `sb-${host}-auth-token`,
          JSON.stringify({
            access_token: token,
            refresh_token: 'fixture',
            token_type: 'bearer',
            expires_at: 4102444800,
            expires_in: 3600,
            user: {
              id: actor,
              aud: 'authenticated',
              role: 'authenticated',
              email: 'fixture@example.invalid',
              app_metadata: {},
              user_metadata: {},
              created_at: '',
            },
          })
        );
        win.localStorage.setItem('user-data', JSON.stringify(profile));
      },
    });
    if (page === 'builder') openCustom();
  };

  beforeEach(() => {
    saved = structuredClone(original);
    activeWorkerControl = null;
    cy.intercept('**/auth/v1/**', () => {
      throw new Error('Database fixture must not contact authentication');
    });
    cy.intercept('**/rest/v1/**', () => {
      throw new Error('Database fixture must not contact the database');
    });
    cy.intercept('**/storage/v1/**', (req) => {
      if (
        req.method === 'GET' &&
        req.url === 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/backgrounds/default/4.webp'
      ) {
        req.reply({
          statusCode: 200,
          headers: { 'content-type': 'image/svg+xml' },
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>',
        });
        return;
      }
      throw new Error(`Unexpected database fixture storage request: ${req.method} ${new URL(req.url).pathname}`);
    });
    cy.intercept('**/functions/v1/*', (req) => {
      expect(req.method, 'fixture API method').to.equal('POST');
      const endpoint = new URL(req.url).pathname.split('/').pop()!;
      let data: unknown;
      if (endpoint === 'get-user') data = profile;
      else if (endpoint === 'find-character') data = req.body.id !== undefined ? saved : [saved];
      else if (endpoint === 'update-character') {
        expect(req.body.id, 'only the synthetic character may be saved').to.equal(original.id);
        if (activeWorkerControl) activeWorkerControl.saveCalls++;
        try {
          if (activeWorkerControl) activeWorkerControl.saveVisit.observedSaveCalls = activeWorkerControl.saveCalls;
        } catch {
          // This is current-interceptor attribution, not proof of the requesting page's ownership.
        }
        saved = CharacterSchema.parse({ ...saved, ...req.body, updated_at: new Date().toISOString() });
        data = [saved];
      } else if (endpoint === 'find-content-source') data = req.body.id !== undefined ? source : [source];
      else if (endpoint === 'find-class') {
        if (typeof req.body.id === 'number') {
          expect(req.body.id, 'only the synthetic class may be read by ID').to.equal(fixtureClass.id);
          data = fixtureClass;
        } else data = [fixtureClass];
      } else if (endpoint === 'find-trait') {
        if (typeof req.body.id === 'number') {
          expect(req.body.id, 'only the synthetic trait may be read by ID').to.equal(classTrait.id);
          data = classTrait;
        } else data = [classTrait];
      } else if (endpoint === 'find-ability-block') {
        if (typeof req.body.id === 'number') {
          expect(req.body.id, 'only the synthetic feature may be read by ID').to.equal(classFeature.id);
          data = classFeature;
        } else data = [classFeature];
      } else if (endpoint === 'find-spell') {
        if (typeof req.body.id === 'number') {
          data = spells.find((spell) => spell.id === req.body.id);
          expect(data, 'only seeded spells may be read by ID').not.to.equal(undefined);
        } else data = spells;
      } else if (
        [
          'get-content-versions',
          'find-item',
          'find-ancestry',
          'find-background',
          'find-language',
          'find-archetype',
          'find-versatile-heritage',
          'find-class-archetype',
          'find-creature',
        ].includes(endpoint)
      )
        data = [];
      else if (endpoint === 'report-client-error') {
        const code: unknown = req.body?.code;
        const category =
          typeof code === 'string' &&
          [
            'content_load_failed',
            'calculation_failed',
            'save_failed',
            'auth_failed',
            'update_failed',
            'chunk_failed',
            'unhandled_error',
            'unhandled_rejection',
          ].includes(code)
            ? code
            : 'unrecognized-category';
        // [WG-WORKER-DIAGNOSTIC] This request remains forbidden, including when no stage was captured.
        throw new Error(
          `Unexpected database fixture API: report-client-error (category=${category}; requestOrigin=${getFixtureOrigin(req.headers.origin)}; activeOrigin=${activeWorkerControl?.saveVisit.origin ?? 'missing'}; activeVisit=${activeWorkerControl?.saveVisit.visit ?? 0}; saveCalls=${activeWorkerControl?.saveCalls ?? 0}; savedHasVersion=${Boolean(saved.updated_at)}; saveFailures=${JSON.stringify(activeWorkerControl?.saveFailures ?? [])}; fixtureFailures=${JSON.stringify(
            activeWorkerControl?.fixtureFailures ?? []
          )}; saveHistory=${getSaveVisitHistory()})`
        );
      } else throw new Error(`Unexpected database fixture API: ${endpoint}`);
      req.reply({ statusCode: 200, body: { status: 'success', data } });
    });
  });

  afterEach(() => {
    cy.window().then((win) => (win as unknown as FixtureWindow).databaseWorkerControl?.restore());
  });

  const customPanel = () =>
    cy
      .get('[data-wg-name="level-0"]')
      .contains('.mantine-Accordion-control', /^Custom/, { timeout: 30000 })
      .closest('.mantine-Accordion-item')
      .find('.mantine-Accordion-panel');
  const openCustom = () => {
    cy.contains('.mantine-Stepper-step', 'Builder', { timeout: 30000 }).click();
    cy.get('[data-wg-name="level-0"]', { timeout: 30000 })
      .should('be.visible')
      .contains('.mantine-Accordion-control', 'Initial Stats')
      .should('be.visible')
      .click({ timeout: 30000 });
    cy.get('[data-wg-name="level-0"]')
      .contains('.mantine-Accordion-control', /^Custom/, { timeout: 30000 })
      .should('be.visible')
      .click({ timeout: 30000 });
    customPanel().find('.selection-choice-base').should('have.length', 4);
  };
  const selection = (index: number) => customPanel().find('.selection-choice-base').eq(index);
  const reopen = (index: number) => selection(index).find('button').eq(1).click();
  const searchPulse = () => cy.get('.mantine-Modal-body input[placeholder="Search spells"]').type('Fixture Pulse');
  const searchSpell = (name: string) =>
    cy.get('.mantine-Modal-body input[placeholder="Search spells"]').last().type(name);
  const selectButtons = () =>
    cy.get('.mantine-Modal-body button').filter((_, button) => button.textContent === 'Select');
  const rankSelect = (rank: number) =>
    cy
      .get('.mantine-Modal-body .mantine-Group-root > .mantine-Text-root')
      .filter((_, label) => label.textContent?.trim() === `${rank}.`)
      .should('have.length', 1)
      .parent('.mantine-Group-root')
      .should('contain.text', pulse.name)
      .find('button')
      .filter((_, button) => button.textContent === 'Select')
      .should('have.length', 1);
  const dailySelect = () => selection(3);
  const chooseDaily = (name: string) => {
    dailySelect()
      .contains('button', /^Daily Library$/)
      .click();
    searchSpell(name);
    selectButtons().should('have.length', 1).should('not.be.disabled').click();
  };
  const modalWithTitle = (title: string) =>
    cy
      .get('body')
      .find('.mantine-Modal-content')
      .filter((_, content) => content.querySelector('.mantine-Modal-title')?.textContent?.trim() === title);
  const closePicker = (title = 'Daily Library') => {
    modalWithTitle(title).should('have.length', 1).find('button.mantine-Modal-close').click();
    cy.get('body').should((body) => {
      const remaining = body
        .find('.mantine-Modal-content')
        .filter((_, content) => content.querySelector('.mantine-Modal-title')?.textContent?.trim() === title);
      expect(remaining, `closed ${title} picker`).to.have.length(0);
    });
  };
  const fixtureSelections = (character: Character) => {
    const selections = character.operation_data?.selections;
    if (!selections) throw new Error('Synthetic character selections are missing');
    return selections;
  };
  const dailyIdentity = (character: Character) => {
    const identity = fixtureSelections(character)[`character_${daily}`];
    expect(identity, 'opaque daily identity in actual character data').to.be.a('string').and.not.be.empty;
    return identity as string;
  };
  const savedDailyIdentity = () => dailyIdentity(saved);

  /** Load only existing modules from this isolated app, using its already-loaded Jotai instance. */
  const mountedCharacter = () =>
    cy.window().then(async (win) => {
      const fixtureWindow = win as unknown as FixtureWindow;
      const jotai = win.performance
        .getEntriesByType('resource')
        .find((entry) => new URL(entry.name).pathname.endsWith('/node_modules/.vite/deps/jotai.js'));
      expect(jotai, 'existing app Jotai module').not.to.equal(undefined);
      const jotaiURL = new URL(jotai!.name);
      expect(jotaiURL.origin, 'fixture module import stays on the owned preview').to.equal(win.location.origin);
      type AppStore = { get: (atom: unknown) => Character | null; set: (atom: unknown, value: Character) => void };
      type RestModule = { handleRest: (id: 'CHARACTER', entity: Character, setter: (next: unknown) => void) => void };
      // Cross-window dynamic imports cannot carry TypeScript module inference; all returned character data is parsed.
      const [rest, atoms, jotaiModule] = (await fixtureWindow.eval(
        `Promise.all([import('/src/pages/character_sheet/entity-handler.ts'), import('/src/atoms/characterAtoms.ts'), import(${JSON.stringify(jotaiURL.href)})])`
      )) as [RestModule, { characterState: unknown }, { getDefaultStore: () => AppStore }];
      const store = jotaiModule.getDefaultStore();
      const character = CharacterSchema.parse(store.get(atoms.characterState));
      expect(character.id, 'only the synthetic mounted character may be read or changed').to.equal(original.id);
      return { character, rest, store, characterState: atoms.characterState };
    });

  const restMountedBuilder = () =>
    mountedCharacter().then(({ character, rest, store, characterState }) => {
      rest.handleRest('CHARACTER', character, (next) => store.set(characterState, CharacterSchema.parse(next)));
    });

  const openSpells = (phone: boolean) => {
    cy.contains('Hit Points', { timeout: 30000 }).should('be.visible');
    if (phone) {
      cy.get('button[aria-label="Panel Grid"]').click();
      cy.contains('button', /^Spells$/).click();
    } else {
      cy.get('body').then(($body) => {
        const tab = $body.find('[role="tab"]').filter((_, element) => element.textContent?.trim() === 'Spells');
        if (tab.length) cy.wrap(tab.first()).click();
        else {
          cy.get('button[aria-label="Tab Options"]').trigger('mouseover');
          cy.contains('[role="menuitem"]', /^Spells$/).click();
          // React dispatches its mouseleave handler from the native mouseout event.
          cy.get('button[aria-label="Tab Options"]').trigger('mouseout', {
            eventConstructor: 'MouseEvent',
            relatedTarget: null,
          });
          cy.get('body').then(($body) => {
            const menu = $body.find('[role="menu"]');
            if (menu.length) cy.wrap(menu).trigger('mouseout', { eventConstructor: 'MouseEvent', relatedTarget: null });
          });
          cy.get('[role="menu"]').should('not.exist');
        }
      });
    }
    cy.get('[data-wg-name="spells-accordion"]', { timeout: 30000 }).should('be.visible');
  };

  const manageCacheSlot = () => {
    cy.get('[data-wg-name="prepared-technomancer"]').contains('button', 'Manage').scrollIntoView().click();
    cy.contains('.mantine-Modal-content', 'Manage Spells - Technomancer')
      .find('[data-wg-name="rank-1"]')
      .as('cacheSlot');
  };

  const expectOtherSelections = () => {
    cy.then(() => {
      expect(fixtureSelections(saved)[`character_${first}`], 'Expanded Cache stays saved').to.equal(`${wave.id}:2`);
      expect(fixtureSelections(saved)[`character_${predefined}`], 'PREDEFINED UUID stays saved').to.equal(
        predefinedChoice
      );
    });
    reopen(0);
    searchSpell(wave.name);
    selectButtons().should('have.length', 1).should('be.disabled');
    closePicker('Select a Spell');
    reopen(2);
    searchPulse();
    selectButtons().should('have.length', 1).should('be.disabled');
    closePicker('Predefined Spell');
  };

  const waitForDailySave = (spellId: number) => {
    cy.window({ timeout: 15000 }).should((win) => {
      const options = (win as unknown as FixtureWindow).databaseWorkerControl.offeredDailyOptions;
      const identity = savedDailyIdentity();
      expect(
        options.some((option) => option.id === spellId && option._select_uuid === identity),
        'saved choice matches an actually offered daily descriptor'
      ).to.equal(true);
    });
  };

  it('keeps both ranks searchable and switches an unsaved choice while its recalculation is held', () => {
    visit();
    cy.window().then((win) => {
      (win as unknown as FixtureWindow).databaseWorkerControl.hold = true;
    });
    selection(0).contains('button', 'Select a Spell').click();
    searchPulse();
    selectButtons().should('have.length', 2);
    rankSelect(1).click();
    cy.window().should((win) =>
      expect((win as unknown as FixtureWindow).databaseWorkerControl.queued.length).to.be.greaterThan(0)
    );
    reopen(0);
    searchPulse();
    selectButtons().should('have.length', 2);
    rankSelect(1).should('be.disabled');
    rankSelect(3).should('not.be.disabled').click();
    reopen(0);
    searchPulse();
    rankSelect(1).should('not.be.disabled');
    rankSelect(3).should('be.disabled');
    cy.get('.mantine-Modal-header button').click();
    cy.window().then((win) => (win as unknown as FixtureWindow).databaseWorkerControl.release());
    cy.wrap(null, { timeout: 15000 }).should(() =>
      expect(fixtureSelections(saved)[`character_${first}`]).to.equal(`${pulse.id}:3`)
    );
    cy.reload();
    openCustom();
    reopen(0);
    searchPulse();
    selectButtons().should('have.length', 2);
    rankSelect(1).should('not.be.disabled');
    rankSelect(3).should('be.disabled');
    cy.screenshot('database-spell-ranks-saved');
  });

  it('limits only the second choice to a different rank from the first saved choice', () => {
    fixtureSelections(saved)[`character_${first}`] = `${pulse.id}:3`;
    visit();
    selection(1).contains('button', 'Select a Spell').click();
    searchPulse();
    selectButtons().should('have.length', 1).should('not.be.disabled');
    rankSelect(1).click();
    cy.wrap(null, { timeout: 15000 }).should(() =>
      expect(fixtureSelections(saved)[`character_${second}`]).to.equal(`${pulse.id}:1`)
    );
  });

  it('retains authored UUID and selected state for PREDEFINED spell choices', () => {
    visit();
    reopen(2);
    searchPulse();
    selectButtons().should('have.length', 1).should('be.disabled');
    cy.then(() => expect(fixtureSelections(saved)[`character_${predefined}`]).to.equal(predefinedChoice));
  });

  it('reopens the saved rank-aware picker on a phone without collapsing the alternate rank', () => {
    cy.viewport(390, 844);
    fixtureSelections(saved)[`character_${first}`] = `${pulse.id}:3`;
    visit();
    reopen(0);
    searchPulse();
    selectButtons().should('have.length', 2);
    rankSelect(1).should('not.be.disabled');
    rankSelect(3).should('be.disabled');
    cy.document().then((doc) => expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth));
    cy.screenshot('database-spell-ranks-saved-phone');
  });

  for (const phone of [false, true]) {
    const viewport = phone ? 'phone' : 'desktop';

    it(`persists Daily Library, prepares its spell, and requires a new selection after visible Rest on ${viewport}`, () => {
      cy.viewport(phone ? 390 : 1280, phone ? 844 : 900);
      fixtureSelections(saved)[`character_${first}`] = `${wave.id}:2`;
      let initialIdentity: string;
      visit();
      chooseDaily(pulse.name);
      waitForDailySave(pulse.id);
      cy.then(() => {
        initialIdentity = savedDailyIdentity() as string;
      });
      cy.reload();
      openCustom();
      reopen(3);
      searchPulse();
      selectButtons().should('have.length', 1).should('be.disabled');
      closePicker();

      visit('sheet');
      openSpells(phone);
      manageCacheSlot();
      cy.get('@cacheSlot')
        .contains('button', /^Select Spell$/)
        .click();
      searchPulse();
      selectButtons().should('have.length', 1).should('not.be.disabled').click();
      cy.wrap(null, { timeout: 15000 }).should(() =>
        expect(
          saved.spells!.slots.some((slot) => slot.source === caster && slot.rank === 1 && slot.spell_id === pulse.id),
          'daily spell prepared through the actual slot picker'
        ).to.equal(true)
      );
      closePicker('Manage Spells - Technomancer');

      cy.contains('button', /^Rest$/)
        .scrollIntoView()
        .click();
      cy.contains('.mantine-Modal-content', 'Are you sure you want to rest?')
        .contains('button', /^Rest$/)
        .click();
      cy.wrap(null, { timeout: 15000 }).should(() =>
        expect(saved.operation_data!.daily_preparation, 'Rest persists a new preparation generation').to.be.a('string')
      );
      manageCacheSlot();
      cy.get('@cacheSlot')
        .contains('button', /^Select Spell$/)
        .should('be.visible')
        .click();
      searchPulse();
      selectButtons().should('have.length', 0);
      closePicker('Select Spell');
      closePicker('Manage Spells - Technomancer');

      visit();
      dailySelect()
        .contains('button', /^Daily Library$/)
        .should('be.visible');
      expectOtherSelections();
      chooseDaily(spark.name);
      waitForDailySave(spark.id);
      cy.then(() =>
        expect(savedDailyIdentity(), 'new choice does not reuse the expired identity').not.to.equal(initialIdentity)
      );
      cy.reload();
      openCustom();
      reopen(3);
      searchSpell(spark.name);
      selectButtons().should('have.length', 1).should('be.disabled');
      if (phone)
        cy.document().then((doc) =>
          expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth)
        );
      cy.screenshot(`daily-spell-library-after-rest-${viewport}`);
    });

    it(
      `expires a mounted optimistic daily choice and ignores its late native acknowledgement on ${viewport}`,
      // Source-module access must use the same app store as the mounted picker.
      { baseUrl: Cypress.env('module_preview_url') ?? Cypress.config('baseUrl') },
      () => {
        cy.viewport(phone ? 390 : 1280, phone ? 844 : 900);
        fixtureSelections(saved)[`character_${first}`] = `${wave.id}:2`;
        let initialIdentity: string;
        let preparation: string;
        visit();
        cy.window().then((win) => {
          (win as unknown as FixtureWindow).databaseWorkerControl.holdAcknowledgements = true;
        });
        chooseDaily(pulse.name);
        cy.window().should((win) =>
          expect((win as unknown as FixtureWindow).databaseWorkerControl.acknowledgements.length).to.be.greaterThan(0)
        );
        mountedCharacter().then(({ character }) => {
          initialIdentity = dailyIdentity(character);
        });
        reopen(3);
        searchPulse();
        selectButtons().should('have.length', 1).should('be.disabled');
        closePicker();

        restMountedBuilder();
        cy.window().should((win) => {
          const acknowledgements = (win as unknown as FixtureWindow).databaseWorkerControl.acknowledgements;
          expect(
            acknowledgements.some((acknowledgement) =>
              acknowledgement.options.some(
                (option) => option.id === pulse.id && option._select_uuid === initialIdentity
              )
            ),
            'the old native acknowledgement is still held'
          ).to.equal(true);
          expect(
            acknowledgements.some((acknowledgement) =>
              acknowledgement.options.some(
                (option) => option.id === pulse.id && option._select_uuid !== initialIdentity
              )
            ),
            'the new generation native acknowledgement has arrived'
          ).to.equal(true);
        });
        cy.window().then((win) => (win as unknown as FixtureWindow).databaseWorkerControl.deliverLatest());
        dailySelect()
          .contains('button', /^Daily Library$/)
          .should('be.visible');
        cy.wrap(null, { timeout: 15000 }).should(() => {
          expect(saved.operation_data!.daily_preparation).to.be.a('string');
          preparation = saved.operation_data!.daily_preparation!;
        });
        cy.window().then((win) => {
          const control = (win as unknown as FixtureWindow).databaseWorkerControl;
          expect(
            control.offeredDailyOptions.some(
              (option) => option.id === pulse.id && option._select_uuid !== initialIdentity
            ),
            'Rest offers a new opaque daily identity'
          ).to.equal(true);
          control.releaseAcknowledgements();
        });
        dailySelect()
          .contains('button', /^Daily Library$/)
          .should('be.visible');
        cy.then(() =>
          expect(
            saved.operation_data!.daily_preparation,
            'late native result cannot restore the old generation'
          ).to.equal(preparation)
        );
        expectOtherSelections();
        chooseDaily(spark.name);
        waitForDailySave(spark.id);
        reopen(3);
        searchSpell(spark.name);
        selectButtons().should('have.length', 1).should('be.disabled');
        cy.screenshot(`daily-spell-library-mounted-rest-${viewport}`);
      }
    );
  }
});
