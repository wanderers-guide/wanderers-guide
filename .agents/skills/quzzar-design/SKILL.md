---
name: quzzar-design
description: How to make a UI actually look good, and how to see what you built. Covers the visual plan that precedes the code, the AI-default aesthetics to avoid, the render-screenshot-critique loop, and the rubric to critique against. Use when building a new surface, restyling an existing one, doing a design or polish pass, or when the user says something looks generic, cluttered, unfinished, or just wrong.
---

# quzzar-design

Visual quality, and the loop that verifies it. The conventions for *how* to write UI code
(layers, structure, state, tokens) are in `quzzar-frontend`. Read that too. This file is about
whether the result is any good.

## When to use

- Building a new surface, page, or component that someone will look at.
- Restyling, polishing, or "making it look better".
- The user says a UI looks generic, templated, cluttered, cramped, unfinished, or off.
- Any change where "does it look right" is the actual acceptance criterion.

Do **not** use for: a purely behavioural change with no visual surface (a query hook, a form
resolver, a route guard). Reach for `quzzar-frontend` alone there.

---

## What you are compensating for

You have specific, known handicaps here. The steps below exist to counter them, so treat them
as procedure rather than advice.

1. **You cannot see the output.** Backend work closes its own loop: types compile, tests pass.
   Visual work has no such signal in the source. You will otherwise ship a broken layout while
   reporting success.
2. **You will describe a screen you never looked at.** This is the dangerous one, and it is
   measured: given no image at all, models still confidently hallucinate visual detail from
   textual priors. Fluent description of a layout is therefore *not* evidence you observed it.
   Only a capture is.
3. **Your default is the training mean.** Left unconstrained you reproduce the median of every
   landing page on the internet. That median is a specific, recognisable look, and it arrives
   regardless of what the product is.
4. **Your spatial reasoning is weak even with an image.** Semantics are strong, geometry is
   not. The characteristic failure is sizing a container from text attributes and overflowing
   it: labels running past their box, buttons overrunning their frame. A screenshot catches
   unambiguous breakage. It does not supply taste.
5. **You edit locally and never step back.** Spacing rhythm drifts, containers nest, hierarchy
   flattens, all through individually reasonable edits.

So: plan before coding, name the defaults you are avoiding, then look at the result.

---

## Step 1. Ground it in the subject

If the brief does not pin down what this surface is, pin it yourself before designing. Name the
one concrete job the surface does, who is looking at it, and what the single most important
element on it is. State your answer in one line and move on.

Pinning the *subject* yourself is right, and stalling to ask about it wastes everyone's time. A
genuinely open *visual direction* is a different case: that is the specific call you are worst
at making alone, so offer two or three differentiated directions in a line each rather than
silently picking one and building it out.

Distinctive choices come from the subject's own world: its vocabulary, its artifacts, the shape
of its data. Generic choices come from designing for "a page". Build with the real content, not
lorem ipsum, because placeholder copy hides every density and overflow problem you have.

## Step 2. Write the plan before you write code

A compact plan, four parts. Do this in thinking, not in chat, unless the user asked to see
options.

**Color.** 4 to 6 named values. In a repo with a token system these are already decided, so
your job is different: state which tokens this surface uses and what each one is *for*. A
dominant color with one sharp accent beats a timid, evenly distributed palette.

**Type.** The roles, not just the sizes. A display face used with restraint, a body face, and a
utility face for captions or data if the surface has any. Set the scale deliberately, and name
the weights and spacing. Type is the personality of a page, not a neutral delivery vehicle.

**Layout.** One sentence of prose plus an ASCII wireframe. The wireframe is cheap and it is the
only way you will notice that your three-column idea has nothing to put in the third column.

**Signature.** The single element this surface is remembered by. Exactly one. Everything around
it stays quiet.

Then, in a repo that already has a design system, be explicit about which axes are actually
free. Palette and typeface are usually fixed by the tokens. What is still yours to decide is
composition: hierarchy, density, rhythm, alignment, the signature, and what to leave out. Spend
your attention there rather than relitigating settled choices.

## Step 3. Review the plan against the defaults

Before writing any code, read your own plan back and ask of each part: is this a choice made
for this brief, or the thing I would have produced for any brief? Revise what fails, and say
what you changed and why.

These are the current machine-generated tells. They are all legitimate for *some* brief. None
of them is legitimate as a default:

