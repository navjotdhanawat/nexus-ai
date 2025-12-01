# Getting Started with AI Playground Development

Welcome! This guide will help you set up AI Playground for development and contribution.

## Quick Setup

### Prerequisites

Ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **Rust** (latest stable) - [Install with rustup](https://rustup.rs/)
- **macOS**: Xcode Command Line Tools (`xcode-select --install`)

### Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/navjotdhanawat/ai-playground.git
   cd ai-playground
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Start development**:

   ```bash
   npm run tauri:dev
   ```

4. **Verify everything works**:
   - The app should open in a desktop window
   - Try the command palette (⌘+K)
   - Test the preferences dialog (⌘+,)
   - Add an API key and test chat functionality

## Key Features

### 🤖 Multi-Provider LLM Support
- Google Gemini, OpenAI, and Groq integrations
- Located in `src/services/llm.ts`
- Model configurations in `src/constants/models.ts`

### 🔧 MCP Tool Integration
- Model Context Protocol client implementation
- Located in `src/services/mcp.ts`
- Rust backend for stdio transport in `src-tauri/src/lib.rs`

### 💬 Chat Interface
- Chat components in `src/components/chat/`
- Chat state in `src/store/chat-store.ts`
- Streaming and tool execution in `src/hooks/use-chat-actions.ts`

### 🎯 Command System
- Command palette with keyboard shortcuts
- Commands in `src/lib/commands/`
- Menu integration via Rust menus

## Architecture Overview

### State Management

```
useState (component) → Zustand (global UI) → TanStack Query (persistent data)
```

- **Zustand stores**: `src/store/` - UI state, chat, API keys, MCP servers
- **Performance pattern**: Use `getState()` to avoid render cascades

### Project Structure

```
src/                     # React frontend
├── components/          # UI components
│   ├── chat/           # Chat interface
│   ├── command-palette/ # Command palette
│   ├── layout/         # Main window layout
│   ├── preferences/    # Settings dialogs
│   └── ui/             # shadcn/ui components
├── hooks/              # Custom React hooks
├── lib/                # Utilities and commands
├── services/           # LLM and MCP services
├── store/              # Zustand state stores
└── types/              # TypeScript definitions

src-tauri/              # Rust backend
├── src/
│   ├── lib.rs         # Tauri commands, menus, MCP stdio
│   └── main.rs        # App entry point
└── capabilities/       # Security permissions
```

## Development Workflow

### Running Quality Checks

```bash
# Run all quality checks (recommended before commits)
npm run check:all

# Individual checks
npm run typecheck    # TypeScript checking
npm run lint         # ESLint
npm run test:run     # Run tests
npm run rust:clippy  # Rust linting
```

### Building for Production

```bash
npm run tauri:build
```

The `.app` and `.dmg` files will be in `src-tauri/target/release/bundle/`.

## Adding Features

### Add a New LLM Provider

1. Add provider constants to `src/constants/models.ts`
2. Implement API call in `src/services/llm.ts`
3. Add API key handling in `src/store/api-keys-store.ts`

### Add a New Command

1. Create command file in `src/lib/commands/`
2. Register in `src/lib/commands/registry.ts`
3. Add menu item if needed in `src-tauri/src/lib.rs`

### Add an MCP Feature

1. Update MCP types in `src/types/mcp.ts`
2. Implement in `src/services/mcp.ts`
3. Update Rust backend if needed in `src-tauri/src/lib.rs`

## Documentation

- **[Architecture Guide](developer/architecture-guide.md)** - System design
- **[Command System](developer/command-system.md)** - Commands and shortcuts
- **[Testing Guide](developer/testing.md)** - Test patterns
- **[User Guide](userguide/userguide.md)** - End-user documentation

## Getting Help

### Resources

- **[Tauri Documentation](https://tauri.app/)** - Tauri v2 docs
- **[Model Context Protocol](https://modelcontextprotocol.io/)** - MCP specification
- **[shadcn/ui Components](https://ui.shadcn.com/)** - UI component library

### Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

---

**Next**: Read the [Architecture Guide](developer/architecture-guide.md) to understand the system design and patterns.
