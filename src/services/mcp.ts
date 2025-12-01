/**
 * MCP (Model Context Protocol) Service
 * Handles MCP servers via both stdio and HTTP/SSE transports
 */

import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { logger } from '@/lib/logger'
import { useMCPStore } from '@/store/mcp-store'
import {
  MCP_PROTOCOL_VERSION,
  MCP_CLIENT_INFO,
  MCP_TIMEOUTS,
} from '@/constants/mcp-defaults'
import {
  isStdioConfig,
  isHttpConfig,
  type MCPServerConfig,
  type MCPServerConfigStdio,
  type MCPServerConfigHttp,
  type MCPTool,
  type MCPToolCallResult,
  type JsonRpcRequest,
  type JsonRpcResponse,
} from '@/types/mcp'

// =============================================================================
// Shared Types and State
// =============================================================================

interface MCPServerStateInternal {
  transport: 'stdio' | 'http'
  requestId: number
  pendingRequests: Map<
    number | string,
    {
      resolve: (value: unknown) => void
      reject: (error: Error) => void
    }
  >
}

interface StdioServerState extends MCPServerStateInternal {
  transport: 'stdio'
  buffer: string
  unlistenStdout?: UnlistenFn
  unlistenStderr?: UnlistenFn
}

interface HttpServerState extends MCPServerStateInternal {
  transport: 'http'
  sessionId?: string
  eventSource?: EventSource
  url: string
  headers?: Record<string, string>
}

type ServerState = StdioServerState | HttpServerState

const activeServers = new Map<string, ServerState>()

// Event types from Rust (for stdio)
interface McpStdoutEvent {
  server_id: string
  data: string
}

interface McpStderrEvent {
  server_id: string
  data: string
}

// =============================================================================
// Server Lifecycle
// =============================================================================

/**
 * Start an MCP server (auto-detects transport type)
 */
export async function startMCPServer(config: MCPServerConfig): Promise<void> {
  if (isStdioConfig(config)) {
    return startStdioServer(config)
  }
  if (isHttpConfig(config)) {
    return startHttpServer(config)
  }
  // Exhaustive check - this should never be reached
  const _exhaustive: never = config
  throw new Error(`Unknown transport type: ${_exhaustive}`)
}

/**
 * Stop an MCP server
 */
export async function stopMCPServer(serverId: string): Promise<void> {
  const server = activeServers.get(serverId)
  if (!server) {
    logger.warn(`MCP server ${serverId} is not running`)
    return
  }

  if (server.transport === 'stdio') {
    await stopStdioServer(serverId, server as StdioServerState)
  } else {
    await stopHttpServer(serverId, server as HttpServerState)
  }
}

// =============================================================================
// Stdio Transport Implementation
// =============================================================================

async function startStdioServer(config: MCPServerConfigStdio): Promise<void> {
  const { setServerState } = useMCPStore.getState()

  if (activeServers.has(config.id)) {
    logger.warn(`MCP server ${config.id} is already running`)
    return
  }

  logger.info(`Starting stdio MCP server: ${config.name}`, {
    command: config.command,
    args: config.args,
  })
  setServerState(config.id, { status: 'connecting', error: undefined })

  try {
    const serverState: StdioServerState = {
      transport: 'stdio',
      requestId: 0,
      pendingRequests: new Map(),
      buffer: '',
    }

    // Listen for stdout events
    serverState.unlistenStdout = await listen<McpStdoutEvent>(
      'mcp-stdout',
      (event) => {
        if (event.payload.server_id !== config.id) return

        const data = event.payload.data
        serverState.buffer += data + '\n'

        const lines = serverState.buffer.split('\n')
        serverState.buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.trim()) continue

          try {
            const response: JsonRpcResponse = JSON.parse(line)
            handleResponse(config.id, response)
          } catch {
            logger.debug(`Non-JSON output from MCP server: ${line}`)
          }
        }
      }
    )

    // Listen for stderr events
    serverState.unlistenStderr = await listen<McpStderrEvent>(
      'mcp-stderr',
      (event) => {
        if (event.payload.server_id !== config.id) return
        logger.debug(`MCP server ${config.id} stderr: ${event.payload.data}`)
      }
    )

    activeServers.set(config.id, serverState)

    // Spawn via Rust
    const pid = await invoke<number>('spawn_mcp_server', {
      config: {
        id: config.id,
        command: config.command,
        args: config.args,
        env: config.env,
      },
    })

    logger.info(`MCP server ${config.id} spawned with PID: ${pid}`)

    // Initialize
    await initializeStdioServer(config.id)
    const tools = await listToolsStdio(config.id)
    setServerState(config.id, { status: 'connected', tools })

    logger.info(`MCP server ${config.id} connected with ${tools.length} tools`)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(`Failed to start MCP server ${config.id}: ${errorMessage}`)
    setServerState(config.id, { status: 'error', error: errorMessage })

    const server = activeServers.get(config.id) as StdioServerState | undefined
    if (server) {
      server.unlistenStdout?.()
      server.unlistenStderr?.()
      activeServers.delete(config.id)
    }

    throw error
  }
}

