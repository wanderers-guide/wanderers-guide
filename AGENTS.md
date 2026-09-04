# Wanderer’s Guide agent workflow

Project skills live in `.agents/skills/`.

- For repository work and browser verification, read `.agents/skills/wg-workspace/SKILL.md`.
- For frontend changes or review, read `.agents/skills/wg-ui/SKILL.md`; for React performance work, also read `.agents/skills/vercel-react-best-practices/SKILL.md`.
- For reading, editing, or reviewing game content, read `.agents/skills/wg-content/SKILL.md`.
- For Discord server context, read `.agents/discord.md`. Use the existing token from the ignored root `.env`; keep its value out of logs and reports.

Use `.agents/launch.json` as a catalog of preview commands. Start them with the available terminal tools and inspect the app with the available browser tools.

Keep local worktrees under `.agents/worktrees/` and migration backups under `.agents/legacy/`; both are ignored by Git. Codex-specific MCP configuration stays in `.codex/config.toml`.
