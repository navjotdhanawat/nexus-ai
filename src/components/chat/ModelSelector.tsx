import { memo, useCallback } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AVAILABLE_MODELS, type ModelConfig } from '@/store/chat-store'
import { useUIStore } from '@/store/ui-store'
import { getModelById } from '@/types/multimodal'
import {
  useApiKeysStore,
  selectHasGoogleKey,
  selectHasGroqKey,
  selectHasOpenaiKey,
} from '@/store/api-keys-store'
import { AlertCircle, Image, Mic, Sparkles, ImagePlus } from 'lucide-react'

interface ModelSelectorProps {
  selectedModelId: string
  onModelChange: (modelId: string) => void
  disabled?: boolean
}

const providerLabels: Record<string, string> = {
  google: 'Google',
  groq: 'Groq',
  openai: 'OpenAI',
}

const providerColors: Record<string, string> = {
  google: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  groq: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  openai: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
}

function ModelOption({ model }: { model: ModelConfig }) {
  const multimodalModel = getModelById(model.id)
  const hasVision = multimodalModel?.capabilities.vision ?? false
  const hasAudio = multimodalModel?.capabilities.audioTranscription ?? false
  const hasTools = multimodalModel?.capabilities.functionCalling ?? false
  const hasImageGen = multimodalModel?.capabilities.imageGeneration ?? false

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-3">
        <span className="truncate">{model.name}</span>
        <Badge
          variant="outline"
          className={`shrink-0 text-[10px] ${providerColors[model.provider]}`}
        >
          {providerLabels[model.provider]}
        </Badge>
      </div>
      {/* Capability indicators */}
      <div className="flex items-center gap-1">
        {hasImageGen && (
          <span className="flex h-4 items-center gap-0.5 rounded bg-pink-500/10 px-1 text-[9px] text-pink-500">
            <ImagePlus className="h-2.5 w-2.5" />
            <span>Gen</span>
          </span>
        )}
        {hasVision && (
          <span className="flex h-4 items-center gap-0.5 rounded bg-violet-500/10 px-1 text-[9px] text-violet-500">
            <Image className="h-2.5 w-2.5" />
          </span>
        )}
        {hasAudio && (
          <span className="flex h-4 items-center gap-0.5 rounded bg-emerald-500/10 px-1 text-[9px] text-emerald-500">
            <Mic className="h-2.5 w-2.5" />
          </span>
        )}
        {hasTools && (
          <span className="flex h-4 items-center gap-0.5 rounded bg-amber-500/10 px-1 text-[9px] text-amber-500">
            <Sparkles className="h-2.5 w-2.5" />
          </span>
        )}
      </div>
    </div>
  )
}

export const ModelSelector = memo(function ModelSelector({
  selectedModelId,
  onModelChange,
  disabled,
}: ModelSelectorProps) {
  const hasGoogleKey = useApiKeysStore(selectHasGoogleKey)
  const hasGroqKey = useApiKeysStore(selectHasGroqKey)
  const hasOpenaiKey = useApiKeysStore(selectHasOpenaiKey)

  const handleOpenSettings = useCallback(() => {
    useUIStore.getState().setPreferencesOpen(true)
  }, [])

  // Group models by provider
  const googleModels = AVAILABLE_MODELS.filter(m => m.provider === 'google')
  const openaiModels = AVAILABLE_MODELS.filter(m => m.provider === 'openai')
  const groqModels = AVAILABLE_MODELS.filter(m => m.provider === 'groq')

  const selectedModel = AVAILABLE_MODELS.find(m => m.id === selectedModelId)

  const hasAnyKey = hasGoogleKey || hasGroqKey || hasOpenaiKey

  // Show configuration prompt if no keys
  if (!hasAnyKey) {
    return (
      <Button
        variant="outline"
        className="gap-2 border-amber-500/50 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400"
        onClick={handleOpenSettings}
      >
        <AlertCircle className="h-4 w-4" />
        Configure API Keys
      </Button>
    )
  }

  return (
    <Select
      value={selectedModelId}
      onValueChange={onModelChange}
      disabled={disabled}
    >
      <SelectTrigger className="w-[220px]">
        <SelectValue>
          {selectedModel ? (
            <div className="flex items-center gap-2">
              <span className="truncate">{selectedModel.name}</span>
            </div>
          ) : (
            'Select model'
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-[400px]">
        {hasGoogleKey && googleModels.length > 0 && (
          <SelectGroup>
            <SelectLabel className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Google Gemini
            </SelectLabel>
            {googleModels.map(model => (
              <SelectItem key={model.id} value={model.id} className="py-2">
                <ModelOption model={model} />
              </SelectItem>
            ))}
          </SelectGroup>
        )}

        {hasOpenaiKey && openaiModels.length > 0 && (
          <SelectGroup>
            <SelectLabel className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              OpenAI
            </SelectLabel>
            {openaiModels.map(model => (
              <SelectItem key={model.id} value={model.id} className="py-2">
                <ModelOption model={model} />
              </SelectItem>
            ))}
          </SelectGroup>
        )}

        {hasGroqKey && groqModels.length > 0 && (
          <SelectGroup>
            <SelectLabel className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-orange-500" />
              Groq
            </SelectLabel>
            {groqModels.map(model => (
              <SelectItem key={model.id} value={model.id} className="py-2">
                <ModelOption model={model} />
              </SelectItem>
            ))}
          </SelectGroup>
        )}

        {/* Show unconfigured providers */}
        {!hasGoogleKey && (
          <SelectGroup>
            <SelectLabel className="text-muted-foreground/60">
              Google Gemini (not configured)
            </SelectLabel>
          </SelectGroup>
        )}

        {!hasOpenaiKey && (
          <SelectGroup>
            <SelectLabel className="text-muted-foreground/60">
              OpenAI (not configured)
            </SelectLabel>
          </SelectGroup>
        )}

        {!hasGroqKey && (
          <SelectGroup>
            <SelectLabel className="text-muted-foreground/60">
              Groq (not configured)
            </SelectLabel>
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  )
})

export default ModelSelector
