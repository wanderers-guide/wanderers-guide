# Wanderer’s Guide agent workflow

<!-- quzzar-skills:start -->
## Agent skills

Before starting work, read `.agents/skills/quzzar-workplace/SKILL.md`. Before changing
frontend behavior, read `quzzar-frontend`; for APIs, database, or edge functions, read
`quzzar-backend`. Both live under `.agents/skills/`. For visual work, also read
`quzzar-design` and render, inspect, and screenshot the result.

The five skills are installed from `Quzzar/skills`; provenance is recorded in
`.agents/skill-sources.json`. In this Codex repository, upstream references to
`CLAUDE.md` mean `AGENTS.md`, and `.claude/launch.json` means `.agents/launch.json`.
Use the available terminal/browser tools. The Matt Pocock toolkit is already installed
in Codex; do not run the upstream Claude-specific plugin commands here.

### Stack and repository conventions

- Package manager: npm, with separate frontend and docs package-lock files.
- Frontend: React 19, Vite, strict TypeScript, Mantine 9, React Router, Jotai, React Query.
- Backend/runtime: Deno Supabase edge functions; Node for repository CLIs.
- Database: Supabase Postgres with RLS, Auth, and Storage.
- Tests: Cypress (`npm --prefix frontend run cy:e2e`) against the local Docker stack;
  rules/drawers (`npm --prefix frontend run test:rules`); Deno API tests (`npm run test:api`);
  audit CLI (`npm --prefix frontend run test:audit:content`).
- Typecheck/build: `npm --prefix frontend run build` runs TypeScript then Vite.
- Lint/format: `npm --prefix frontend run lint`; frontend Prettier configuration.
- Preview: `npm --prefix frontend run dev` on 5173; `npm run docs:dev` on 3210.
- Release: feature branches are reviewed and verified, then merged to `main`; GitHub
  Actions runs CI/E2E and refreshes the sanitized data dump. This repo has no `dev` or
  `staging` release branches. Preserve that workflow unless a migration is requested.

These are the repository's actual choices and override general skill defaults. Use
Mantine components/tokens and the existing npm/Cypress setup for this work. A framework,
package-manager, or test-stack migration is a separate scoped change.
<!-- quzzar-skills:end -->

Project skills live in `.agents/skills/`.

- For repository work and browser verification, read `.agents/skills/wg-workspace/SKILL.md`.
- For frontend changes or review, read `.agents/skills/wg-ui/SKILL.md`; for React performance work, also read `.agents/skills/vercel-react-best-practices/SKILL.md`.
- For reading, editing, or reviewing game content, read `.agents/skills/wg-content/SKILL.md`.
- For Discord server context, read `.agents/discord.md`. Use the existing token from the ignored root `.env`; keep its value out of logs and reports.

Use `.agents/launch.json` as a catalog of preview commands. Start them with the available terminal tools and inspect the app with the available browser tools.

Keep local worktrees under `.agents/worktrees/` and migration backups under `.agents/legacy/`; both are ignored by Git. Codex-specific MCP configuration stays in `.codex/config.toml`.