async function stopStdioServer(
  serverId: string,
  server: StdioServerState
): Promise<void> {
  const { clearServerState, setServerState } = useMCPStore.getState()

  logger.info(`Stopping stdio MCP server: ${serverId}`)

  try {
    server.unlistenStdout?.()
    server.unlistenStderr?.()
    await invoke('kill_mcp_server', { serverId })
    activeServers.delete(serverId)
    clearServerState(serverId)
    logger.info(`MCP server ${serverId} stopped`)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(`Failed to stop MCP server ${serverId}: ${errorMessage}`)
    setServerState(serverId, { status: 'error', error: errorMessage })
  }
}

async function sendStdioRequest(
  serverId: string,
  method: string,
  params?: Record<string, unknown>
): Promise<unknown> {
  const server = activeServers.get(serverId) as StdioServerState | undefined
  if (!server || server.transport !== 'stdio') {
    throw new Error(`Stdio MCP server ${serverId} is not running`)
  }

  const id = ++server.requestId
  const request: JsonRpcRequest = {
    jsonrpc: '2.0',
    id,
    method,
    params,
  }

  logger.debug(`Sending stdio MCP request to ${serverId}:`, { method, id })

  return new Promise((resolve, reject) => {
    server.pendingRequests.set(id, { resolve, reject })

    const timeout = setTimeout(() => {
      server.pendingRequests.delete(id)
      reject(new Error(`Request timeout for ${method}`))
    }, MCP_TIMEOUTS.REQUEST_TIMEOUT)

    const originalResolve = resolve
    server.pendingRequests.set(id, {
      resolve: (value) => {
        clearTimeout(timeout)
        originalResolve(value)
      },
      reject: (error) => {
        clearTimeout(timeout)
        reject(error)
      },
    })

    const message = JSON.stringify(request) + '\n'
    invoke('write_mcp_stdin', { serverId, data: message }).catch((error) => {
      server.pendingRequests.delete(id)
      reject(error)
    })
  })
}

async function initializeStdioServer(serverId: string): Promise<void> {
  await sendStdioRequest(serverId, 'initialize', {
    protocolVersion: MCP_PROTOCOL_VERSION,
    capabilities: { tools: {} },
    clientInfo: MCP_CLIENT_INFO,
  })

  const notification =
    JSON.stringify({
      jsonrpc: '2.0',
      method: 'notifications/initialized',
    }) + '\n'

  await invoke('write_mcp_stdin', { serverId, data: notification })
}

async function listToolsStdio(serverId: string): Promise<MCPTool[]> {
  const result = (await sendStdioRequest(serverId, 'tools/list')) as {
    tools: MCPTool[]
  }
  return result?.tools || []
}

// =============================================================================
// HTTP/SSE Transport Implementation
// =============================================================================

