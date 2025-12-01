/**
 * General Settings Pane
 * API Keys and provider configuration
 */

import React, { useState, useCallback } from 'react'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
} from 'lucide-react'
import {
  useApiKeysStore,
  selectHasGoogleKey,
  selectHasGroqKey,
  selectHasOpenaiKey,
} from '@/store/api-keys-store'

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

interface ApiKeyInputProps {
  label: string
  description: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  docsUrl: string
  providerColor: string
  isConfigured: boolean
}

function ApiKeyInput({
  label,
  description,
  value,
  onChange,
  placeholder,
  docsUrl,
  providerColor,
  isConfigured,
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
    <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">{label}</Label>
          {isConfigured && (
            <Badge
              variant="outline"
              className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            >
              <Check className="mr-1 h-3 w-3" />
              Active
            </Badge>
          )}
        </div>
        <a
          href={docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Get API Key
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <p className="text-xs text-muted-foreground">{description}</p>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type={showKey ? 'text' : 'password'}
            value={localValue}
            onChange={e => setLocalValue(e.target.value)}
            placeholder={placeholder}
            className={`pr-10 font-mono text-sm ${providerColor}`}
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

// ============================================
// Main Component
// ============================================

export const GeneralPane: React.FC = () => {
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
    <div className="space-y-6">
      <SettingsSection
        title="API Keys"
        description="Configure your API keys to use AI models from different providers."
      >
        {/* Warning if no keys */}
        {configuredCount === 0 && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="text-sm">
              <p className="font-medium text-amber-600 dark:text-amber-400">
                No API keys configured
              </p>
              <p className="mt-1 text-muted-foreground">
                Add at least one API key to start chatting with AI models.
              </p>
            </div>
          </div>
        )}

        {/* Status summary */}
        {configuredCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="h-4 w-4 text-emerald-500" />
            <span>{configuredCount} of 3 providers configured</span>
          </div>
        )}

        {/* Google AI */}
        <ApiKeyInput
          label="Google AI (Gemini)"
          description="Access Gemini 3, 2.5, 2.0, and 1.5 models with vision, audio, and image generation capabilities."
          value={googleApiKey}
          onChange={handleGoogleKeyChange}
          placeholder="AIza..."
          docsUrl="https://aistudio.google.com/apikey"
          providerColor="focus-visible:ring-blue-500"
          isConfigured={hasGoogleKey}
        />

        {/* OpenAI */}
        <ApiKeyInput
          label="OpenAI"
          description="Access GPT-4o, GPT-4 Turbo, and DALL-E 3 for text, vision, and image generation."
          value={openaiApiKey}
          onChange={handleOpenaiKeyChange}
          placeholder="sk-..."
          docsUrl="https://platform.openai.com/api-keys"
          providerColor="focus-visible:ring-emerald-500"
          isConfigured={hasOpenaiKey}
        />

        {/* Groq */}
        <ApiKeyInput
          label="Groq"
          description="Access Llama 3.3, Llama 3.2 Vision, and Mixtral with ultra-fast inference."
          value={groqApiKey}
          onChange={handleGroqKeyChange}
          placeholder="gsk_..."
          docsUrl="https://console.groq.com/keys"
          providerColor="focus-visible:ring-orange-500"
          isConfigured={hasGroqKey}
        />

        {/* Security note */}
        <p className="text-xs text-muted-foreground">
          🔒 API keys are stored locally on your device and are never sent to our servers.
        </p>
      </SettingsSection>
    </div>
  )
}
