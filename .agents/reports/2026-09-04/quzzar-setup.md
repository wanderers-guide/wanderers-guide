# Quzzar skills setup

Installed all five skills from https://github.com/Quzzar/skills at
b6e5cb5b0a9ebd9096805ce8228202d7385c432c as unmodified local copies.
AGENTS.md maps upstream Claude paths to the Codex .agents workspace, records the
actual stack, and routes work to the installed workplace/frontend/backend/design
skills. The Matt Pocock toolkit is already installed and available in Codex.

## Survey

Broad stack alignment: React/Vite/TypeScript, React Router, Jotai, React Query,
Zod frontend schemas, Supabase Postgres/Auth/Storage, Deno edge functions,
GitHub Actions, ESLint/Prettier, and documented API responses.
Lint exits successfully with 70 existing hook/refresh warnings and no errors.

Repository choices differ from the generic defaults: npm, Mantine, Cypress,
and feature branches merged to main. These are retained for the requested fixes;
installing skills does not migrate a shipped UI library or release topology.

Remaining maintenance gaps include separate frontend schema/backend type
representations, broad casts and implicit types in older code, no standalone
component gallery, and an already documented out-of-sync frontend lockfile.
These are separate maintenance concerns, not prerequisites for the Discord fixes.

The previously untracked .codex/config.toml contains only Mantine MCP setup and
is now versioned. Private Discord notes and environment files remain ignored.