| Tell | Why it shows up |
| --- | --- |
| Indigo or purple gradient, especially on white | A framework default that saturated the training corpus |
| Inter, Roboto, Open Sans, or the system stack, unexamined | Most frequent, therefore most probable |
| Three cards in a row, each with an icon and a heading | The single most common section in existence |
| One border radius applied to everything | Radius never got treated as a decision |
| Blur and glassmorphism used decoratively | Sparkle mistaken for a universal upgrade |
| Gradient text on headings and numbers | Same |
| Big metric, small label, supporting stats, gradient accent | The template hero |
| `01 / 02 / 03` markers on content that is not a sequence | Structure used as decoration |
| Emoji as bullets, gradient orbs standing in for "AI" | Filler where an asset should be |

Three whole-page looks currently read as AI-generated on sight, and are worth naming because
they are the *newer* defaults, so they feel like taste while still being the mean:

- Cream background near `#F4F1EA`, high-contrast serif display, terracotta accent.
- Near-black background with a single acid-green or vermilion accent.
- Broadsheet layout: hairline rules, zero border radius, dense newspaper columns.

Where the brief pins a direction, follow the brief exactly, including when it asks for one of
these. Where the brief leaves an axis free, do not spend that freedom on a default.

## Step 4. Build, with restraint

- **Spend boldness in one place.** The signature element is the memorable thing. Everything
  else is quiet and disciplined. Not taking a risk is also a risk, but taking five is just
  noise.
- **Match complexity to the direction.** A maximalist direction needs elaborate execution. A
  minimal one needs precision in spacing, type, and detail. Elegance is executing the chosen
  direction well, not choosing a modest one.
- **Structure must encode something true.** Dividers, eyebrows, numbering, and labels earn
  their place by carrying information. Otherwise cut them.
- **Motion is deliberate.** One orchestrated moment lands harder than scattered effects, and
  extra animation is itself a strong AI tell. Use the motion tokens, respect reduced-motion.
- **Then remove one thing.** Before you call it done, cut the least necessary element. There
  is always one.

Note on CSS: vanilla-extract's scoped class names remove the specificity-collision class of bug
that plagues hand-written CSS, where a type selector and an element selector silently cancel
each other's padding. You still own composition order and token discipline, so a raw px value
in a style file is a bug (`quzzar-frontend`), not a shortcut.

---

## Step 5. Look at it

**This step is not optional, and it is the one that most changes the outcome.** Everything above
is a prior. This is the only evidence.

### Get it on screen

1. `.claude/launch.json` is the entry point, written by the `setup` skill. Start the app from it
   rather than inventing a dev-server command, then drive the browser tools to navigate,
   screenshot, resize, and read the console.
2. **Prefer the component gallery over the real app** for anything shared. It already renders
   every component in every state on one page, which is exactly the surface a screenshot loop
   wants, and it needs no auth, no seed data, and no navigation to reach the state you changed.
3. If the browser tooling is unavailable, write a throwaway Playwright script. Playwright is
   already the test tool of record, so this costs nothing to reach for.
4. When the question is *why* an element lays out the way it does rather than what it looks
   like, stop squinting at pixels and read the numbers: evaluate JavaScript in the page and
   call `getComputedStyle` and `getBoundingClientRect` on the element. No browser tool hands
   you computed styles directly, so this is the route, and it turns an argument about whether
   a gap "looks off" into a measurement.
5. **Get past the login.** Most real app surfaces sit behind auth, and this is where the loop
   gets quietly abandoned. Sign in once and reuse the saved browser storage state for later
   captures instead of re-authenticating every round. If you genuinely can't reach the surface,
   **say it wasn't verified.** Skipping the step silently is the failure this skill exists to
   prevent.

### What to capture

One screenshot at one width is one sample of a large space, and it is the most common way this
loop gives false confidence. Capture:

- **Two widths at minimum**: a desktop width and a narrow mobile width. Most layout failures
  live at the narrow end.
- **Both themes**, if the token system has a dark theme.
- **The real states**: loading, empty, error, long content, and the longest realistic string in
  every label. Text overflow from an undersized container is a signature failure of generated
  UI, and it is invisible until the content is real.

### Critique against the rubric, not against vibes

Read the screenshot against this list explicitly. Unprompted self-critique regresses to the
same average that caused the problem, so the list is what makes the pass worth running.

**Critique as the actual user, not as "a designer".** Conditioning the judgment on a specific
person substantially outperforms generic evaluation, and it costs nothing: you already named
them in Step 1, so use them. A support agent scanning for the one row that's wrong finds
different problems than a first-time visitor deciding whether to trust the product.

