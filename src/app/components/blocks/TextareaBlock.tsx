/**
 * Textarea Block Component
 *
 * Displays text content with HTML formatting
 * Preserves whitespace and line breaks from backend input
 * Note: Despite the name, this is not an input field - it renders text content
 */

import React from 'react'

export interface Block {
  id: string
  type: string
  content: any
  styles?: Record<string, any>
  responsiveStyles?: Record<string, Record<string, any>>
}

interface TextareaBlockProps {
  block: Block
  blockId: string
}

/**
 * Format text content for proper display
 * - Converts empty <p></p> tags to <p>&nbsp;</p> so they take up space
 * - Converts plain text newlines to <br> tags if no HTML structure exists
 */
function formatText(text: string): string {
  if (!text) return ''

  // Check if text already contains HTML block elements
  const hasHtmlBlocks = /<(p|div|br|ul|ol|li|h[1-6]|blockquote|pre)[\s>]/i.test(text)

  if (hasHtmlBlocks) {
    // Replace empty <p></p> tags with <p> containing non-breaking space for proper spacing
    return text.replace(/<p><\/p>/g, '<p>&nbsp;</p>')
  }

  // Convert newlines to <br> tags for plain text
  return text.replace(/\n/g, '<br />')
}

export default function TextareaBlock({ block, blockId }: TextareaBlockProps) {
  const text = block.content?.text || ''
  const formattedText = formatText(text)

  return (
    <div
      className={`textarea-block block-${blockId} leading-relaxed [&_ul]:space-y-3 [&_ol]:space-y-3 [&_li]:mb-3 [&_p]:leading-relaxed [&_p:empty]:min-h-[1em]`}
      data-block-id={blockId}
      dangerouslySetInnerHTML={{ __html: formattedText }}
    />
  )
}
