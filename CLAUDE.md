# Claude Instructions

## Overview

AI Playground is a native desktop AI chat application built with Tauri v2 + React 19. It supports multiple LLM providers (Google Gemini, OpenAI, Groq) with MCP tool integration and multimodal capabilities.

## Quick Context

- **Chat Interface**: `src/components/chat/` - Main chat components
- **LLM Service**: `src/services/llm.ts` - Multi-provider API integration
- **MCP Service**: `src/services/mcp.ts` - Model Context Protocol client
- **State**: `src/store/` - Zustand stores (chat, ui, api-keys, mcp)
- **Tauri Backend**: `src-tauri/src/` - Rust commands for MCP stdio

## Core Rules

### Development Practices

1. **Read Before Editing**: Always read files first to understand context
2. **Follow Established Patterns**: Check existing code style and patterns
3. **Test Coverage**: Write tests for new business logic
4. **Quality Gates**: Run `npm run check:all` after significant changes
5. **No Dev Server**: Ask user to run and report back
6. **Version Requirements**: Tauri v2.x, shadcn/ui v4.x, Tailwind v4.x, React 19.x, Zustand v5.x

## Architecture Patterns

### State Management Onion

```
useState (component) → Zustand (global UI) → TanStack Query (persistent data)
```

### Performance Pattern (CRITICAL)

```typescript
// ✅ GOOD: Use getState() to avoid render cascades
const handleAction = useCallback(() => {
  const { data, setData } = useStore.getState()
  setData(newData)
}, []) // Empty deps = stable

// ❌ BAD: Store subscriptions cause cascades
const { data, setData } = useStore()
```

### Event-Driven Bridge

- **Rust → React**: `app.emit("event-name", data)` → `listen("event-name", handler)`
- **React → Rust**: `invoke("command_name", args)` with TanStack Query
- **Commands**: All actions flow through centralized command system

## Key Files

| File | Purpose |
|------|---------|
| `src/services/llm.ts` | LLM API calls (Google, OpenAI, Groq) |
| `src/services/mcp.ts` | MCP server management |
| `src/store/chat-store.ts` | Conversation state |
| `src/store/mcp-store.ts` | MCP server configurations |
| `src/hooks/use-chat-actions.ts` | Chat action handlers with MCP tool execution |
| `src/constants/models.ts` | Model configurations and capabilities |
| `src-tauri/src/lib.rs` | Tauri commands for MCP stdio |

## Commands

```bash
npm run tauri:dev     # Start dev server
npm run check:all     # Run all quality checks
npm run tauri:build   # Build for production
```
