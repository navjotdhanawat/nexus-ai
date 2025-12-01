/**
 * MCP Store
 * State management for MCP (Model Context Protocol) servers
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type {
  MCPServerConfig,
  MCPServerConfigStdio,
  MCPServerState,
  MCPTool,
} from '@/types/mcp'
import { DEFAULT_MCP_SERVERS } from '@/constants/mcp-defaults'

// ============================================
// Store Types
// ============================================

interface MCPState {
  // Server configurations (persisted)
  servers: MCPServerConfig[]

  // Runtime state (not persisted)
  serverStates: Map<string, MCPServerState>

  // Actions for server configuration
  addServer: (server: MCPServerConfig) => void
  updateServer: (id: string, updates: Partial<MCPServerConfig>) => void
  removeServer: (id: string) => void
  toggleServer: (id: string) => void

  // Actions for runtime state
  setServerState: (id: string, state: Partial<MCPServerState>) => void
  setServerTools: (id: string, tools: MCPTool[]) => void
  setServerError: (id: string, error: string | undefined) => void
  clearServerState: (id: string) => void

  // Getters
  getEnabledServers: () => MCPServerConfig[]
  getAllTools: () => MCPTool[]
  getServerById: (id: string) => MCPServerConfig | undefined
}

// ============================================
// Helpers
// ============================================

const generateId = () => Math.random().toString(36).substring(2, 15)

/**
 * Migration helper: ensure old servers have transport field
 */
function migrateServer(server: MCPServerConfig | Record<string, unknown>): MCPServerConfig {
  // If server already has transport, return as-is
  if ('transport' in server && server.transport) {
    return server as MCPServerConfig
  }

  // Old servers without transport are stdio servers
  // They have 'command' and 'args' fields
  if ('command' in server) {
    return {
      ...server,
      transport: 'stdio',
    } as MCPServerConfigStdio
  }

  // Fallback: treat as stdio with empty command (will need editing)
  return {
    id: (server.id as string) || generateId(),
    name: (server.name as string) || 'Unknown Server',
    transport: 'stdio',
    command: '',
    args: [],
    enabled: (server.enabled as boolean) ?? false,
  } as MCPServerConfigStdio
}

// ============================================
// Store Implementation
// ============================================

export const useMCPStore = create<MCPState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state with default MCP servers
        servers: [...DEFAULT_MCP_SERVERS],
        serverStates: new Map(),

        // Server configuration actions
        addServer: (server) => {
          set(
            (state) => ({
              servers: [...state.servers, { ...server, id: server.id || generateId() }],
            }),
            undefined,
            'addServer'
          )
        },

        updateServer: (id, updates) => {
          set(
            (state) => ({
              servers: state.servers.map((s) =>
                s.id === id ? ({ ...s, ...updates } as MCPServerConfig) : s
              ),
            }),
            undefined,
            'updateServer'
          )
        },

        removeServer: (id) => {
          set(
            (state) => ({
              servers: state.servers.filter((s) => s.id !== id),
            }),
            undefined,
            'removeServer'
          )
        },

        toggleServer: (id) => {
          set(
            (state) => ({
              servers: state.servers.map((s) =>
                s.id === id ? { ...s, enabled: !s.enabled } : s
              ),
            }),
            undefined,
            'toggleServer'
          )
        },

        // Runtime state actions
        setServerState: (id, stateUpdate) => {
          set(
            (state) => {
              const newStates = new Map(state.serverStates)
              const currentState = newStates.get(id) || {
                id,
                status: 'disconnected' as const,
                tools: [],
              }
              newStates.set(id, { ...currentState, ...stateUpdate })
              return { serverStates: newStates }
            },
            undefined,
            'setServerState'
          )
        },

        setServerTools: (id, tools) => {
          get().setServerState(id, { tools })
        },

        setServerError: (id, error) => {
          get().setServerState(id, {
            error,
            status: error ? 'error' : 'connected',
          })
        },

        clearServerState: (id) => {
          set(
            (state) => {
              const newStates = new Map(state.serverStates)
              newStates.delete(id)
              return { serverStates: newStates }
            },
            undefined,
            'clearServerState'
          )
        },

        // Getters
        getEnabledServers: () => {
          return get().servers.filter((s) => s.enabled)
        },

        getAllTools: () => {
          const tools: MCPTool[] = []
          const { serverStates, servers } = get()

          for (const server of servers) {
            if (server.enabled) {
              const state = serverStates.get(server.id)
              if (state?.status === 'connected' && state.tools) {
                tools.push(...state.tools)
              }
            }
          }

          return tools
        },

        getServerById: (id) => {
          return get().servers.find((s) => s.id === id)
        },
      }),
      {
        name: 'mcp-store',
        partialize: (state) => ({
          servers: state.servers,
        }),
        // Migrate old server configs on rehydration
        merge: (persistedState, currentState) => {
          const persisted = persistedState as { servers?: unknown[] } | undefined
          if (persisted?.servers) {
            return {
              ...currentState,
              servers: persisted.servers.map((s) =>
                migrateServer(s as MCPServerConfig | Record<string, unknown>)
              ),
            }
          }
          return currentState
        },
      }
    ),
    { name: 'mcp-store' }
  )
)

// ============================================
// Selectors
// ============================================

export const selectEnabledServers = (state: MCPState) =>
  state.servers.filter((s) => s.enabled)

export const selectServerState = (state: MCPState, id: string) =>
  state.serverStates.get(id)

export const selectAllTools = (state: MCPState) => {
  const tools: MCPTool[] = []
  for (const server of state.servers) {
    if (server.enabled) {
      const serverState = state.serverStates.get(server.id)
      if (serverState?.status === 'connected' && serverState.tools) {
        tools.push(...serverState.tools)
      }
    }
  }
  return tools
}
