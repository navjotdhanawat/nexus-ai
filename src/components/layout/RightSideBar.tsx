import { useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Bot, Zap, Settings2, Info } from 'lucide-react'
import {
  useChatStore,
  selectSelectedModel,
  selectActiveConversation,
} from '@/store/chat-store'

interface RightSideBarProps {
  children?: React.ReactNode
  className?: string
}

const providerColors: Record<string, string> = {
  google: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  groq: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  openai: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
}

export function RightSideBar({ children, className }: RightSideBarProps) {
  const selectedModel = useChatStore(selectSelectedModel)
  const conversation = useChatStore(selectActiveConversation)
  const systemPrompt = useChatStore(state => state.systemPrompt)
  const settings = useChatStore(useShallow(state => state.settings))
  const isGenerating = useChatStore(state => state.isGenerating)

  const handleSystemPromptChange = useCallback((value: string) => {
    useChatStore.getState().setSystemPrompt(value)
  }, [])

  const handleTemperatureChange = useCallback((value: number) => {
    useChatStore.getState().setSettings({ temperature: value })
  }, [])

  const handleMaxTokensChange = useCallback((value: number) => {
    useChatStore.getState().setSettings({ maxTokens: value })
  }, [])

  return (
    <div
      className={cn('flex h-full flex-col border-l bg-background', className)}
    >
      <ScrollArea className="flex-1">
        <div className="space-y-6 p-4">
          {/* Model Info */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Bot className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Model</h3>
            </div>
            {selectedModel ? (
              <div className="rounded-lg border bg-card/50 p-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{selectedModel.name}</span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${providerColors[selectedModel.provider]}`}
                  >
                    {selectedModel.provider === 'google'
                    ? 'Google'
                    : selectedModel.provider === 'openai'
                      ? 'OpenAI'
                      : 'Groq'}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Max {selectedModel.maxTokens.toLocaleString()} tokens
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No model selected</p>
            )}
          </div>

          <Separator />

          {/* System Prompt */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">System Prompt</h3>
            </div>
            <Textarea
              value={systemPrompt}
              onChange={e => handleSystemPromptChange(e.target.value)}
              placeholder="You are a helpful assistant..."
              className="min-h-[100px] resize-none text-sm"
              disabled={isGenerating}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Set instructions for how the AI should behave
            </p>
          </div>

          <Separator />

          {/* Parameters */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Parameters</h3>
            </div>
            <div className="space-y-4">
              {/* Temperature */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Temperature</Label>
                  <span className="font-mono text-xs text-muted-foreground">
                    {settings.temperature}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.1}
                  value={settings.temperature}
                  onChange={e => handleTemperatureChange(parseFloat(e.target.value))}
                  disabled={isGenerating}
                  className={cn(
                    'h-2 w-full cursor-pointer appearance-none rounded-full bg-muted',
                    '[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4',
                    '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full',
                    '[&::-webkit-slider-thumb]:bg-primary',
                    'disabled:cursor-not-allowed disabled:opacity-50'
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  Higher = more creative, lower = more focused
                </p>
              </div>

              {/* Max Tokens */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Max Tokens</Label>
                  <span className="font-mono text-xs text-muted-foreground">
                    {settings.maxTokens}
                  </span>
                </div>
                <input
                  type="range"
                  min={256}
                  max={8192}
                  step={256}
                  value={settings.maxTokens}
                  onChange={e => handleMaxTokensChange(parseInt(e.target.value))}
                  disabled={isGenerating}
                  className={cn(
                    'h-2 w-full cursor-pointer appearance-none rounded-full bg-muted',
                    '[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4',
                    '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full',
                    '[&::-webkit-slider-thumb]:bg-primary',
                    'disabled:cursor-not-allowed disabled:opacity-50'
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum response length
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Conversation Stats */}
          {conversation && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Conversation</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border bg-card/50 p-3">
                  <p className="text-2xl font-bold">{conversation.messages.length}</p>
                  <p className="text-xs text-muted-foreground">Messages</p>
                </div>
                <div className="rounded-lg border bg-card/50 p-3">
                  <p className="text-2xl font-bold">
                    {Math.round(
                      conversation.messages
                        .map(m => m.content.length)
                        .reduce((a, b) => a + b, 0) / 4
                    ).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">~Tokens</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {children}
    </div>
  )
}

export default RightSideBar
