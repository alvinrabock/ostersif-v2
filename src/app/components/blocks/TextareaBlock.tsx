/**
 * Textarea Block Component
 *
 * Displays text content with HTML formatting
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

export default function TextareaBlock({ block, blockId }: TextareaBlockProps) {
  const text = block.content?.text || ''

  return (
    <div
      className={`textarea-block block-${blockId} leading-relaxed [&_ul]:space-y-3 [&_ol]:space-y-3 [&_li]:mb-3 [&_p]:leading-relaxed`}
      data-block-id={blockId}
      dangerouslySetInnerHTML={{ __html: text }}
    />
  )
}