async function startHttpServer(config: MCPServerConfigHttp): Promise<void> {
  const { setServerState } = useMCPStore.getState()

  if (activeServers.has(config.id)) {
    logger.warn(`MCP server ${config.id} is already running`)
    return
  }

  logger.info(`Starting HTTP MCP server: ${config.name}`, { url: config.url })
  setServerState(config.id, { status: 'connecting', error: undefined })

  try {
    const serverState: HttpServerState = {
      transport: 'http',
      requestId: 0,
      pendingRequests: new Map(),
      url: config.url,
      headers: config.headers,
    }

    activeServers.set(config.id, serverState)

    // Connect to SSE endpoint for responses
    await connectHttpSSE(config.id, serverState)

    // Initialize
    await initializeHttpServer(config.id)
    const tools = await listToolsHttp(config.id)
    setServerState(config.id, { status: 'connected', tools })

    logger.info(`HTTP MCP server ${config.id} connected with ${tools.length} tools`)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(`Failed to start HTTP MCP server ${config.id}: ${errorMessage}`)
    setServerState(config.id, { status: 'error', error: errorMessage })

    const server = activeServers.get(config.id) as HttpServerState | undefined
    if (server?.eventSource) {
      server.eventSource.close()
    }
    activeServers.delete(config.id)

    throw error
  }
}

async function connectHttpSSE(
  serverId: string,
  server: HttpServerState
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Build SSE URL with headers as query params if needed
    const sseUrl = new URL(server.url)
    sseUrl.pathname = sseUrl.pathname.replace(/\/?$/, '/sse')

    // Add headers as query parameters for SSE (since EventSource doesn't support custom headers)
    if (server.headers) {
      for (const [key, value] of Object.entries(server.headers)) {
        if (value) {
          sseUrl.searchParams.set(key, value)
        }
      }
    }

    const eventSource = new EventSource(sseUrl.toString())
    server.eventSource = eventSource

    eventSource.onopen = () => {
      logger.info(`SSE connected for ${serverId}`)
      resolve()
    }

    eventSource.onerror = () => {
      logger.error(`SSE error for ${serverId}`)
      reject(new Error('Failed to connect to SSE endpoint'))
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        // Handle endpoint message (contains session info)
        if (data.endpoint) {
          server.sessionId = data.sessionId
          logger.debug(`Got session ID for ${serverId}: ${data.sessionId}`)
          return
        }

        // Handle JSON-RPC response
        if (data.jsonrpc === '2.0' && data.id !== undefined) {
          handleResponse(serverId, data as JsonRpcResponse)
        }
      } catch {
        logger.debug(`Non-JSON SSE message: ${event.data}`)
      }
    }

    // Set timeout for initial connection
    setTimeout(() => {
      if (eventSource.readyState !== EventSource.OPEN) {
        eventSource.close()
        reject(new Error('SSE connection timeout'))
      }
    }, MCP_TIMEOUTS.SSE_CONNECTION_TIMEOUT)
  })
}

async function stopHttpServer(
  serverId: string,
  server: HttpServerState
): Promise<void> {
  const { clearServerState } = useMCPStore.getState()

  logger.info(`Stopping HTTP MCP server: ${serverId}`)

  if (server.eventSource) {
    server.eventSource.close()
  }

  activeServers.delete(serverId)
  clearServerState(serverId)
  logger.info(`HTTP MCP server ${serverId} stopped`)
}

async function sendHttpRequest(
  serverId: string,
  method: string,
  params?: Record<string, unknown>
): Promise<unknown> {
  const server = activeServers.get(serverId) as HttpServerState | undefined
  if (!server || server.transport !== 'http') {
    throw new Error(`HTTP MCP server ${serverId} is not running`)
  }

  const id = ++server.requestId
  const request: JsonRpcRequest = {
    jsonrpc: '2.0',
    id,
    method,
    params,
  }

  logger.debug(`Sending HTTP MCP request to ${serverId}:`, { method, id })

  return new Promise((resolve, reject) => {
    server.pendingRequests.set(id, { resolve, reject })

    const timeout = setTimeout(() => {
      server.pendingRequests.delete(id)
      reject(new Error(`Request timeout for ${method}`))
    }, MCP_TIMEOUTS.REQUEST_TIMEOUT)

    const originalResolve = resolve
    server.pendingRequests.set(id, {
      resolve: (value) => {
        clearTimeout(timeout)
        originalResolve(value)
      },
      reject: (error) => {
        clearTimeout(timeout)
        reject(error)
      },
    })

    // Send request via HTTP POST
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...server.headers,
    }

    fetch(server.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        // Response comes via SSE, not from this POST
        // Some servers return the response directly
        return response.json().catch(() => null)
      })
      .then((data) => {
        // If we got a direct response, handle it
        if (data?.jsonrpc === '2.0' && data.id === id) {
          handleResponse(serverId, data as JsonRpcResponse)
        }
      })
      .catch((error) => {
        server.pendingRequests.delete(id)
        reject(error)
      })
  })
}

