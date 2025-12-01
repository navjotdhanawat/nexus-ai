/**
 * MCP (Model Context Protocol) Types
 * Based on the MCP specification for tool calling
 */

// ============================================
// JSON-RPC Types
// ============================================

export interface JsonRpcRequest {
  jsonrpc: '2.0'
  id: number | string
  method: string
  params?: Record<string, unknown>
}

export interface JsonRpcResponse {
  jsonrpc: '2.0'
  id: number | string
  result?: unknown
  error?: JsonRpcError
}

export interface JsonRpcError {
  code: number
  message: string
  data?: unknown
}

// ============================================
// MCP Tool Types
// ============================================

export interface MCPTool {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, MCPToolProperty>
    required?: string[]
  }
}

export interface MCPToolProperty {
  type: string
  description?: string
  enum?: string[]
  default?: unknown
}

export interface MCPToolCallResult {
  content: MCPContent[]
  isError?: boolean
}

export interface MCPContent {
  type: 'text' | 'image' | 'resource'
  text?: string
  data?: string
  mimeType?: string
}

// ============================================
// MCP Transport Types
// ============================================

export type MCPTransportType = 'stdio' | 'http'

// ============================================
// MCP Server Configuration Types
// ============================================

/** Base MCP Server configuration */
export interface MCPServerConfigBase {
  id: string
  name: string
  enabled: boolean
  transport: MCPTransportType
}

/** Stdio transport configuration */
export interface MCPServerConfigStdio extends MCPServerConfigBase {
  transport: 'stdio'
  command: string
  args: string[]
  env?: Record<string, string>
}

/** HTTP/SSE transport configuration */
export interface MCPServerConfigHttp extends MCPServerConfigBase {
  transport: 'http'
  url: string
  headers?: Record<string, string>
}

/** Union type for all server configs */
export type MCPServerConfig = MCPServerConfigStdio | MCPServerConfigHttp

// ============================================
// Type Guards
// ============================================

export function isStdioConfig(
  config: MCPServerConfig
): config is MCPServerConfigStdio {
  return config.transport === 'stdio'
}

export function isHttpConfig(
  config: MCPServerConfig
): config is MCPServerConfigHttp {
  return config.transport === 'http'
}

// ============================================
// MCP Server State
// ============================================

export interface MCPServerState {
  id: string
  status: 'disconnected' | 'connecting' | 'connected' | 'error'
  tools: MCPTool[]
  error?: string
}

// ============================================
// Tool Call Types
// ============================================

/** Tool call for LLM */
export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export interface ToolCallWithResult extends ToolCall {
  result?: MCPToolCallResult
  status: 'pending' | 'executing' | 'success' | 'error'
}

// ============================================
// Re-export defaults from constants
// ============================================

export {
  MCP_SERVER_IDS,
  MCP_PROTOCOL_VERSION,
  MCP_CLIENT_INFO,
  MCP_TIMEOUTS,
  DEFAULT_CLI_MCP_SERVER,
  DEFAULT_CONTEXT7_SERVER,
  DEFAULT_MCP_SERVERS,
  type MCPServerId,
} from '@/constants/mcp-defaults'
