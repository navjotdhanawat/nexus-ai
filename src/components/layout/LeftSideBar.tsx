import { memo, useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Plus, MessageSquare, Trash2, MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useChatStore, type Conversation } from '@/store/chat-store'

interface ConversationItemProps {
  conversation: Conversation
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
}

const ConversationItem = memo(function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onDelete,
}: ConversationItemProps) {
  const messageCount = conversation.messages.length

  return (
    <div
      className={cn(
        'group relative flex items-center gap-2 rounded-lg px-3 py-2 transition-colors',
        'cursor-pointer hover:bg-accent/50',
        isActive && 'bg-accent text-accent-foreground'
      )}
      onClick={onSelect}
    >
      <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{conversation.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {messageCount} message{messageCount !== 1 ? 's' : ''}
        </p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className={cn(
              'h-6 w-6 shrink-0 opacity-0 transition-opacity',
              'group-hover:opacity-100',
              isActive && 'opacity-100'
            )}
            onClick={e => e.stopPropagation()}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={e => {
              e.stopPropagation()
              onDelete()
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
})

interface LeftSideBarProps {
  children?: React.ReactNode
  className?: string
}

export function LeftSideBar({ children, className }: LeftSideBarProps) {
  const conversations = useChatStore(useShallow(state => state.conversations))
  const activeConversationId = useChatStore(state => state.activeConversationId)

  const handleNewChat = useCallback(() => {
    useChatStore.getState().createConversation()
  }, [])

  const handleSelectConversation = useCallback((id: string) => {
    useChatStore.getState().setActiveConversation(id)
  }, [])

  const handleDeleteConversation = useCallback((id: string) => {
    useChatStore.getState().deleteConversation(id)
  }, [])

  // Sort conversations by updatedAt (most recent first)
  const sortedConversations = [...conversations].sort(
    (a, b) => b.updatedAt - a.updatedAt
  )

  // Group conversations by date
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const lastWeek = new Date(today)
  lastWeek.setDate(lastWeek.getDate() - 7)

  const groupedConversations = {
    today: sortedConversations.filter(c => c.updatedAt >= today.getTime()),
    yesterday: sortedConversations.filter(
      c => c.updatedAt >= yesterday.getTime() && c.updatedAt < today.getTime()
    ),
    lastWeek: sortedConversations.filter(
      c => c.updatedAt >= lastWeek.getTime() && c.updatedAt < yesterday.getTime()
    ),
    older: sortedConversations.filter(c => c.updatedAt < lastWeek.getTime()),
  }

  return (
    <div
      className={cn('flex h-full flex-col border-r bg-background', className)}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Chats</h2>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-7 w-7"
              onClick={handleNewChat}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>New chat</TooltipContent>
        </Tooltip>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        <div className="space-y-4 p-3">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageSquare className="mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No conversations yet</p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Start a new chat to begin
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={handleNewChat}
              >
                <Plus className="mr-2 h-4 w-4" />
                New Chat
              </Button>
            </div>
          ) : (
            <>
              {/* Today */}
              {groupedConversations.today.length > 0 && (
                <div>
                  <p className="mb-2 px-3 text-xs font-medium text-muted-foreground">
                    Today
                  </p>
                  <div className="space-y-1">
                    {groupedConversations.today.map(conv => (
                      <ConversationItem
                        key={conv.id}
                        conversation={conv}
                        isActive={conv.id === activeConversationId}
                        onSelect={() => handleSelectConversation(conv.id)}
                        onDelete={() => handleDeleteConversation(conv.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Yesterday */}
              {groupedConversations.yesterday.length > 0 && (
                <div>
                  <p className="mb-2 px-3 text-xs font-medium text-muted-foreground">
                    Yesterday
                  </p>
                  <div className="space-y-1">
                    {groupedConversations.yesterday.map(conv => (
                      <ConversationItem
                        key={conv.id}
                        conversation={conv}
                        isActive={conv.id === activeConversationId}
                        onSelect={() => handleSelectConversation(conv.id)}
                        onDelete={() => handleDeleteConversation(conv.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Last 7 Days */}
              {groupedConversations.lastWeek.length > 0 && (
                <div>
                  <p className="mb-2 px-3 text-xs font-medium text-muted-foreground">
                    Last 7 Days
                  </p>
                  <div className="space-y-1">
                    {groupedConversations.lastWeek.map(conv => (
                      <ConversationItem
                        key={conv.id}
                        conversation={conv}
                        isActive={conv.id === activeConversationId}
                        onSelect={() => handleSelectConversation(conv.id)}
                        onDelete={() => handleDeleteConversation(conv.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Older */}
              {groupedConversations.older.length > 0 && (
                <div>
                  <p className="mb-2 px-3 text-xs font-medium text-muted-foreground">
                    Older
                  </p>
                  <div className="space-y-1">
                    {groupedConversations.older.map(conv => (
                      <ConversationItem
                        key={conv.id}
                        conversation={conv}
                        isActive={conv.id === activeConversationId}
                        onSelect={() => handleSelectConversation(conv.id)}
                        onDelete={() => handleDeleteConversation(conv.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Custom children if any */}
      {children}
    </div>
  )
}

export default LeftSideBar
