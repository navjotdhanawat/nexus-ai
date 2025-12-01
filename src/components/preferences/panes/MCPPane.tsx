/**
 * MCP Settings Pane
 * Configuration UI for MCP (Model Context Protocol) servers
 */

import React, { useState, useCallback, useMemo, memo } from 'react'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Terminal,
  Globe,
  Plus,
  Trash2,
  Edit2,
  Power,
  PowerOff,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react'
import { useMCPStore } from '@/store/mcp-store'
import { startMCPServer, stopMCPServer, isServerRunning } from '@/services/mcp'
import {
  isStdioConfig,
  isHttpConfig,
  type MCPServerConfig,
  type MCPServerConfigStdio,
  type MCPServerConfigHttp,
  type MCPTransportType,
} from '@/types/mcp'
import {
  stdioServerSchema,
  httpServerSchema,
  parseEnvString,
  envToString,
  parseArgsString,
} from '@/lib/validation'

// ============================================
// Reusable Settings Components
// ============================================

const SettingsField: React.FC<{
  label: string
  children: React.ReactNode
  description?: string
  error?: string
}> = ({ label, children, description, error }) => (
  <div className="space-y-2">
    <Label className="text-sm font-medium text-foreground">{label}</Label>
    {children}
    {description && !error && (
      <p className="text-sm text-muted-foreground">{description}</p>
    )}
    {error && <p className="text-sm text-destructive">{error}</p>}
  </div>
)

const SettingsSection: React.FC<{
  title: string
  children: React.ReactNode
}> = ({ title, children }) => (
  <div className="space-y-4">
    <div>
      <h3 className="text-lg font-medium text-foreground">{title}</h3>
      <Separator className="mt-2" />
    </div>
    <div className="space-y-4">{children}</div>
  </div>
)

// ============================================
// Server Card Component
// ============================================

interface ServerCardProps {
  server: MCPServerConfig
  onEdit: (server: MCPServerConfig) => void
  onDelete: (id: string) => void
  onToggle: (id: string) => void
}

const ServerCard = memo(function ServerCard({
  server,
  onEdit,
  onDelete,
  onToggle,
}: ServerCardProps) {
  const serverState = useMCPStore((state) => state.serverStates.get(server.id))
  const [isLoading, setIsLoading] = useState(false)

  const handleToggleConnection = useCallback(async () => {
    setIsLoading(true)
    try {
      if (isServerRunning(server.id)) {
        await stopMCPServer(server.id)
      } else {
        await startMCPServer(server)
      }
    } finally {
      setIsLoading(false)
    }
  }, [server])

  const statusBadge = useMemo(() => {
    switch (serverState?.status) {
      case 'connected':
        return (
          <Badge
            variant="default"
            className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
          >
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Connected ({serverState.tools?.length || 0} tools)
          </Badge>
        )
      case 'connecting':
        return (
          <Badge variant="secondary">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Connecting...
          </Badge>
        )
      case 'error':
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Error
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground">
            <AlertCircle className="mr-1 h-3 w-3" />
            Disconnected
          </Badge>
        )
    }
  }, [serverState?.status, serverState?.tools?.length])

  const serverDescription = useMemo(() => {
    if (isStdioConfig(server)) {
      return `${server.command} ${server.args.join(' ')}`
    } else if (isHttpConfig(server)) {
      return server.url
    }
    return ''
  }, [server])

  const transport = server.transport || 'stdio'
  const ServerIcon = transport === 'http' ? Globe : Terminal

  return (
    <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
            <ServerIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-foreground">{server.name}</h4>
              <Badge variant="outline" className="text-xs">
                {transport.toUpperCase()}
              </Badge>
            </div>
            <p className="max-w-[300px] truncate font-mono text-sm text-muted-foreground">
              {serverDescription}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={server.enabled}
            onCheckedChange={() => onToggle(server.id)}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        {statusBadge}
        <div className="flex items-center gap-1">
          {server.enabled && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleToggleConnection}
              disabled={isLoading}
              className="h-7 w-7"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isServerRunning(server.id) ? (
                <PowerOff className="h-4 w-4" />
              ) : (
                <Power className="h-4 w-4" />
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onEdit(server)}
            className="h-7 w-7"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onDelete(server.id)}
            className="h-7 w-7 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {serverState?.error && (
        <p className="mt-2 text-sm text-destructive">{serverState.error}</p>
      )}
    </div>
  )
})