async function initializeHttpServer(serverId: string): Promise<void> {
  await sendHttpRequest(serverId, 'initialize', {
    protocolVersion: MCP_PROTOCOL_VERSION,
    capabilities: { tools: {} },
    clientInfo: MCP_CLIENT_INFO,
  })

  // Send initialized notification
  const server = activeServers.get(serverId) as HttpServerState
  if (server) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...server.headers,
    }

    await fetch(server.url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'notifications/initialized',
      }),
    })
  }
}

async function listToolsHttp(serverId: string): Promise<MCPTool[]> {
  const result = (await sendHttpRequest(serverId, 'tools/list')) as {
    tools: MCPTool[]
  }
  return result?.tools || []
}

// =============================================================================
// Shared Response Handler
// =============================================================================

function handleResponse(serverId: string, response: JsonRpcResponse): void {
  const server = activeServers.get(serverId)
  if (!server) return

  const pending = server.pendingRequests.get(response.id)
  if (!pending) {
    logger.warn(`Received response for unknown request ID: ${response.id}`)
    return
  }

  server.pendingRequests.delete(response.id)

  if (response.error) {
    pending.reject(new Error(response.error.message))
  } else {
    pending.resolve(response.result)
  }
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Call a tool on an MCP server
 */
export async function callTool(
  serverId: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<MCPToolCallResult> {
  logger.info(`Calling tool ${toolName} on server ${serverId}`, { args })

  const server = activeServers.get(serverId)
  if (!server) {
    return {
      content: [{ type: 'text', text: `Error: Server ${serverId} not running` }],
      isError: true,
    }
  }

  try {
    const sendFn =
      server.transport === 'stdio' ? sendStdioRequest : sendHttpRequest

    const result = (await sendFn(serverId, 'tools/call', {
      name: toolName,
      arguments: args,
    })) as MCPToolCallResult

    logger.info(`Tool ${toolName} completed successfully`)
    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(`Tool ${toolName} failed: ${errorMessage}`)
    return {
      content: [{ type: 'text', text: `Error: ${errorMessage}` }],
      isError: true,
    }
  }
}

/**
 * Start all enabled MCP servers
 */
export async function startAllEnabledServers(): Promise<void> {
  const { servers } = useMCPStore.getState()
  const enabledServers = servers.filter((s) => s.enabled)

  logger.info(`Starting ${enabledServers.length} MCP servers`)

  await Promise.allSettled(enabledServers.map((server) => startMCPServer(server)))
}

/**
 * Stop all running MCP servers
 */
export async function stopAllServers(): Promise<void> {
  const serverIds = Array.from(activeServers.keys())
  logger.info(`Stopping ${serverIds.length} MCP servers`)

  await Promise.allSettled(serverIds.map((id) => stopMCPServer(id)))
}

/**
 * Get running server IDs
 */
export function getRunningServerIds(): string[] {
  return Array.from(activeServers.keys())
}

/**
 * Check if a server is running
 */
export function isServerRunning(serverId: string): boolean {
  return activeServers.has(serverId)
}

/**
 * Find which server provides a tool
 */
export function findToolServer(toolName: string): string | undefined {
  const { servers, serverStates } = useMCPStore.getState()

  for (const server of servers) {
    if (!server.enabled) continue
    const state = serverStates.get(server.id)
    if (state?.status === 'connected') {
      const hasTool = state.tools?.some((t) => t.name === toolName)
      if (hasTool) return server.id
    }
  }

  return undefined
}
