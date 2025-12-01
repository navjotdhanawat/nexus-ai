import { useRef, useEffect, memo } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChatMessage } from './ChatMessage'
import { Bot, Sparkles } from 'lucide-react'
import type { ChatMessage as ChatMessageType } from '@/store/chat-store'

interface MessageListProps {
  messages: ChatMessageType[]
  isGenerating: boolean
  onRegenerate?: () => void
}

/**
 * Empty state shown when no messages exist
 */
function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 py-12">
      <div className="relative mb-6">
        <div className="absolute -inset-4 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-600/20 blur-xl" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
          <Bot className="h-8 w-8 text-white" />
        </div>
      </div>
      <h2 className="mb-2 text-xl font-semibold text-foreground">
        AI Chat Playground
      </h2>
      <p className="mb-8 max-w-md text-center text-sm text-muted-foreground">
        Start a conversation with various AI models. Switch between Google Gemini and Groq models for different capabilities.
      </p>
      <div className="grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
        {[
          { icon: '💡', title: 'Ask anything', desc: 'Get answers to your questions' },
          { icon: '📝', title: 'Write content', desc: 'Generate text, emails, stories' },
          { icon: '🔍', title: 'Analyze code', desc: 'Debug and explain code' },
          { icon: '🎨', title: 'Be creative', desc: 'Brainstorm ideas and concepts' },
        ].map(item => (
          <div
            key={item.title}
            className="flex items-start gap-3 rounded-xl border border-border/50 bg-card/50 p-4 transition-colors hover:bg-card"
          >
            <span className="text-xl">{item.icon}</span>
            <div>
              <p className="font-medium text-foreground">{item.title}</p>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Thinking indicator shown while waiting for response
 */
function ThinkingIndicator() {
  return (
    <div className="flex gap-4 bg-muted/30 px-4 py-6">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white">
        <Bot className="h-4 w-4" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">Assistant</span>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3 animate-pulse text-violet-500" />
            Thinking...
          </span>
        </div>
        <div className="flex gap-1">
          <span className="h-2 w-2 animate-bounce rounded-full bg-violet-500/60 [animation-delay:-0.3s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-violet-500/60 [animation-delay:-0.15s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-violet-500/60" />
        </div>
      </div>
    </div>
  )
}

export const MessageList = memo(function MessageList({
  messages,
  isGenerating,
  onRegenerate,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isGenerating])

  if (messages.length === 0 && !isGenerating) {
    return <EmptyState />
  }

  // Check if last message is streaming
  const lastMessage = messages[messages.length - 1]
  const isLastStreaming = lastMessage?.isStreaming

  return (
    <ScrollArea className="h-full w-full" ref={scrollRef}>
      <div className="flex flex-col w-full max-w-full overflow-hidden">
        {messages.map((message, index) => (
          <ChatMessage
            key={message.id}
            message={message}
            isLast={index === messages.length - 1}
            onRegenerate={onRegenerate}
          />
        ))}
        {isGenerating && !isLastStreaming && <ThinkingIndicator />}
        <div ref={bottomRef} className="h-4" />
      </div>
    </ScrollArea>
  )
})

export default MessageList


