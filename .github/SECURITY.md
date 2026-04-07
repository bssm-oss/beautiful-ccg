# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| 0.1.x | Yes |

## Reporting a Vulnerability

**Do not open a public issue for security vulnerabilities.**

Instead, please report them via [GitHub Security Advisories](https://github.com/justn-hyeok/beautiful-ccg/security/advisories/new).

When reporting, include:

- Description of the vulnerability
- Steps to reproduce
- Affected versions
- Potential impact

You should receive an acknowledgment within 48 hours. We will work with you to understand the issue and coordinate a fix before any public disclosure.

## Scope

bccg spawns AI CLI subprocesses (`copilot`, `claude`, `codex`, `gemini`) with user-provided prompts. Security concerns specific to this project include:

- **Command injection** via prompt or adapter arguments
- **Environment variable leakage** through subprocess spawning
- **Recursive invocation** bypassing the `BCCG_DEPTH` guard
- **MCP server** exposure of unintended capabilities
- **Config file manipulation** via `bccg init`

Issues in the underlying AI CLIs themselves should be reported to their respective maintainers.
