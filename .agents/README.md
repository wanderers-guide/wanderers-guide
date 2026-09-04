# Agent configuration

`.agents/skills/` is the canonical project skill directory. The workspace skill is named `wg-workspace`; its preview instructions use the available terminal and browser tools.

`.agents/launch.json` preserves the frontend and docs command catalog. Run those npm commands from the repository root. This file is reference data, not a Codex permission file.

`.codex/config.toml` retains the existing Mantine MCP configuration required by Codex. `.mcp.json` remains available to other MCP clients.

The September 4, 2026 migration preserved the existing `.agents` edits, copied the eight project skills, restored thirteen previously broken skill links from the installed personal skills, and moved the three Git worktrees with `git worktree move`. Local backups and old Claude permissions are in `.agents/legacy/` and are ignored; Claude permission rules are archived, not imported into Codex.

Historical branches may still contain `.claude` files. When integrating one, migrate new instructions into the corresponding `.agents` skill; in particular, the unmerged `fix-content-issues` command needs conversion into a skill.
