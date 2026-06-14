# Engineering standards and operating principles

These standards apply across the entire codebase, regardless of programming language, framework, runtime, or platform.

They define how we design, build, test, observe, and review software in production environments.

## General principles

### Solve the actual problem

Solve the real problem, not just the visible symptom.

Start by understanding the behaviour, requirements, and failure mode. Prefer a root-cause fix over a local workaround.

Before changing code, consider whether the issue is caused by:

- incorrect configuration
- missing or incorrect environment variables
- wrong secrets
- wrong URLs
- deployment or runtime settings
- dependency or version mismatch
- operator error
- bad assumptions in local setup

Do not turn configuration mistakes into permanent code paths unless there is an explicit product requirement.

When a problem is caused by configuration, call that out directly and fix the source configuration.

### Readability first

Optimise for code that future engineers can understand quickly.

Prefer clear, direct, boring code over clever abstractions.

Good code should make the common path obvious, the edge cases explicit, and the failure modes easy to reason about.

A readable solution is usually better than a shorter or more abstract solution.

Use names, types, schemas, contracts, tests, and documentation to make intent clear.

### Simplicity and scope control

Choose the smallest viable change that fully resolves the problem.

Do not avoid larger changes when the requirements demand them, but keep the implementation as small as possible while still solving the problem properly.

Avoid "sniper edits" that patch one symptom while leaving the broader behaviour broken.

Avoid broad rewrites unless they are required by the task.

### Comments

Explain the why, not the what. The code itself should describe what it is doing.

Use comments sparingly to clarify non-obvious decisions.

Use comments to break up long blocks of code into logical sections when that improves readability.

Avoid over-commenting. Prioritise writing self-descriptive code.

### Module, component, and function size

Keep modules, components, classes, and functions small enough to understand quickly.

Prefer small, single-responsibility units.

If something is hard to name precisely, it probably has too many responsibilities.

Apply the DRY-3 rule: refactor code into a reusable function, component, module, or service once it is written for the third time.

Avoid premature abstraction. Duplication is sometimes better than the wrong abstraction.

### Guard clauses and validation

Prefer early returns to reduce nesting and improve readability.

Validate inputs as high up the call stack as practical.

Validate raw input immediately and use guard clauses to handle invalid data.

Avoid nested conditional logic where guard clauses, early returns, pattern matching, composition, or explicit state handling would be clearer.

### Code structure

Keep functions focused on a single responsibility.

Avoid deep nesting. Keep nesting to roughly two levels where practical.

Prefer flat, readable code over clever abstractions.

Structure files consistently within each repository.

Follow the established ordering and grouping conventions for imports, declarations, types, constants, helpers, and exports.

Do not introduce new structure, aliases, layers, or conventions without updating the relevant configuration and documentation.

### Performance philosophy

Optimise for clarity first.

Measure before optimising.

Avoid premature optimisation.

When performance work is required, document the measured bottleneck, the chosen approach, and the expected improvement.

### Immutability and mutation

Prefer returning new values over mutating existing ones when it improves clarity, safety, or predictability.

Mutation is acceptable where it is local, intentional, and clearer than copying.

Avoid hidden mutation, shared mutable state, and side effects that are difficult to reason about.

Shared mutable state across threads, processes, workers, requests, or jobs is prohibited unless explicitly synchronised.

## Architecture and responsibilities

### Layered architecture

Use clear architectural boundaries.

Common layers include:

- Transport: routing, serialization, authentication context, request and response mapping
- Application: use-case orchestration, transactions, policy coordination, and boundary translation
- Domain: business rules, invariants, and pure decision logic
- Infrastructure: databases, external APIs, queues, cache, filesystems, vendors, and framework integrations

Rules:

- Keep business logic out of transport layers.
- Domain code must not depend on transport, infrastructure, framework, or vendor details.
- Infrastructure should be called through application-defined interfaces where practical.
- Application code coordinates use cases and policies.
- Transport code maps the outside world into application calls.
- External systems should be isolated behind clear adapters or clients.

### Error boundaries and propagation

Domain code should raise or return explicit domain errors.

Application code should translate domain errors into user-facing outcomes.

Transport code should map outcomes and errors to protocol-specific responses.

Infrastructure code must not swallow exceptions silently.

Log errors at boundaries, not deep inside every helper.

Avoid catch-and-ignore blocks unless there is an explicit, documented reason.

## Trust boundaries and schema-first development

Schema-first means:

1. Define a schema or contract at every trust boundary.
2. Validate raw input against that schema or contract.
3. Infer, map, or construct typed domain models from validated data.
4. Run business logic only on validated data.

