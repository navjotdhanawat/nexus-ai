/**
 * Chat Export Utilities
 * Functions for exporting conversations to different formats
 */

import { save } from '@tauri-apps/plugin-dialog'
import { writeTextFile } from '@tauri-apps/plugin-fs'
import { logger } from '@/lib/logger'
import type { Conversation } from '@/store/chat-store'
import { getMessageText, getContentParts } from '@/store/chat-store'
import type { ContentPart } from '@/types/multimodal'

// ============================================
// Types
// ============================================

export type ExportFormat = 'json' | 'markdown'

export interface ExportOptions {
  format: ExportFormat
  includeSystemPrompt?: boolean
  includeMetadata?: boolean
  includeTimestamps?: boolean
}

export interface ExportResult {
  success: boolean
  filePath?: string
  error?: string
}

// ============================================
// JSON Export
// ============================================

interface ExportedMessage {
  role: string
  content: string
  timestamp?: string
  attachments?: AttachmentInfo[]
  toolCalls?: ToolCallInfo[]
}

interface AttachmentInfo {
  type: string
  mimeType?: string
  filename?: string
}

interface ToolCallInfo {
  name: string
  arguments: Record<string, unknown>
  status: string
  result?: string
}

interface ExportedConversationJSON {
  version: string
  exportedAt: string
  conversation: {
    id: string
    title: string
    model: string
    systemPrompt?: string
    createdAt: string
    updatedAt: string
    messages: ExportedMessage[]
  }
}

/**
 * Export conversation to JSON format
 */
export function exportToJSON(
  conversation: Conversation,
  options: ExportOptions = { format: 'json' }
): string {
  const messages: ExportedMessage[] = conversation.messages
    .filter(m => m.role !== 'tool') // Exclude tool result messages (shown in tool calls)
    .map(m => {
      const msg: ExportedMessage = {
        role: m.role,
        content: getMessageText(m),
      }

      if (options.includeTimestamps) {
        msg.timestamp = new Date(m.timestamp).toISOString()
      }

      // Include attachment info
      const parts = getContentParts(m)
      const attachments = parts
        .filter((p): p is Exclude<ContentPart, { type: 'text' }> => p.type !== 'text')
        .map(p => ({
          type: p.type,
          mimeType: 'mimeType' in p ? p.mimeType : undefined,
          filename: 'filename' in p ? p.filename : undefined,
        }))

      if (attachments.length > 0) {
        msg.attachments = attachments
      }

      // Include tool calls
      if (m.toolCalls && m.toolCalls.length > 0) {
        msg.toolCalls = m.toolCalls.map(tc => ({
          name: tc.name,
          arguments: tc.arguments,
          status: tc.status,
          result: tc.result,
        }))
      }

      return msg
    })

  const exported: ExportedConversationJSON = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    conversation: {
      id: conversation.id,
      title: conversation.title,
      model: conversation.modelId,
      createdAt: new Date(conversation.createdAt).toISOString(),
      updatedAt: new Date(conversation.updatedAt).toISOString(),
      messages,
    },
  }

  if (options.includeSystemPrompt && conversation.systemPrompt) {
    exported.conversation.systemPrompt = conversation.systemPrompt
  }

  return JSON.stringify(exported, null, 2)
}

// ============================================
// Markdown Export
// ============================================

/**
 * Export conversation to Markdown format
 */
export function exportToMarkdown(
  conversation: Conversation,
  options: ExportOptions = { format: 'markdown' }
): string {
  const lines: string[] = []

  // Title
  lines.push(`# ${conversation.title}`)
  lines.push('')

  // Metadata
  if (options.includeMetadata !== false) {
    lines.push('## Metadata')
    lines.push('')
    lines.push(`- **Model:** ${conversation.modelId}`)
    lines.push(`- **Created:** ${new Date(conversation.createdAt).toLocaleString()}`)
    lines.push(`- **Updated:** ${new Date(conversation.updatedAt).toLocaleString()}`)
    lines.push('')
  }

  // System Prompt
  if (options.includeSystemPrompt && conversation.systemPrompt) {
    lines.push('## System Prompt')
    lines.push('')
    lines.push('```')
    lines.push(conversation.systemPrompt)
    lines.push('```')
    lines.push('')
  }

  // Messages
  lines.push('## Conversation')
  lines.push('')

  for (const message of conversation.messages) {
    // Skip tool result messages
    if (message.role === 'tool') continue

    const roleLabel = message.role === 'user' ? '**You**' : '**Assistant**'
    const text = getMessageText(message)

    // Add timestamp if requested
    if (options.includeTimestamps) {
      const timestamp = new Date(message.timestamp).toLocaleString()
      lines.push(`### ${roleLabel} (${timestamp})`)
    } else {
      lines.push(`### ${roleLabel}`)
    }
    lines.push('')

    // Note attachments
    const parts = getContentParts(message)
    const attachments = parts.filter(p => p.type !== 'text')
    if (attachments.length > 0) {
      lines.push(`*Attachments: ${attachments.map(a => `[${a.type}]`).join(', ')}*`)
      lines.push('')
    }

    // Message content
    lines.push(text)
    lines.push('')

    // Tool calls
    if (message.toolCalls && message.toolCalls.length > 0) {
      lines.push('**Tools Used:**')
      lines.push('')
      for (const tc of message.toolCalls) {
        lines.push(`- \`${tc.name}\``)
        lines.push('  - Arguments:')
        lines.push('  ```json')
        lines.push('  ' + JSON.stringify(tc.arguments, null, 2).split('\n').join('\n  '))
        lines.push('  ```')
        if (tc.result) {
          lines.push(`  - Status: ${tc.status}`)
          // Truncate long results
          const resultPreview =
            tc.result.length > 200
              ? tc.result.substring(0, 200) + '...'
              : tc.result
          lines.push(`  - Result: \`${resultPreview.replace(/\n/g, ' ')}\``)
        }
      }
      lines.push('')
    }

    lines.push('---')
    lines.push('')
  }

  return lines.join('\n')
}

