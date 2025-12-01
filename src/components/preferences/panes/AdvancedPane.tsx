/**
 * Advanced Settings Pane
 * Data management and about information
 */

import React, { useCallback, useState } from 'react'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Trash2, Database, Github, Heart, RefreshCw } from 'lucide-react'
import { useChatStore } from '@/store/chat-store'
import { useApiKeysStore } from '@/store/api-keys-store'
import { useMCPStore } from '@/store/mcp-store'
import { toast } from 'sonner'

// ============================================
// Reusable Components
// ============================================

const SettingsSection: React.FC<{
  title: string
  description?: string
  children: React.ReactNode
}> = ({ title, description, children }) => (
  <div className="space-y-4">
    <div>
      <h3 className="text-lg font-medium text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
      <Separator className="mt-3" />
    </div>
    <div className="space-y-4">{children}</div>
  </div>
)

const SettingsField: React.FC<{
  label: string
  children: React.ReactNode
  description?: string
}> = ({ label, children, description }) => (
  <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 p-4">
    <div className="space-y-1">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
    {children}
  </div>
)

// ============================================
// Main Component
// ============================================

export const AdvancedPane: React.FC = () => {
  const [showClearChatsDialog, setShowClearChatsDialog] = useState(false)
  const [showResetAllDialog, setShowResetAllDialog] = useState(false)

  const conversations = useChatStore(state => state.conversations)
  const conversationCount = conversations.length
  const messageCount = conversations.reduce(
    (acc, conv) => acc + conv.messages.length,
    0
  )

  const handleClearAllChats = useCallback(() => {
    // Clear all conversations from chat store
    const { conversations } = useChatStore.getState()
    conversations.forEach(conv => {
      useChatStore.getState().deleteConversation(conv.id)
    })
    setShowClearChatsDialog(false)
    toast.success('All conversations cleared')
  }, [])

  const handleResetAll = useCallback(() => {
    // Clear everything
    localStorage.clear()
    setShowResetAllDialog(false)
    toast.success('All data cleared. Reloading...')
    setTimeout(() => window.location.reload(), 1000)
  }, [])

  const handleExportData = useCallback(() => {
    const data = {
      conversations: useChatStore.getState().conversations,
      apiKeys: {
        hasGoogle: !!useApiKeysStore.getState().googleApiKey,
        hasOpenai: !!useApiKeysStore.getState().openaiApiKey,
        hasGroq: !!useApiKeysStore.getState().groqApiKey,
      },
      mcpServers: useMCPStore.getState().servers,
      exportedAt: new Date().toISOString(),
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ai-playground-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Data exported successfully')
  }, [])

  return (
    <div className="space-y-6">
      {/* Data Management */}
      <SettingsSection
        title="Data Management"
        description="Manage your chat history and application data."
      >
        {/* Storage stats */}
        <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">Local Storage</p>
              <p className="text-xs text-muted-foreground">
                {conversationCount} conversations • {messageCount} messages
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportData}>
              Export Data
            </Button>
          </div>
        </div>

        {/* Clear chats */}
        <SettingsField
          label="Clear All Conversations"
          description="Delete all chat history permanently"
        >
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setShowClearChatsDialog(true)}
            disabled={conversationCount === 0}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear Chats
          </Button>
        </SettingsField>

        {/* Reset all */}
        <SettingsField
          label="Reset All Settings"
          description="Clear all data including API keys, MCP servers, and preferences"
        >
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setShowResetAllDialog(true)}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Reset All
          </Button>
        </SettingsField>
      </SettingsSection>

      {/* About */}
      <SettingsSection title="About">
        <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white font-bold text-lg">
              AI
            </div>
            <div>
              <h4 className="font-semibold">AI Playground</h4>
              <p className="text-sm text-muted-foreground">
                Version 0.1.0-beta.1
              </p>
            </div>
            <Badge variant="secondary" className="ml-auto">
              Beta
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground">
            A native desktop AI chat application with multi-provider support and
            MCP tool integration.
          </p>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <a
                href="https://github.com/navjotdhanawat/ai-playground"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="mr-2 h-4 w-4" />
                GitHub
              </a>
            </Button>
          </div>

          <Separator />

          <p className="text-xs text-muted-foreground flex items-center gap-1">
            Made with <Heart className="h-3 w-3 text-red-500" /> by Navjot
            Dhanawat
          </p>
        </div>
      </SettingsSection>

      {/* Clear Chats Dialog */}
      <AlertDialog
        open={showClearChatsDialog}
        onOpenChange={setShowClearChatsDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all conversations?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all {conversationCount} conversations
              and {messageCount} messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAllChats}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset All Dialog */}
      <AlertDialog open={showResetAllDialog} onOpenChange={setShowResetAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset all settings?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all your data including conversations, API keys,
              MCP server configurations, and preferences. The app will reload
              after reset.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reset Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