Use schemas or equivalent runtime validation when:

- data crosses a trust boundary
- data has validation rules
- data is a shared contract between systems
- data comes from APIs, URLs, forms, events, queues, files, databases, third parties, or external integrations
- invalid test fixtures would be useful to catch early

Plain compile-time types or internal data structures are sufficient for:

- pure internal types
- utility types
- behaviour contracts
- internal state machines
- compile-time-only transformations
- values that do not cross a trust boundary

Runtime validation tools should be chosen per language and repository. Use the established tool for the codebase rather than introducing a new one without clear justification.

## Naming conventions

Follow the established naming conventions for the language, framework, and repository.

Names should be clear, searchable, and specific.

General rules:

- Functions and methods should usually be verb-based.
- Types, classes, and models should describe the thing they represent.
- Constants should be visually distinct according to the language convention.
- Files and modules should use the repository's existing naming pattern.
- Tests should be named consistently with the repository's test runner and conventions.
- Avoid vague names such as `data`, `item`, `handler`, `manager`, or `helper` unless the meaning is obvious from context.

Examples of good intent-revealing names:

- `getUserProfile`
- `calculateTotal`
- `validatePayment`
- `CreateUserRequest`
- `PaymentAmount`
- `BillingGateway`

## State management

Use the simplest state management approach that fits the problem.

Separate server-owned state from client-owned or process-local state.

Server-owned state includes data fetched from APIs, databases, services, or external systems.

Client-owned or local state includes:

- open or closed screens
- local UI preferences
- unsaved workflow state
- temporary user input
- transient process state

Do not duplicate server-owned state into local stores without explicit justification.

Prefer derived state over duplicated state.

Document any deliberate synchronisation between multiple sources of state.

## Type safety and static analysis

Use the strongest practical type safety supported by the language and repository.

Static analysis, type checking, linting, and formatting should be enforced in CI.

Avoid untyped or dynamically typed escape hatches in application code.

When an unknown value enters the system:

1. Treat it as unknown.
2. Validate or narrow it.
3. Convert it into a typed or well-defined value.
4. Pass only the validated value into business logic.

If an unsafe cast, assertion, or escape hatch is unavoidable:

- keep it close to the boundary that justifies it
- isolate it from domain logic
- document why it is required
- convert the value into a safe shape immediately

These rules apply to test code as well as production code.

## Dependency usage

Use existing repository patterns before adding a new dependency.

Before introducing a dependency, check:

- whether the codebase already solves the problem another way
- whether the dependency is actively maintained
- whether it adds meaningful value
- whether it increases build, runtime, security, licensing, or operational risk
- whether it needs additional documentation or configuration

Do not introduce new dependencies for small convenience gains.

## Async, concurrency, and background work

Follow the existing concurrency model for the application.

Default to the simplest execution model unless concurrency provides clear value.

Use asynchronous or parallel execution for I/O-bound work where it fits the runtime and framework.

Avoid mixed execution models when they make control flow harder to reason about.

Background jobs must be idempotent and safe to retry.

Long-running work should expose clear status, logging, error handling, and retry behaviour.

Shared mutable state across concurrent execution contexts is prohibited unless explicitly synchronised.

## Security baseline

Validate all external inputs.

Never trust client-provided identifiers without authentication and ownership checks.

Enforce least privilege for infrastructure permissions.

Secrets must come from environment variables, a secret manager, or an approved secure configuration mechanism.

Never hard-code credentials, tokens, or keys.

Do not log secrets, access tokens, credentials, or sensitive personal data.

Do not weaken security controls to make implementation or tests easier.

Do not bypass authentication, authorisation, CSRF protection, CORS rules, TLS checks, input validation, rate limits, or audit logging unless the requirements explicitly call for it.

Never add fallback credentials, hard-coded secrets, test-only production paths, or silent failure paths for security-sensitive behaviour.

## Observability, logging, and tracing

Production systems must be observable.

Minimum expectations:

- Every request or unit of work carries a correlation or request ID.
- External calls log dependency, latency, and outcome.
- Background jobs log start, completion, and failure.
- Logs are structured and contextual.
- Errors are logged at boundaries with enough context for triage.
- Metrics and traces are captured where practical.
- Logs print locally and are sent to the production observability stack.
- Logs never contain sensitive information, including personal data, secrets, credentials, or tokens.
- Standardised log formats and fields are used for consistency and queryability.
- A logging wrapper or shared logging utility should be used where practical to enforce structure.

Good log shape:

