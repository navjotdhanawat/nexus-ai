import { memo, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Settings2, RotateCcw, Info } from 'lucide-react'

interface ChatSettingsProps {
  systemPrompt: string
  onSystemPromptChange: (prompt: string) => void
  temperature: number
  onTemperatureChange: (value: number) => void
  maxTokens: number
  onMaxTokensChange: (value: number) => void
  topP: number
  onTopPChange: (value: number) => void
  disabled?: boolean
}

function SliderWithInput({
  label,
  value,
  onChange,
  min,
  max,
  step,
  tooltip,
  disabled,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step: number
  tooltip: string
  disabled?: boolean
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Label className="text-sm font-medium">{label}</Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[200px]">{tooltip}</TooltipContent>
          </Tooltip>
        </div>
        <span className="text-sm font-mono text-muted-foreground">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        disabled={disabled}
        className={cn(
          'h-2 w-full cursor-pointer appearance-none rounded-full bg-muted',
          '[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4',
          '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full',
          '[&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-sm',
          '[&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110',
          'disabled:cursor-not-allowed disabled:opacity-50'
        )}
      />
    </div>
  )
}

export const ChatSettings = memo(function ChatSettings({
  systemPrompt,
  onSystemPromptChange,
  temperature,
  onTemperatureChange,
  maxTokens,
  onMaxTokensChange,
  topP,
  onTopPChange,
  disabled,
}: ChatSettingsProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleReset = () => {
    onSystemPromptChange('')
    onTemperatureChange(0.7)
    onMaxTokensChange(4096)
    onTopPChange(0.95)
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              disabled={disabled}
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Chat settings</TooltipContent>
      </Tooltip>

      <PopoverContent
        className="w-80"
        align="end"
        side="bottom"
        sideOffset={8}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-foreground">Settings</h4>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="h-7 w-7"
                  onClick={handleReset}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reset to defaults</TooltipContent>
            </Tooltip>
          </div>

          {/* System Prompt */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label className="text-sm font-medium">System Prompt</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[200px]">
                  Instructions for how the AI should behave
                </TooltipContent>
              </Tooltip>
            </div>
            <Textarea
              value={systemPrompt}
              onChange={e => onSystemPromptChange(e.target.value)}
              placeholder="You are a helpful assistant..."
              className="min-h-[80px] resize-none text-sm"
              disabled={disabled}
            />
          </div>

          {/* Temperature */}
          <SliderWithInput
            label="Temperature"
            value={temperature}
            onChange={onTemperatureChange}
            min={0}
            max={2}
            step={0.1}
            tooltip="Controls randomness. Lower = more focused, higher = more creative"
            disabled={disabled}
          />

          {/* Max Tokens */}
          <SliderWithInput
            label="Max Tokens"
            value={maxTokens}
            onChange={onMaxTokensChange}
            min={256}
            max={8192}
            step={256}
            tooltip="Maximum length of the response"
            disabled={disabled}
          />

          {/* Top P */}
          <SliderWithInput
            label="Top P"
            value={topP}
            onChange={onTopPChange}
            min={0}
            max={1}
            step={0.05}
            tooltip="Nucleus sampling threshold. Lower = more focused"
            disabled={disabled}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
})

export default ChatSettings



