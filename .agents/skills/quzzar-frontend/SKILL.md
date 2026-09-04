---
name: quzzar-frontend
description: Quzzar's frontend conventions covering the layer boundary between shared UI and app code, component structure, styling and tokens, state, forms, animation, accessibility, UI copy, and the component gallery. Use before writing or changing any UI code, React components, styles, or client-side state.
---

# quzzar-frontend

Frontend conventions. Repo-wide rules (naming, file organization, error handling, formatting)
live in `quzzar-workplace`. Read that too.

This file covers **how to write** UI code. Whether the result actually looks good, and how to
render and critique it instead of guessing, is `quzzar-design`. Read that as well for anything
where "does it look right" is the real acceptance criterion.

## When to use

- Writing or changing a component, page, layout, or route.
- Touching styles, design tokens, or theme.
- Adding client state, a data fetch, or a form.
- Writing UI copy.

## First: read the repo's own context

`CLAUDE.md` at the repo root carries this repo's real framework, styling approach, and
commands. Repo facts beat anything general below. If it has no
`<!-- quzzar-skills:start -->` block, run the `setup` skill first.

## Tool choices are already decided

**Which** tool to use is fixed by the stack table in `quzzar-workplace`: React + Vite +
TypeScript, React Router, vanilla-extract, Jotai, React Query, nuqs, TanStack Table, React Hook
Form, Radix, Motion, Playwright, and the rest, each with its stated role and layer.

**The list is closed.** It's a standard, so a new library is the exception, not a judgment call.
When a frontend need comes up (dates, a table, a toast, a command palette, URL state), the
answer is almost always already on the list. If a genuine gap appears, decide the layer first
(does it belong inside the shared UI package, or app-level?), then raise it with
`AskUserQuestion`.

---

## The layer boundary

The one rule that shapes everything else: **presentation libraries may live inside the shared UI
package; data, state, and routing libraries stay app-level and never become its dependencies.**

Coupling a design system to the data layer is the thing to avoid. A marketing site or a
component gallery must be able to consume the UI package without dragging in a query client, a
router, or database types.

So: Radix, Motion, and the icon set can be dependencies of the shared package. React Query,
Jotai, React Router, nuqs, and anything 3D cannot.

## Component structure

- One component per file, `PascalCase.tsx` (see `quzzar-workplace` for naming).
- **Named exports**, barrelled through the package's `src/index.ts`.
- Each interactive component wraps a primitive from the accessible-primitives library and is
  skinned with token CSS. That's what keeps behaviour correct and appearance ours.
- A file earns promotion into the shared package when a second surface needs it, not when you
  anticipate one might.

## Don't re-implement what the stack already owns

Before adding a hook or a utility, check whether a stack library already covers it. These have
a settled home:

| Need | Use |
| --- | --- |
| local / session storage | Jotai `atomWithStorage` |
| data fetching, server state | React Query |
| pagination, row selection, sorting | TanStack Table |
| input state, masks, validation | React Hook Form + Zod |
| URL / query-string state | nuqs |
| focus trap, click-outside, roving tabindex | Radix primitives |
| slider drag, radial move | Radix Slider or Motion |

A shared hooks library is for what's left over: genuinely generic utilities. Keep its rationale
at the top of its barrel file so nobody re-implements something the stack already provides.

Prefer vendoring a small utility (with attribution) over taking a dependency, when it keeps the
shared package light.

## Styling

vanilla-extract: zero-runtime CSS-in-TypeScript, compiled to static CSS at build time via the
Vite integration. Class names, variables, and theme contracts are type-checked.

This is core guideline 4 applied to CSS: the compiler catches a bad token reference instead of it
silently rendering nothing.

## Design tokens

**Tokens are the source of truth.** A raw hex or px value in a component is a bug. It's a value
that can't be themed and won't move when the system does.

Motion has tokens too (duration, easing). Use them rather than hardcoding timings, so animation
stays consistent across components and respects a single point of change.

## Animation

- **Motion is the default**: component enter/exit, layout animations, gestures, parallax.
- **GSAP is narrow**: SVG plugins (DrawSVG, MorphSVG, MotionPath) and heavy scroll-scrubbed
  timelines. Not for ordinary component animation.
- **Overlays are the exception.** Let the primitive library's `data-state` CSS drive overlay
  enter/exit on the motion tokens. Motion exit through a portal is unreliable. Motion is for
  layout and gesture polish, not overlay teardown.
- Respect reduced-motion.

## Accessibility

Accessibility comes from using the primitives, not from patching markup afterwards. Radix
carries focus management, keyboard interaction, and ARIA wiring for the interactive components
that wrap it.

If you find yourself hand-writing ARIA attributes, that's usually the signal you should have
reached for a primitive instead.

## State

Three stores, three jobs. Pick by where the state belongs:

- **Jotai**: global/client state, atomically. Also the storage layer, via `atomWithStorage`.
- **nuqs**: URL / query-string state. Filters, tabs, and pagination belong in the URL.
- **React Query**: server state and data fetching, in the app's data layer.

## Data fetching

React Query, in the app's data layer. Responses are **parsed through their Zod schema on fetch**
(core guideline 4). Never cast, never trusted. Schemas come from the shared schema package.

Expect the `ApiResponse` shape from `quzzar-workplace` core guideline 5, and handle `fail`
(client's fault, per-field) separately from `error` (server's fault).

## Forms

React Hook Form, with the resolver bridging to the Zod schema. **One schema, validated on both
ends**. The form and the server share it, from the shared schema package.

## UI copy: terse, never verbose

A standing rule, and it holds everywhere:

- A surface gets a short title and **at most one** short supporting line. Aim well under ten
  words.
- Consequences and caveats live in the confirm dialog that gates the action, never as prose
  above the controls. **Don't narrate; gate.**
- If copy needs multiple sentences to justify an element, the element is wrong.

Empty states: a quiet contained box, a title, one short line, one action. No hero graphics, no
multi-sentence pitches, no feature tours. Reach for a set piece only when asked for a moment,
not by default.

## The component gallery

A standalone internal app renders every shared component with mock props. It's the fidelity
check, and it stands in for Storybook.

**When you add or change a shared component, add or update its gallery page.** Cover the real
states the way a story would: variants, sizes, hover/focus/disabled/loading, empty and error.
The gallery page is how the component gets verified; treat it as the story.

It's also the screenshot target. Because it renders every state on one page with no auth and no
seed data, it's the cheapest surface to point a browser at when verifying visual work. See
`quzzar-design`.

## Testing

Playwright, end-to-end against a running app, per `quzzar-workplace`.

---

## Rules

- The stack list is closed. Something outside it is an `AskUserQuestion`.
- Data, state, and routing libraries never become dependencies of the shared UI package.
- Fetched data is parsed through its Zod schema. No casting into shape.
- Tokens, not raw values.
- Short copy. Don't narrate; gate.
- Never report a visual change as done without rendering it and looking at it (`quzzar-design`).
- `CLAUDE.md` overrides this file. It holds the facts of the repo in front of you.
- Deleting an unused component means deleting its styles, gallery page, tests, and exports too
  (core guideline 1).