```json
{
  "event": "external_call",
  "dependency": "billing-api",
  "latency_ms": 213,
  "status": "timeout",
  "request_id": "req_123"
}
```

Bad log shape:

```text
failed request for user john.doe@example.com token=abc123
```

## Testing principles

Tests should verify expected behaviour.

Treat implementation as a black box where practical.

Test through public APIs, user-visible behaviour, stable service boundaries, or externally observable outcomes.

Avoid one-to-one mapping between test files and implementation files when it encourages implementation-coupled tests.

Avoid tests that examine private implementation details.

Aim for comprehensive behaviour coverage. Do not add brittle tests purely to satisfy a coverage number.

Add tests for every new behaviour and bug fix.

All test code must follow the same quality, typing, linting, and formatting rules as production code.

### Test data

Use factory functions or builders with optional overrides for test data.

Key principles:

- Return complete objects with sensible defaults.
- Accept optional overrides.
- Build incrementally.
- Extract nested factories as needed.
- Compose factories for complex objects.
- Validate factory output when schemas exist.
- Avoid shared mutable test state.

Tests should use real schemas, types, contracts, and models from the main project.

Do not redefine production schemas or contracts inside tests.

If a schema or contract is not exported yet, export it rather than duplicating it.

### Behaviour-focused tests

Avoid implementation-focused tests.

Poor test intent:

```text
should call validateAmount
```

Better test intent:

```text
should reject payments with negative amounts
```

Prefer testing outcomes over testing internal calls.

Use mocks at boundaries, not for every internal helper.

Mock external systems, time, randomness, and network calls where needed.

Prefer real or lightweight test databases where practical for integration-style tests.

## Code review and PR standards

Prefer small, focused PRs where possible.

Every PR must explain:

- intent
- context
- trade-offs
- tests run
- rollout or migration impact
- risks and follow-ups

At least one approving review is required before merge.

CI must pass, including formatting, linting, static analysis, and tests.

New behaviour requires tests or an explicit rationale when tests are not feasible.

Avoid large unrelated rewrites in feature or bug-fix PRs.

## Commit message standard

Commit messages must follow the repository's agreed commit convention.

Where no stronger repository-specific convention exists, use Conventional Commits.

Preferred format:

```text
type(scope): concise imperative summary
```

Common types:

- `feat`
- `fix`
- `docs`
- `refactor`
- `test`
- `chore`
- `ci`
- `build`
- `perf`
- `revert`

Use a breaking-change marker or footer according to the repository convention.

Examples:

```text
feat(auth): add session refresh endpoint
fix(payments): reject negative payment amounts
test(api): cover expired token handling
docs: update local setup instructions
```

## Infrastructure, data, and deployment

### Infrastructure as code

All infrastructure must be defined as code.

Manual console changes are prohibited.

Infrastructure changes must be reviewed via PR and applied through the approved deployment process.

### Database and data migrations

All schema changes must use versioned migrations.

Manual production data changes are prohibited unless handled through an approved operational process.

Migrations must include rollback or recovery guidance where practical.

Data migrations must be tested against representative data where practical.

### Data access

Use the repository's established data access pattern.

Use the existing ORM, query builder, data mapper, repository, or client pattern by default.

Raw queries are allowed when necessary, but they must be isolated, parameterised, tested, and reviewed.

Do not bypass data access conventions for convenience.

## Tooling and enforcement

Formatting, linting, static analysis, type checking where applicable, and tests must run in CI.

CI blocks merges on failure.

Local pre-commit quality checks should run where practical.

Standards are enforceable, not advisory.

Do not introduce formatting or tooling that conflicts with the repository's configured tools.

## Common patterns to avoid

Avoid:

- deep nesting and complex conditionals
- large multi-responsibility functions, modules, classes, or components
- copying server-owned state into local stores without clear need
- silent error handling or catch-and-ignore blocks
- tests tightly coupled to implementation details
- introducing new dependencies without checking existing patterns
- large unrelated rewrites
- clever abstractions that make the code harder to read
- hard-coded secrets, credentials, or environment-specific values
- hidden global state
- duplicated schemas or contracts
- bypassing established architecture boundaries

## Documentation philosophy

Good documentation starts with well-written code.

Documentation should complement the code, not replace it.

Write documentation for future developers who were not present when the code was first written.

Documentation is a living artefact and should be updated as the code changes.

Prefer concise documentation that explains intent, trade-offs, operation, and maintenance concerns.

Document:

- non-obvious decisions
- architectural boundaries
- operational requirements
- migration or rollout steps
- known risks and follow-ups
- local development setup where needed

Avoid documentation that merely restates obvious code behaviour.
