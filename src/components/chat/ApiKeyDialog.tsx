import { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Eye,
  EyeOff,
  ExternalLink,
  Check,
  AlertCircle,
  Trash2,
  Image,
  Mic,
  Sparkles,
} from 'lucide-react'
import {
  useApiKeysStore,
  selectHasGoogleKey,
  selectHasGroqKey,
  selectHasOpenaiKey,
} from '@/store/api-keys-store'

interface ApiKeyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface CapabilityBadge {
  icon: React.ReactNode
  label: string
  color: string
}

interface ApiKeyInputProps {
  label: string
  description: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  docsUrl: string
  providerName: string
  providerColor: string
  isConfigured: boolean
  capabilities?: CapabilityBadge[]
}

function ApiKeyInput({
  label,
  description,
  value,
  onChange,
  placeholder,
  docsUrl,
  providerName,
  providerColor,
  isConfigured,
  capabilities,
}: ApiKeyInputProps) {
  const [showKey, setShowKey] = useState(false)
  const [localValue, setLocalValue] = useState(value)

  const handleSave = useCallback(() => {
    onChange(localValue.trim())
  }, [localValue, onChange])

  const handleClear = useCallback(() => {
    setLocalValue('')
    onChange('')
  }, [onChange])

  const hasChanges = localValue.trim() !== value

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">{label}</Label>
          <Badge variant="outline" className={providerColor}>
            {providerName}
          </Badge>
          {isConfigured && (
            <Badge
              variant="outline"
              className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            >
              <Check className="mr-1 h-3 w-3" />
              Configured
            </Badge>
          )}
        </div>
        <a
          href={docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          Get API Key
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <p className="text-xs text-muted-foreground">{description}</p>

      {/* Capability badges */}
      {capabilities && capabilities.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {capabilities.map(cap => (
            <Badge
              key={cap.label}
              variant="outline"
              className={`text-[10px] ${cap.color}`}
            >
              {cap.icon}
              <span className="ml-1">{cap.label}</span>
            </Badge>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type={showKey ? 'text' : 'password'}
            value={localValue}
            onChange={e => setLocalValue(e.target.value)}
            placeholder={placeholder}
            className="pr-10 font-mono text-sm"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
            onClick={() => setShowKey(!showKey)}
          >
            {showKey ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>

        {hasChanges && (
          <Button size="sm" onClick={handleSave}>
            Save
          </Button>
        )}

        {isConfigured && !hasChanges && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={handleClear}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Remove API key</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  )
}

export function ApiKeyDialog({ open, onOpenChange }: ApiKeyDialogProps) {
  const googleApiKey = useApiKeysStore(state => state.googleApiKey)
  const groqApiKey = useApiKeysStore(state => state.groqApiKey)
  const openaiApiKey = useApiKeysStore(state => state.openaiApiKey)
  const hasGoogleKey = useApiKeysStore(selectHasGoogleKey)
  const hasGroqKey = useApiKeysStore(selectHasGroqKey)
  const hasOpenaiKey = useApiKeysStore(selectHasOpenaiKey)

  const handleGoogleKeyChange = useCallback((key: string) => {
    useApiKeysStore.getState().setGoogleApiKey(key)
  }, [])

  const handleGroqKeyChange = useCallback((key: string) => {
    useApiKeysStore.getState().setGroqApiKey(key)
  }, [])

  const handleOpenaiKeyChange = useCallback((key: string) => {
    useApiKeysStore.getState().setOpenaiApiKey(key)
  }, [])

  const configuredCount =
    (hasGoogleKey ? 1 : 0) + (hasGroqKey ? 1 : 0) + (hasOpenaiKey ? 1 : 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            API Configuration
            {configuredCount > 0 && (
              <Badge variant="secondary">{configuredCount}/3 configured</Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Configure your API keys to use AI models. Keys are stored securely
            in your browser&apos;s local storage.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Warning if no keys */}
          {configuredCount === 0 && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="text-sm">
                <p className="font-medium text-amber-600 dark:text-amber-400">
                  No API keys configured
                </p>
                <p className="mt-1 text-muted-foreground">
                  Add at least one API key to start using AI models.
                </p>
              </div>
            </div>
          )}

          {/* Google API Key */}
          <ApiKeyInput
            label="Google AI"
            description="Access Gemini 2.0 Flash, Gemini 1.5 Flash, and Gemini 1.5 Pro models"
            value={googleApiKey}
            onChange={handleGoogleKeyChange}
            placeholder="AIza..."
            docsUrl="https://aistudio.google.com/apikey"
            providerName="Google"
            providerColor="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
            isConfigured={hasGoogleKey}
            capabilities={[
              {
                icon: <Image className="h-3 w-3" />,
                label: 'Vision',
                color:
                  'border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400',
              },
              {
                icon: <Mic className="h-3 w-3" />,
                label: 'Audio',
                color:
                  'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
              },
              {
                icon: <Sparkles className="h-3 w-3" />,
                label: 'Tools',
                color:
                  'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
              },
            ]}
          />

          <Separator />

          {/* OpenAI API Key */}
          <ApiKeyInput
            label="OpenAI"
            description="Access GPT-4o, GPT-4o Mini, and GPT-4 Turbo models with vision support"
            value={openaiApiKey}
            onChange={handleOpenaiKeyChange}
            placeholder="sk-..."
            docsUrl="https://platform.openai.com/api-keys"
            providerName="OpenAI"
            providerColor="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
            isConfigured={hasOpenaiKey}
            capabilities={[
              {
                icon: <Image className="h-3 w-3" />,
                label: 'Vision',
                color:
                  'border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400',
              },
              {
                icon: <Sparkles className="h-3 w-3" />,
                label: 'Tools',
                color:
                  'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
              },
            ]}
          />

          <Separator />

          {/* Groq API Key */}
          <ApiKeyInput
            label="Groq"
            description="Access Llama 3.3, Llama 3.2 Vision, Mixtral, and more with blazing fast inference"
            value={groqApiKey}
            onChange={handleGroqKeyChange}
            placeholder="gsk_..."
            docsUrl="https://console.groq.com/keys"
            providerName="Groq"
            providerColor="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20"
            isConfigured={hasGroqKey}
            capabilities={[
              {
                icon: <Image className="h-3 w-3" />,
                label: 'Vision (Llama 3.2)',
                color:
                  'border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400',
              },
              {
                icon: <Sparkles className="h-3 w-3" />,
                label: 'Tools',
                color:
                  'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
              },
            ]}
          />
        </div>

        <DialogFooter>
          <p className="mr-auto text-xs text-muted-foreground">
            🔒 Keys are stored locally and never sent to our servers
          </p>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ApiKeyDialog
