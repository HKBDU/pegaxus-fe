---
name: agent-optimization
description: Optimize coding-agent work with concise communication, minimal necessary implementation, and optional local output/context compression. Use when the user requests caveman/brief mode, token reduction, RTK, Headroom, or anti-overengineering guidance.
---

# Agent Optimization

Apply only the mode relevant to the request. Do not activate every optimization tool automatically.

## Communication mode

Activate concise communication only when the user requests `/caveman`, brief output, fewer tokens, or equivalent.

- Keep technical meaning, exact commands, paths, symbols, code, and error strings unchanged.
- Remove filler and repetition; state each fact once.
- Keep the user's dominant language. Do not translate or normalize multilingual files or examples.
- Use normal prose for security warnings, irreversible actions, ambiguous multi-step instructions, and human-facing docs, commits, PRs, tickets, and bug reports.
- Never override higher-priority system/developer instructions about safety, progress updates, or final-answer completeness.
- Modes: `lite` keeps full sentences; `full` is terse; `ultra` uses fragments. `off` restores normal prose.

## Minimal implementation

Before adding code:

1. Confirm the change is necessary.
2. Reuse existing project code and installed dependencies.
3. Prefer standard-library or native platform features.
4. Add a dependency only when it solves a real requirement.
5. Implement the smallest readable solution that preserves validation, error handling, security, and accessibility.
6. Verify with the narrowest relevant check, then run broader checks when risk warrants it.

Minimal code must remain readable. Do not golf code or remove safety checks.

## Optional shell-output compression

Use RTK only when the `rtk` command is installed and the command is compatible. Otherwise run the normal command; missing RTK is not a blocker.

Useful commands:

```text
rtk git status
rtk git diff
rtk gain
rtk gain --history
rtk proxy <command>
```

Never prefix commands blindly. Preserve exact output for diagnostics, security-sensitive checks, and commands where filtering could hide a failure.

## Optional context compression

Use Headroom only when the `headroom` command is installed and the user explicitly requests it.

Useful commands:

```text
headroom doctor
headroom proxy --port 8787
headroom wrap codex --code-memory none
headroom output-savings
```

Do not start a proxy or wrap an agent without user authorization. Do not claim Headroom is active unless verification succeeds.

## Project integration

This skill is project-local. It does not require RTK, Headroom, external plugins, or global installation. Report missing optional tools when the user asks to use them. Keep tool-specific setup outside this skill unless the tool is available and the user requests installation.

