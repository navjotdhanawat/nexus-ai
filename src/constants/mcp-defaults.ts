/**
 * MCP Default Configurations
 * Default server configurations and constants
 */

import type { MCPServerConfigStdio, MCPServerConfigHttp } from '@/types/mcp'

// ============================================
// Default MCP Server IDs
// ============================================

export const MCP_SERVER_IDS = {
  CLI_MCP_SERVER: 'cli-mcp-server',
  CONTEXT7: 'context7',
} as const

export type MCPServerId = (typeof MCP_SERVER_IDS)[keyof typeof MCP_SERVER_IDS]

// ============================================
// Protocol Version
// ============================================

export const MCP_PROTOCOL_VERSION = '2024-11-05'

export const MCP_CLIENT_INFO = {
  name: 'ai-playground',
  version: '0.1.0-beta.1',
} as const

// ============================================
// Timeouts and Limits
// ============================================

export const MCP_TIMEOUTS = {
  REQUEST_TIMEOUT: 30000,
  SSE_CONNECTION_TIMEOUT: 10000,
  DATA_COLLECT_INTERVAL: 100,
} as const

// ============================================
// Default Server Configurations
// ============================================

/** Default CLI MCP Server configuration */
export const DEFAULT_CLI_MCP_SERVER: MCPServerConfigStdio = {
  id: MCP_SERVER_IDS.CLI_MCP_SERVER,
  name: 'CLI MCP Server',
  transport: 'stdio',
  command: 'uvx',
  args: ['cli-mcp-server'],
  env: {
    ALLOWED_DIR: '/tmp',
    ALLOWED_COMMANDS: 'ls,cat,pwd,echo,head,tail,wc,grep,find,date,whoami',
    ALLOWED_FLAGS: '-l,-a,-h,-n,-r,-v,-c,-i,--help,--version',
    MAX_COMMAND_LENGTH: '1024',
    COMMAND_TIMEOUT: '30',
    ALLOW_SHELL_OPERATORS: 'false',
  },
  enabled: true,
}

/** Default Context7 MCP Server configuration */
export const DEFAULT_CONTEXT7_SERVER: MCPServerConfigHttp = {
  id: MCP_SERVER_IDS.CONTEXT7,
  name: 'Context7 (Documentation)',
  transport: 'http',
  url: 'https://mcp.context7.com/mcp',
  headers: {
    CONTEXT7_API_KEY: '',
  },
  enabled: false,
}

/** All default MCP servers */
export const DEFAULT_MCP_SERVERS = [
  DEFAULT_CLI_MCP_SERVER,
  DEFAULT_CONTEXT7_SERVER,
] as const

