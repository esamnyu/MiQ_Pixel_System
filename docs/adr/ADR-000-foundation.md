# ADR-000: Foundation - Language, Runtime, and Build Tooling

## Status
Accepted

## Context
We need to establish the foundational technology stack for the MiQ Pixel System that will support high-performance, type-safe, privacy-first tracking at scale.

## Decision

### Runtime & Language
- **Node.js 20+ LTS** with TypeScript 5.3+
- Rationale: Mature ecosystem, excellent async I/O for high-throughput processing, shared code between client/server

### Monorepo Structure
- **pnpm** workspaces for package management
- **Turborepo** for build orchestration and caching
- Rationale: Efficient dependency management, parallel builds, shared configs, atomic versioning

### Build & Bundle
- **tsup** for library bundling (packages/)
- **Vite** for client SDK development
- **esbuild** for production bundles
- Rationale: Fast builds, tree-shaking, minimal bundle sizes critical for <10KB SDK target

### Testing Stack
- **Vitest** for unit/integration tests
- **Playwright** for E2E browser testing
- **k6** for load testing
- **Pact** for contract testing between services
- Rationale: Fast, parallel test execution; real browser testing; production-like load scenarios

### Code Quality
- **ESLint** with strict TypeScript rules
- **Prettier** for formatting
- **Conventional Commits** with commitlint
- **Husky** + lint-staged for pre-commit hooks
- Rationale: Consistent code style, semantic versioning automation, quality gates

## Consequences
- All developers need TypeScript proficiency
- pnpm required locally (not npm/yarn)
- CI complexity increases with monorepo but offset by Turborepo caching
- Excellent DX with hot-reload, type safety, and fast feedback loops

## Alternatives Considered
- **Deno**: Better security model but ecosystem limitations
- **Bun**: Performance gains but maturity concerns
- **Lerna/Nx**: More features but heavier than Turborepo
- **Rollup**: More configurable but slower than esbuild for our use case