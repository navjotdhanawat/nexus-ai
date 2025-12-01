# AI Playground User Guide

Welcome to AI Playground! This guide will help you get the most out of your AI chat experience.

## Getting Started

### First Launch

1. **Open Preferences** - Press `Cmd+,` or click the gear icon
2. **Configure API Keys** - Add at least one API key:
   - **Google AI** - Get from [Google AI Studio](https://aistudio.google.com/)
   - **OpenAI** - Get from [OpenAI Platform](https://platform.openai.com/)
   - **Groq** - Get from [Groq Console](https://console.groq.com/)
3. **Start Chatting** - Select a model and send your first message!

### Interface Overview

```
┌─────────────────────────────────────────────────────────────┐
│  ◉ ◉ ◉  │ [≡]                AI Playground            [⚙] [≡] │  ← Title Bar
├──────────┼───────────────────────────────────────┼──────────┤
│          │                                       │          │
│  Chats   │         Chat Messages                │  Model   │
│          │                                       │  Info    │
│  Today   │  ┌──────────────────────────────┐   │          │
│  • Chat 1│  │ User message here...         │   │  System  │
│  • Chat 2│  └──────────────────────────────┘   │  Prompt  │
│          │  ┌──────────────────────────────┐   │          │
│ Yesterday│  │ AI response here...          │   │  Params  │
│  • Chat 3│  └──────────────────────────────┘   │          │
│          │                                       │  Stats   │
├──────────┼───────────────────────────────────────┼──────────┤
│          │  [📎] Type a message...      [Send]  │          │
└──────────┴───────────────────────────────────────┴──────────┘
     ↑              ↑                                   ↑
 Left Sidebar   Main Chat Area                   Right Sidebar
  (Cmd+1)                                          (Cmd+2)
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+K` | Open Command Palette |
| `Cmd+,` | Open Preferences |
| `Cmd+1` | Toggle Left Sidebar (Chat History) |
| `Cmd+2` | Toggle Right Sidebar (Settings Panel) |
| `Enter` | Send Message |
| `Shift+Enter` | New Line in Message |
| `Cmd+V` | Paste (including images in vision models) |

## Models & Capabilities

### Google Gemini Models

| Model | Vision | Audio | Image Gen | Best For |
|-------|:------:|:-----:|:---------:|----------|
| Gemini 3 Pro | ✅ | ✅ | ❌ | Advanced reasoning |
| Gemini 3 Deep Think | ✅ | ❌ | ❌ | Complex problem-solving |
| Gemini 2.5 Pro | ✅ | ✅ | ❌ | Coding, analysis |
| Gemini 2.5 Flash | ✅ | ✅ | ❌ | Fast responses |
| Gemini 2.5 Flash Image | ✅ | ❌ | ✅ | Image generation |

### OpenAI Models

| Model | Vision | Audio | Image Gen | Best For |
|-------|:------:|:-----:|:---------:|----------|
| GPT-4o | ✅ | ❌ | ❌ | General purpose |
| GPT-4o Mini | ✅ | ❌ | ❌ | Fast, affordable |
| GPT-4 Turbo | ✅ | ❌ | ❌ | Extended context |
| DALL-E 3 | ❌ | ❌ | ✅ | High-quality images |

### Groq Models

| Model | Vision | Audio | Best For |
|-------|:------:|:-----:|----------|
| Llama 3.3 70B | ❌ | ❌ | Fast inference |
| Llama 3.1 8B | ❌ | ❌ | Ultra-fast |
| Mixtral 8x7B | ❌ | ❌ | Large context |
| Llama 3.2 11B Vision | ✅ | ❌ | Vision tasks |

## Working with Images

### Sending Images

1. **Paste from clipboard** - Copy an image and press `Cmd+V`
2. **Drag and drop** - Drop an image file onto the chat
3. **Attachment menu** - Click the 📎 icon and select "Upload Image"

### Image Generation

1. Select an image-capable model (DALL-E 3, Gemini Flash Image)
2. Describe the image you want to create
3. The generated image will appear in the chat

## Working with Audio

For models that support audio (Gemini 2.0+, 2.5+, 3.0):

1. Click the 📎 icon and select "Record Audio"
2. Record your voice message
3. The audio will be transcribed and sent to the model

## MCP Tool Integration

AI Playground supports the [Model Context Protocol](https://modelcontextprotocol.io/) for tool integration.

### Configuring MCP Servers

1. Open Preferences (`Cmd+,`)
2. Go to **MCP Servers**
3. Click **Add Server**
4. Configure the server:

```json
{
  "name": "Filesystem",
  "transport": "stdio",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir"],
  "enabled": true
}
```

### Using MCP Tools

When MCP servers are connected:
- Tools appear automatically for capable models
- The AI will use tools when needed
- Tool results are shown in the chat

## Conversation Management

### Creating Conversations
- Click the **+** button in the left sidebar
- Or start typing in an empty chat

### Managing Conversations
- **Switch**: Click any conversation in the left sidebar
- **Delete**: Click the `...` menu → Delete
- **Clear**: Click the trash icon in the chat header

### Exporting Conversations
1. Click the download icon in the chat header
2. Choose format:
   - **Markdown** - Human-readable format
   - **JSON** - Machine-readable with full metadata
3. Save to file or copy to clipboard

## Chat Settings

Access via the right sidebar (`Cmd+2`) or the settings icon:

### System Prompt
Set instructions for how the AI should behave. This is sent with every message.

### Temperature
- **Lower (0-0.5)**: More focused, deterministic responses
- **Higher (1-2)**: More creative, varied responses

### Max Tokens
Maximum length of the AI's response. Higher values allow longer responses but may be slower.

## Preferences

### General
- Default model selection
- Startup behavior

### Appearance
- **Light**: Bright theme for day use
- **Dark**: Dark theme for night use
- **System**: Follow macOS appearance

### MCP Servers
- Add, edit, and remove MCP server configurations
- Enable/disable servers without removing them

### Advanced
- Debug options
- Data management

## Tips & Tricks

### Better Responses
- Be specific in your prompts
- Use system prompts for consistent behavior
- Adjust temperature based on task type

### Performance
- Use Flash models for quick tasks
- Use Pro models for complex analysis
- Groq models offer the fastest inference

### Organization
- Conversations auto-title from first message
- Use clear first messages for easy searching
- Export important conversations for backup

## Troubleshooting

### "API Key Missing" Error
1. Open Preferences (`Cmd+,`)
2. Check that the API key is entered correctly
3. Ensure the key has the necessary permissions

### MCP Server Not Connecting
1. Check server configuration in Preferences
2. Verify the command and arguments are correct
3. Ensure required tools are installed (e.g., `npx`)
4. Click the terminal icon to restart MCP servers

### Slow Responses
- Try a Flash or smaller model
- Check your internet connection
- Reduce max tokens setting

### App Not Starting
- Ensure macOS permissions are granted
- Try deleting preferences: `~/Library/Application Support/com.navjotdhanawat.ai-playground/`

---

**Need more help?** Open an issue on [GitHub](https://github.com/navjotdhanawat/ai-playground/issues)
