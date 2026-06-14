# AGENTS.md

## Purpose

This file defines how coding agents should work in this repository.

It does not define the coding standards themselves. Coding, testing, architecture, observability, security, and review standards live in `coding-standards.md`.

Agents must use this file to understand how to approach work, and must use `coding-standards.md` to understand what good code looks like.

## Instruction precedence

Follow instructions in this order:

1. The user's current task instructions
2. The closest applicable `AGENTS.md`
3. Requirements artefacts for the task, such as PRDs, issues, ADRs, specs, README files, and architecture notes
4. `coding-standards.md`
5. Existing code patterns

If instructions conflict, follow the higher-priority instruction and call out the conflict in the final response.

If existing code conflicts with `coding-standards.md`, apply the standards to new and modified code, but do not perform broad unrelated rewrites unless required by the task.

## Start every task with discovery

Before planning or editing code, inspect the repo root and obvious requirements locations, including:

- `/docs`
- README files
- `coding-standards.md`
- architecture notes
- any file that defines scope, behaviours, constraints, or review expectations

Use these artefacts as the source of truth for scope and implementation choices.

If the relevant requirements are unclear or missing, make a best-effort plan from the available evidence and call out the gap.

## Required standards

Before editing code, locate and read `coding-standards.md`.

The standards file is authoritative for:

- TypeScript
- React
- Python
- testing
- architecture
- validation
- observability
- security
- infrastructure
- code review expectations
- commit message format

Do not duplicate or reinterpret these standards unless a task-specific requirement overrides them.

## Delivery model

Default to single-PR delivery.

When asked to plan or implement, optimise for one comprehensive pull request that solves the real problem end to end.

Do not split work into many micro tasks or multiple PRs unless explicitly required.

Single-PR delivery does not mean one commit. Use multiple atomic commits within the PR.

## Implementation approach

Solve the actual problem, not just the visible symptom.

Start with root-cause checks before changing code, including:

- configuration
- environment variables
- secrets
- URLs
- deployment/runtime settings
- dependency or version mismatch
- operator error
- local setup assumptions

Do not solve configuration mistakes with permanent code paths unless there is an explicit product requirement.

If a variable, secret, URL, environment value, or deployment setting is wrong, call that out directly and recommend fixing the source configuration first.

## Planning and to-do tracking

For small, obvious changes, keep planning lightweight.

For larger or multi-step work, create or update a running to-do list before implementation. The to-do list should make clear:

- what will be changed
- why it is in scope
- which requirement or artefact justifies it
- what remains to be done
- what has already been completed

For larger work, include both:

- a concise implementation plan
- a running to-do list that links each item to the plan sections and requirements

Keep breadcrumb notes in the repo, or in a clearly referenced place, so another agent can continue without re-deriving context.

Do not create excessive planning documents for small tasks.

## Applying coding standards

Apply `coding-standards.md` to all new and modified code.

Do not perform broad unrelated rewrites just to bring untouched legacy code up to current standards.

When modifying older code, improve the touched area enough that the change is coherent and safe, but avoid expanding scope without a requirement.

If a standard cannot be followed, explain why in the final response.

## Permissions and safety

You may run read-only inspection commands, tests, linters, type checks, and local builds without asking.

Ask before running commands that:

- delete files or data
- reset, rebase, squash, force-push, or rewrite Git history
- run database migrations against shared environments
- modify production, staging, or shared infrastructure
- install or upgrade dependencies
- rotate, create, print, or change secrets
- deploy code
- make network calls to production services
- perform expensive or long-running operations

Never commit secrets, tokens, credentials, private keys, `.env` files, or generated files that should stay local.

## Dependency policy

Prefer existing dependencies and standard library functionality.

Before adding a new dependency, check whether the repo already has an equivalent package, utility, or pattern.

Do not add a new production dependency unless it is clearly justified by the requirements.

If a new dependency is needed, explain:

- why existing code cannot solve the problem cleanly
- why the dependency is appropriate
- any security, licensing, maintenance, or bundle-size concerns

## Git workflow - mandatory

You must commit work as you go.

Do not wait until the end of the task to create one large commit.

Use Atomic Conventional Commits. Each commit must represent one logical, reviewable change.

Examples:

```sh
git commit -m "docs: record implementation plan"
git commit -m "feat: add vehicle lookup endpoint"
git commit -m "test: cover vehicle lookup edge cases"
git commit -m "fix: validate missing API credentials"
```

Commit after each coherent unit of work, such as:

- adding or updating requirements notes
- adding an implementation plan
- introducing a schema, model, or API change
- implementing a behaviour slice
- adding or updating tests
- updating documentation
- fixing a discovered defect
- refactoring a repeated pattern

Each commit should:

- contain one logical change
- be easy to review independently
- leave the repo in a working state where practical
- include relevant tests when practical
- avoid mixing unrelated refactors, formatting, and behaviour changes

If an intermediate commit cannot leave the repo fully working, make that explicit in the commit message or accompanying notes, and return the repo to a working state as soon as possible.

If you cannot commit because Git identity, permissions, hooks, branch protection, or the environment prevents it, stop and report the exact blocker.

Do not silently continue without commits.
