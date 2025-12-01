import { cn } from '@/lib/utils'
import { ChatPlayground } from '@/components/chat'

interface MainWindowContentProps {
  children?: React.ReactNode
  className?: string
}

export function MainWindowContent({
  children,
  className,
}: MainWindowContentProps) {
  return (
    <div className={cn('flex h-full flex-col bg-background', className)}>
      {children || <ChatPlayground />}
    </div>
  )
}

export default MainWindowContent
