# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Initial setup (install deps + generate Prisma client + run migrations)
npm run setup

# Development server (Turbopack)
npm run dev

# Build
npm run build

# Lint
npm run lint

# Run all tests
npm test

# Run a single test file
npx vitest run src/components/chat/__tests__/ChatInterface.test.tsx

# Reset database
npm run db:reset
```

## Architecture

UIGen is a Next.js 15 App Router app that lets users describe React components in a chat interface, which Claude then generates live in a sandboxed preview pane.

### Key data flow

1. **Chat → API**: `ChatProvider` (`src/lib/contexts/chat-context.tsx`) uses Vercel AI SDK's `useChat` hook to POST to `/api/chat`. It sends the current message history plus a serialized snapshot of the virtual file system (`fileSystem.serialize()`).

2. **API → Claude**: `src/app/api/chat/route.ts` reconstructs the `VirtualFileSystem` from the serialized data, then calls `streamText` with two tools — `str_replace_editor` (for creating/editing files) and `file_manager` (for renaming/deleting). Claude calls these tools to write files into the virtual FS.

3. **Tool calls → File system**: `FileSystemContext` (`src/lib/contexts/file-system-context.tsx`) receives tool call results via `onToolCall` and applies them to the in-memory `VirtualFileSystem`. A `refreshTrigger` counter increments on each change.

4. **File system → Preview**: `PreviewFrame` (`src/components/preview/PreviewFrame.tsx`) watches `refreshTrigger`. On change it calls `createImportMap()` which uses `@babel/standalone` to transpile all JSX/TSX files to JS, creates blob URLs for each, and builds an ES module import map. The result is injected into a sandboxed `<iframe>` as `srcdoc`. Third-party npm imports are resolved via `esm.sh`.

### Virtual file system

`VirtualFileSystem` (`src/lib/file-system.ts`) is an in-memory tree (not disk). It serializes to/from plain `Record<string, FileNode>` for JSON transport. The singleton `fileSystem` export is used server-side; client-side state lives inside `FileSystemContext`.

### Auth

JWT-based, cookie-stored sessions via `jose`. `src/lib/auth.ts` is server-only. The middleware (`src/middleware.ts`) protects `/api/projects` and `/api/filesystem` routes. Anonymous users can generate components; their work is tracked in `sessionStorage` via `src/lib/anon-work-tracker.ts` so it can be saved when they sign up.

### AI provider

`src/lib/provider.ts` exports `getLanguageModel()`. If `ANTHROPIC_API_KEY` is missing, it returns a `MockLanguageModel` that produces static demo components. The real model is `claude-haiku-4-5`.

### Persistence

Authenticated users' projects are stored in SQLite via Prisma. See `prisma/schema.prisma` for the full data model — reference it whenever you need to understand the structure of data stored in the database. The `Project` record holds serialized `messages` (JSON string) and `data` (serialized VFS as JSON string). `userId` is optional to allow anonymous project creation.

### Testing

Tests use Vitest + jsdom + React Testing Library. Config is `vitest.config.mts`. Test files live next to their subjects in `__tests__` subdirectories.

## Code style

- Only comment code that is genuinely complex or non-obvious. Skip comments on self-explanatory logic.
