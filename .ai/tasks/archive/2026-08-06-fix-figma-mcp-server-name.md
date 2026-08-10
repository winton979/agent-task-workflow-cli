---
areas: [configuration]
working_set: [C:/Users/winton/.codex/config.toml]
---

# Goal

Make the Figma MCP server start successfully in Codex.

# Context

Codex rejects the configured server name `mcp_servers.figma` because names may contain only letters, digits, underscores, and hyphens. The server should be registered as `figma`.

# Constraints

- Change only the Figma MCP table name; preserve its HTTP endpoint and the other MCP configurations.
- No dependency or project-wide capability is needed.

# Risks

Codex must be restarted or its configuration reloaded before the corrected entry is used.

# Acceptance Criteria

- The Figma MCP table is named `[mcp_servers.figma]`.
- No `mcp_servers.figma` string remains as a server name.
- The file remains valid TOML.
