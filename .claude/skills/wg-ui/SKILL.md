---
name: wg-ui
description: Use whenever creating, editing, or reviewing any UI or frontend code in the wanderers-guide repo
---

# Wanderers Guide UI Guidelines

## Mantine UI

**Always use [Mantine](https://mantine.dev) components** for all UI work in this repo. Do not reach for raw HTML elements or custom CSS when a Mantine component covers the use case.

Before implementing any UI, check the Mantine docs:
- Full docs (LLM-friendly): https://mantine.dev/llms.txt

Use the available `mcp__mantine__*` tools to look up components, props, and docs inline:
- `mcp__mantine__list_items` — browse available components
- `mcp__mantine__get_item_doc` — get full docs for a component
- `mcp__mantine__get_item_props` — get prop types for a component
- `mcp__mantine__search_docs` — search across Mantine docs

## Code Documentation

**Always write comments and document your code.** Every component, function, and non-obvious block of logic must be documented:

- Add a JSDoc comment above every exported component and function explaining what it does, its props/params, and any important behavior
- Add inline comments for any logic that isn't immediately self-evident
- If a piece of UI has nuanced behavior (conditional rendering, state interactions, side effects), explain it in a comment