**Say what each fault costs, and what would be better.** "The spacing is inconsistent" is a
label. "These two gaps read as one group when they're two, so the eye pairs the wrong rows"
identifies a fault worth fixing. Critique that argues against an alternative is more reliable
than critique that just names a category.

**Composition**
- Is there one clear focal point, or do three things compete?
- Does the eye land where the surface's job says it should?
- Is the spacing rhythm consistent, or does one gap look hand-tuned?
- Are edges aligned to a shared grid, or nearly aligned in a way that reads as sloppy?
- Is anything nested in a container that earns nothing? Cards inside cards inside panels.
- Is the density right, or is it airy filler stretched to fill a viewport?

**Type**
- Are there more than three sizes doing the same job?
- Does the hierarchy survive at the narrow width, or does everything collapse to one size?
- Any orphans, any line lengths past roughly 75 characters, any text clipped or overflowing?

**Tokens**
- Every color, space, radius, duration, and easing traceable to a token.
- No value that looks close to a token but is not one.

**Quality floor**, non-negotiable and checkable
- Responsive down to mobile with no horizontal scroll.
- Visible keyboard focus on every interactive element.
- Reduced motion respected.
- Text contrast holds in both themes.
- Console clean.

### Fix, then re-capture

A change is not verified until you have looked at the result of the change. Two or three rounds
is normal, and the second round is usually where the real problem surfaces, because the first
round fixes what was merely broken.

**Re-capture rather than re-reason.** Reasoning harder about a screenshot you took three edits
ago is exactly the failure mode above: extended text-only reasoning over a remembered image
measurably *degrades* spatial judgment rather than sharpening it. A fresh capture is cheaper
than a long chain of thought and is the only thing that can actually be wrong in your favour.

One trap when comparing before and after: judgment of paired images is order-sensitive, so a
model will favour one position regardless of content. If a comparison decides something,
re-run it with the order flipped, and distrust any verdict that flips with it.

### What this loop cannot tell you

Be honest about the ceiling. The line is that **this loop catches measurement problems, not
judgment problems.**

Reliable: color drift, spacing inconsistency, wrong weight or line-height, missing or extra
elements, misalignment, overflow, contrast, anything with a right answer you can point at.

Structurally blind: interaction states (hover, focus, active, disabled all need triggering),
animation and transitions, anything below the fold, anything at a width or in a theme you did
not capture, cross-browser rendering, and business logic expressed through the UI.

Weakest of all, and worth stating plainly: **deciding which of two designs is better.** On
published benchmarks that is close to a coin flip even for purpose-built systems. So when the
question is genuinely one of taste, do not resolve it confidently on your own. Capture the
options and put them to the user.

---

## Leave a trail

You start each session with no memory of what you already tried, which is why the same rejected
direction resurfaces across three separate attempts at one surface. A human designer doesn't
re-pitch the idea that lost last week.

So when a pass rejects a direction, record what was tried and why it lost. Two lines per
direction is enough. Per `quzzar-workplace` that belongs in `docs/` as a topic file, because it
is exactly the kind of knowledge that exists nowhere in the source and would otherwise die with
the session. The next pass reads it before Step 2 and starts somewhere genuinely new.

---

## Rules

- Plan before code. Color, type, layout, signature, then a pass that removes the defaults.
- Name what you are avoiding. A design that cannot say what it rejected is the mean.
- One signature element. Everything else stays quiet.
- **Never report a visual change as done without having looked at it rendered.** This is the
  whole point of the skill. Being able to describe the layout fluently is not the same as
  having seen it.
- Capture at two widths and in both themes, with real content and the real states.
- Critique against the rubric, not from memory. Re-capture rather than re-reason.
- Measure before arguing: `getComputedStyle` and `getBoundingClientRect` settle it.
- Which of two designs is better is a question for the user, not for you. Same for a genuinely
  open visual direction: offer two or three, don't silently pick one.
- Couldn't reach the surface to verify it? Say so. Never let a skipped capture pass as done.
- Record rejected directions in `docs/`, or the next session re-proposes them.
- Tokens, not raw values (`quzzar-frontend`).
- A shared component's change is verified on its gallery page, and the gallery page ships in
  the same change.
- Where the brief pins a direction, the brief wins, including when it asks for something on the
  defaults list.
- `CLAUDE.md` overrides this file. It holds the facts of the repo in front of you.