// ============================================
// Server Editor Component
// ============================================

interface ServerEditorProps {
  server: MCPServerConfig | null
  onSave: (server: MCPServerConfig) => void
  onCancel: () => void
}

interface FormErrors {
  name?: string
  command?: string
  url?: string
  args?: string
  env?: string
  headers?: string
}

function ServerEditor({ server, onSave, onCancel }: ServerEditorProps) {
  const [transport, setTransport] = useState<MCPTransportType>(
    server?.transport || 'stdio'
  )
  const [name, setName] = useState(server?.name || '')
  const [errors, setErrors] = useState<FormErrors>({})

  // Stdio fields
  const [command, setCommand] = useState(
    server && isStdioConfig(server) ? server.command : ''
  )
  const [args, setArgs] = useState(
    server && isStdioConfig(server) ? server.args.join(' ') : ''
  )
  const [env, setEnv] = useState(() => {
    if (server && isStdioConfig(server) && server.env) {
      return envToString(server.env)
    }
    return ''
  })

  // HTTP fields
  const [url, setUrl] = useState(
    server && isHttpConfig(server) ? server.url : ''
  )
  const [headers, setHeaders] = useState(() => {
    if (server && isHttpConfig(server) && server.headers) {
      return envToString(server.headers)
    }
    return ''
  })

  const validateAndSave = useCallback(() => {
    const newErrors: FormErrors = {}

    // Validate based on transport type
    if (transport === 'stdio') {
      const result = stdioServerSchema.safeParse({
        transport: 'stdio',
        name,
        command,
        args,
        env,
      })

      if (!result.success) {
        for (const issue of result.error.issues) {
          const field = issue.path[0] as keyof FormErrors
          newErrors[field] = issue.message
        }
        setErrors(newErrors)
        return
      }
    } else {
      const result = httpServerSchema.safeParse({
        transport: 'http',
        name,
        url,
        headers,
      })

      if (!result.success) {
        for (const issue of result.error.issues) {
          const field = issue.path[0] as keyof FormErrors
          newErrors[field] = issue.message
        }
        setErrors(newErrors)
        return
      }
    }

    setErrors({})

    const id = server?.id || Math.random().toString(36).substring(2, 15)
    const enabled = server?.enabled ?? true

    if (transport === 'stdio') {
      const envObject = parseEnvString(env)
      const stdioConfig: MCPServerConfigStdio = {
        id,
        name,
        transport: 'stdio',
        command,
        args: parseArgsString(args),
        env: Object.keys(envObject).length > 0 ? envObject : undefined,
        enabled,
      }
      onSave(stdioConfig)
    } else {
      const headersObject = parseEnvString(headers)
      const httpConfig: MCPServerConfigHttp = {
        id,
        name,
        transport: 'http',
        url,
        headers: Object.keys(headersObject).length > 0 ? headersObject : undefined,
        enabled,
      }
      onSave(httpConfig)
    }
  }, [transport, name, command, args, env, url, headers, server, onSave])

  const isValid = useMemo(() => {
    return name.trim() && (transport === 'stdio' ? command.trim() : url.trim())
  }, [name, transport, command, url])

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{server?.id ? 'Edit' : 'Add'} MCP Server</DialogTitle>
          <DialogDescription>
            Configure the MCP server connection settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <SettingsField label="Transport Type" description="How to connect to the MCP server">
            <Select
              value={transport}
              onValueChange={(v) => {
                setTransport(v as MCPTransportType)
                setErrors({})
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stdio">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-4 w-4" />
                    <span>Stdio (Local Process)</span>
                  </div>
                </SelectItem>
                <SelectItem value="http">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    <span>HTTP/SSE (Remote)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </SettingsField>

          <SettingsField
            label="Name"
            description="A friendly name for this server"
            error={errors.name}
          >
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My MCP Server"
              className={errors.name ? 'border-destructive' : ''}
            />
          </SettingsField>

          {transport === 'stdio' ? (
            <>
              <SettingsField
                label="Command"
                description="The command to run (e.g., uvx, npx, python)"
                error={errors.command}
              >
                <Input
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  placeholder="uvx"
                  className={`font-mono ${errors.command ? 'border-destructive' : ''}`}
                />
              </SettingsField>

              <SettingsField
                label="Arguments"
                description="Command arguments separated by spaces"
                error={errors.args}
              >
                <Input
                  value={args}
                  onChange={(e) => setArgs(e.target.value)}
                  placeholder="cli-mcp-server"
                  className={`font-mono ${errors.args ? 'border-destructive' : ''}`}
                />
              </SettingsField>

              <SettingsField
                label="Environment Variables"
                description="One per line in KEY=value format"
                error={errors.env}
              >
                <Textarea
                  value={env}
                  onChange={(e) => setEnv(e.target.value)}
                  placeholder="ALLOWED_DIR=/tmp&#10;ALLOWED_COMMANDS=ls,cat,pwd"
                  className={`min-h-[80px] font-mono text-xs ${errors.env ? 'border-destructive' : ''}`}
                />
              </SettingsField>
            </>
          ) : (
            <>
              <SettingsField
                label="URL"
                description="The MCP server endpoint URL"
                error={errors.url}
              >
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://mcp.example.com/mcp"
                  className={`font-mono ${errors.url ? 'border-destructive' : ''}`}
                />
              </SettingsField>

              <SettingsField
                label="Headers"
                description="HTTP headers, one per line in KEY=value format"
                error={errors.headers}
              >
                <Textarea
                  value={headers}
                  onChange={(e) => setHeaders(e.target.value)}
                  placeholder="CONTEXT7_API_KEY=your-api-key-here"
                  className={`min-h-[80px] font-mono text-xs ${errors.headers ? 'border-destructive' : ''}`}
                />
              </SettingsField>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={validateAndSave} disabled={!isValid}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// Main MCP Pane Component
// ============================================

export const MCPPane: React.FC = () => {
  const servers = useMCPStore((state) => state.servers)
  const { addServer, updateServer, removeServer, toggleServer } = useMCPStore()
  const [editingServer, setEditingServer] = useState<MCPServerConfig | null>(null)
  const [showEditor, setShowEditor] = useState(false)

  const handleAdd = useCallback(() => {
    setEditingServer(null)
    setShowEditor(true)
  }, [])

  const handleEdit = useCallback((server: MCPServerConfig) => {
    setEditingServer(server)
    setShowEditor(true)
  }, [])

  const handleSave = useCallback(
    (serverConfig: MCPServerConfig) => {
      if (editingServer?.id) {
        updateServer(editingServer.id, serverConfig)
      } else {
        addServer(serverConfig)
      }
      setShowEditor(false)
      setEditingServer(null)
    },
    [editingServer, updateServer, addServer]
  )

  const handleCancel = useCallback(() => {
    setShowEditor(false)
    setEditingServer(null)
  }, [])

  return (
    <div className="space-y-6">
      <SettingsSection title="MCP Servers">
        <SettingsField
          label="Configured Servers"
          description="MCP (Model Context Protocol) servers provide tools that AI can use to interact with external systems."
        >
          <div className="space-y-3">
            {servers.map((server) => (
              <ServerCard
                key={server.id}
                server={server}
                onEdit={handleEdit}
                onDelete={removeServer}
                onToggle={toggleServer}
              />
            ))}

            {servers.length === 0 && (
              <div className="rounded-lg border border-dashed border-border/50 p-6 text-center">
                <Terminal className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  No MCP servers configured
                </p>
              </div>
            )}

            <Button variant="outline" onClick={handleAdd} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add MCP Server
            </Button>
          </div>
        </SettingsField>
      </SettingsSection>

      <SettingsSection title="About MCP">
        <div className="rounded-lg border border-border/50 bg-muted/30 p-4 text-sm text-muted-foreground">
          <p className="mb-2">
            <strong className="text-foreground">Model Context Protocol (MCP)</strong> is an
            open protocol that enables AI assistants to securely connect to external tools
            and data sources.
          </p>
          <p className="mb-2">
            <strong className="text-foreground">Stdio servers</strong> run locally as
            processes (like cli-mcp-server).
          </p>
          <p>
            <strong className="text-foreground">HTTP servers</strong> connect to remote
            endpoints (like Context7 for documentation lookup).
          </p>
        </div>
      </SettingsSection>

      {showEditor && (
        <ServerEditor
          server={editingServer}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}
    </div>
  )
}
