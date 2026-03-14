# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run setup        # First-time setup: install deps, generate Prisma client, run migrations
npm run dev          # Start dev server (localhost:3000) with Turbopack
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint via next lint
npm test             # Run all tests with Vitest
npm test -- src/lib/transform/__tests__/jsx-transformer.test.ts  # Run a single test file
npm run db:reset     # Reset SQLite database (destructive)
```

> **Windows note:** The `NODE_OPTIONS` scripts use `cross-env NODE_OPTIONS=--require=./node-compat.cjs` (no quotes, `=` instead of space). `node-compat.cjs` deletes `globalThis.localStorage/sessionStorage` on the server to fix a Node.js 25+ SSR incompatibility where those globals exist but are non-functional.

## Environment

Set `ANTHROPIC_API_KEY` in `.env`. Without a key the app falls back to `MockLanguageModel` in `src/lib/provider.ts`, which returns static hardcoded components instead of calling Claude. The real model is `claude-haiku-4-5`.

## Architecture

UIGen is a Next.js 15 App Router application where users describe React components in a chat and see them live-previewed — all without writing files to disk.

### Routing

- **Anonymous users** (`/`) — served `MainContent` with no project; work is stored in `sessionStorage`.
- **Authenticated users** — redirected to `/{projectId}` of their most recent project. On sign-in/sign-up, `useAuth` (`src/hooks/use-auth.ts`) detects pending anonymous work in `sessionStorage` and migrates it into a new saved project before redirecting.

### Virtual File System

All generated code lives in an in-memory `VirtualFileSystem` (`src/lib/file-system.ts`). It is:
- **Serialized** to JSON and stored in Prisma (`Project.data`) for authenticated users.
- **Sent on every chat request** — `ChatContext` includes `fileSystem.serialize()` in the POST body so the server rebuilds the VFS fresh each time.
- **Exposed to React** via `FileSystemContext` (`src/lib/contexts/file-system-context.tsx`), which wraps VFS mutations and triggers re-renders via a `refreshTrigger` counter.

### AI Code Generation

`src/app/api/chat/route.ts` uses Vercel AI SDK `streamText` (up to 40 steps) with two tools the LLM can call:

- **`str_replace_editor`** — commands: `view`, `create`, `str_replace`, `insert`, `undo_edit` (undo returns an error; not supported).
- **`file_manager`** — commands: `rename` (also functions as move), `delete`.

The generation prompt (`src/lib/prompts/generation.tsx`) requires:
- Always start with `/App.jsx` as the entry point.
- Use Tailwind CSS (no hardcoded styles).
- Use `@/` alias for all local imports (e.g. `@/components/Button`).

On completion, if the user is authenticated the handler saves updated messages and VFS data to Prisma.

### Live Preview

`PreviewFrame` (`src/components/preview/PreviewFrame.tsx`) renders an `<iframe srcdoc>` that rebuilds on every VFS change. The pipeline in `src/lib/transform/jsx-transformer.ts`:

1. Compiles TSX/JSX via `@babel/standalone`.
2. Creates Blob URLs for each compiled file.
3. Builds an ES Module import map: local files → blob URLs; third-party packages → `esm.sh`; missing local imports → placeholder empty modules.
4. Injects all CSS files as `<style>` blocks.
5. Loads Tailwind CSS via CDN script tag.
6. Wraps the app in a React `ErrorBoundary`.

Entry point lookup order: `/App.jsx`, `/App.tsx`, `/index.jsx`, `/index.tsx`, `/src/App.jsx`, `/src/App.tsx`.

### Database Schema

**Always reference `prisma/schema.prisma` to understand the structure of data stored in the database.** It is the source of truth for all models and their fields.

### Auth & Persistence

- Custom JWT auth using `jose` (no NextAuth). Sessions in an `httpOnly` cookie (`auth-token`), valid 7 days.
- Passwords hashed with `bcrypt` (cost 10).
- SQLite via Prisma. Two models: `User` and `Project` (`Project.messages` and `Project.data` stored as JSON strings).
- Anonymous work (messages + VFS) is saved to `sessionStorage` by `anon-work-tracker.ts` and migrated to a project on sign-in/sign-up via `useAuth`.

### Key Paths

| Path | Purpose |
|------|---------|
| `src/app/api/chat/route.ts` | AI streaming endpoint |
| `src/lib/file-system.ts` | `VirtualFileSystem` class |
| `src/lib/transform/jsx-transformer.ts` | Babel transform + import map + preview HTML |
| `src/lib/provider.ts` | Language model selector (real vs mock) |
| `src/lib/prompts/generation.tsx` | System prompt for code generation |
| `src/lib/tools/str-replace.ts` | `str_replace_editor` tool definition |
| `src/lib/tools/file-manager.ts` | `file_manager` tool definition |
| `src/lib/contexts/file-system-context.tsx` | React context wrapping VFS |
| `src/lib/contexts/chat-context.tsx` | Chat state; bridges AI SDK ↔ VFS tool calls |
| `src/hooks/use-auth.ts` | Sign-in/sign-up + anonymous work migration |
| `src/lib/auth.ts` | JWT session helpers (server-only) |
| `src/app/main-content.tsx` | Top-level layout (chat + preview/code panels) |
| `prisma/schema.prisma` | DB schema — source of truth for all stored data (`User`, `Project`) |
| `node-compat.cjs` | Node.js 25+ SSR fix (deletes web storage globals) |

### Testing

Tests use Vitest + jsdom + React Testing Library. Test files live alongside source in `__tests__/` subdirectories.
