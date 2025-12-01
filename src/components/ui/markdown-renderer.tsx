/**
 * MarkdownRenderer Component
 * Renders markdown content with syntax highlighting for code blocks
 */

import { memo, useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import rehypeHighlight from 'rehype-highlight'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Check, Copy } from 'lucide-react'

// Import highlight.js theme - using a dark theme that works well
import 'highlight.js/styles/github-dark.css'

interface MarkdownRendererProps {
  content: string
  className?: string
}

/**
 * Code block component with copy functionality and syntax highlighting
 */
function CodeBlock({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) {
  const [copied, setCopied] = useState(false)

  // Extract language from className (format: language-xxx)
  const match = /language-(\w+)/.exec(className || '')
  const language = match ? match[1] : 'text'

  // Get the code content as string
  const codeContent =
    typeof children === 'string'
      ? children
      : Array.isArray(children)
        ? children.join('')
        : String(children || '')

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(codeContent.trim())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [codeContent])

  return (
    <div className="group relative my-4 overflow-hidden rounded-lg border border-border/50 bg-[#0d1117]">
      {/* Header with language label and copy button */}
      <div className="flex items-center justify-between border-b border-border/30 bg-[#161b22] px-4 py-2">
        <span className="text-xs font-medium text-zinc-400">{language}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-6 w-6 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{copied ? 'Copied!' : 'Copy code'}</TooltipContent>
        </Tooltip>
      </div>
      {/* Code content */}
      <div className="overflow-x-auto">
        <pre className="p-4">
          <code className={cn('text-sm leading-relaxed', className)} {...props}>
            {children}
          </code>
        </pre>
      </div>
    </div>
  )
}

/**
 * Inline code component
 */
function InlineCode({
  children,
  ...props
}: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) {
  return (
    <code
      className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground"
      {...props}
    >
      {children}
    </code>
  )
}

/**
 * Main markdown renderer component
 */
export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
  className,
}: MarkdownRendererProps) {
  return (
    <div className={cn('markdown-content', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeHighlight]}
        components={{
        // Code blocks and inline code
        code({ className, children, ...props }) {
          // Check if this is a code block (has language class) or inline code
          const isCodeBlock = /language-(\w+)/.test(className || '')

          if (isCodeBlock) {
            return (
              <CodeBlock className={className} {...props}>
                {children}
              </CodeBlock>
            )
          }

          return <InlineCode {...props}>{children}</InlineCode>
        },

        // Pre element - just pass through, CodeBlock handles the styling
        pre({ children }) {
          return <>{children}</>
        },

        // Paragraphs
        p({ children }) {
          return <p className="mb-4 leading-7 last:mb-0">{children}</p>
        },

        // Headers
        h1({ children }) {
          return (
            <h1 className="mb-4 mt-6 text-2xl font-bold tracking-tight first:mt-0">
              {children}
            </h1>
          )
        },
        h2({ children }) {
          return (
            <h2 className="mb-3 mt-6 text-xl font-semibold tracking-tight first:mt-0">
              {children}
            </h2>
          )
        },
        h3({ children }) {
          return (
            <h3 className="mb-3 mt-4 text-lg font-semibold first:mt-0">
              {children}
            </h3>
          )
        },
        h4({ children }) {
          return (
            <h4 className="mb-2 mt-4 text-base font-semibold first:mt-0">
              {children}
            </h4>
          )
        },
        h5({ children }) {
          return (
            <h5 className="mb-2 mt-3 text-sm font-semibold first:mt-0">
              {children}
            </h5>
          )
        },
        h6({ children }) {
          return (
            <h6 className="mb-2 mt-3 text-sm font-medium text-muted-foreground first:mt-0">
              {children}
            </h6>
          )
        },

        // Lists
        ul({ children }) {
          return <ul className="mb-4 ml-6 list-disc space-y-2">{children}</ul>
        },
        ol({ children }) {
          return (
            <ol className="mb-4 ml-6 list-decimal space-y-2">{children}</ol>
          )
        },
        li({ children }) {
          return <li className="leading-7">{children}</li>
        },

        // Blockquotes
        blockquote({ children }) {
          return (
            <blockquote className="mb-4 border-l-4 border-border pl-4 italic text-muted-foreground">
              {children}
            </blockquote>
          )
        },

        // Horizontal rule
        hr() {
          return <hr className="my-6 border-border" />
        },

        // Links
        a({ href, children }) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
            >
              {children}
            </a>
          )
        },

        // Tables
        table({ children }) {
          return (
            <div className="my-4 overflow-x-auto rounded-lg border border-border">
              <table className="min-w-full divide-y divide-border">
                {children}
              </table>
            </div>
          )
        },
        thead({ children }) {
          return <thead className="bg-muted/50">{children}</thead>
        },
        tbody({ children }) {
          return <tbody className="divide-y divide-border">{children}</tbody>
        },
        tr({ children }) {
          return <tr>{children}</tr>
        },
        th({ children }) {
          return (
            <th className="px-4 py-3 text-left text-sm font-semibold">
              {children}
            </th>
          )
        },
        td({ children }) {
          return <td className="px-4 py-3 text-sm">{children}</td>
        },

        // Strong and emphasis
        strong({ children }) {
          return <strong className="font-semibold">{children}</strong>
        },
        em({ children }) {
          return <em className="italic">{children}</em>
        },

        // Strikethrough (GFM)
        del({ children }) {
          return <del className="line-through">{children}</del>
        },

        // Images
        img({ src, alt }) {
          return (
            <img
              src={src}
              alt={alt}
              className="my-4 max-w-full rounded-lg border border-border"
            />
          )
        },
      }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
})

export default MarkdownRenderer