// ============================================
// File Save Functions
// ============================================

/**
 * Get default filename for export
 */
function getDefaultFilename(title: string, format: ExportFormat): string {
  // Sanitize title for filename
  const sanitized = title
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50)

  const date = new Date().toISOString().split('T')[0]
  const extension = format === 'json' ? 'json' : 'md'

  return `${sanitized}_${date}.${extension}`
}

/**
 * Export and save conversation to file
 */
export async function exportConversation(
  conversation: Conversation,
  options: ExportOptions
): Promise<ExportResult> {
  try {
    // Generate content
    const content =
      options.format === 'json'
        ? exportToJSON(conversation, options)
        : exportToMarkdown(conversation, options)

    // Get file extension and filters
    const extension = options.format === 'json' ? 'json' : 'md'
    const filterName = options.format === 'json' ? 'JSON' : 'Markdown'

    // Show save dialog
    const filePath = await save({
      defaultPath: getDefaultFilename(conversation.title, options.format),
      filters: [
        {
          name: filterName,
          extensions: [extension],
        },
      ],
    })

    if (!filePath) {
      return { success: false, error: 'Export cancelled' }
    }

    // Write file
    await writeTextFile(filePath, content)

    logger.info(`Exported conversation to ${filePath}`, {
      format: options.format,
      conversationId: conversation.id,
    })

    return { success: true, filePath }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(`Failed to export conversation: ${errorMessage}`)
    return { success: false, error: errorMessage }
  }
}

/**
 * Copy conversation to clipboard
 */
export async function copyConversationToClipboard(
  conversation: Conversation,
  options: ExportOptions
): Promise<ExportResult> {
  try {
    const content =
      options.format === 'json'
        ? exportToJSON(conversation, options)
        : exportToMarkdown(conversation, options)

    await navigator.clipboard.writeText(content)

    logger.info('Copied conversation to clipboard', {
      format: options.format,
      conversationId: conversation.id,
    })

    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(`Failed to copy conversation: ${errorMessage}`)
    return { success: false, error: errorMessage }
  }
}

/**
 * Export multiple conversations to a single JSON file
 */
export async function exportMultipleConversations(
  conversations: Conversation[],
  options: Omit<ExportOptions, 'format'>
): Promise<ExportResult> {
  try {
    const exported = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      conversationCount: conversations.length,
      conversations: conversations.map(conv => ({
        id: conv.id,
        title: conv.title,
        model: conv.modelId,
        systemPrompt: options.includeSystemPrompt ? conv.systemPrompt : undefined,
        createdAt: new Date(conv.createdAt).toISOString(),
        updatedAt: new Date(conv.updatedAt).toISOString(),
        messages: conv.messages
          .filter(m => m.role !== 'tool')
          .map(m => ({
            role: m.role,
            content: getMessageText(m),
            timestamp: options.includeTimestamps
              ? new Date(m.timestamp).toISOString()
              : undefined,
          })),
      })),
    }

    const content = JSON.stringify(exported, null, 2)

    const filePath = await save({
      defaultPath: `conversations_export_${new Date().toISOString().split('T')[0]}.json`,
      filters: [
        {
          name: 'JSON',
          extensions: ['json'],
        },
      ],
    })

    if (!filePath) {
      return { success: false, error: 'Export cancelled' }
    }

    await writeTextFile(filePath, content)

    logger.info(`Exported ${conversations.length} conversations to ${filePath}`)

    return { success: true, filePath }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(`Failed to export conversations: ${errorMessage}`)
    return { success: false, error: errorMessage }
  }
}

