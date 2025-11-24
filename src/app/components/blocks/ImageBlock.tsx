/**
 * Image Block Component
 *
 * Renders images from Frontspace CMS
 * Uses regular <img> tags to support dynamic image sources
 * Supports border radius and other inline styling properties from block.styles
 */

import React from 'react'

export interface Block {
  id: string
  type: string
  content: any
  styles?: Record<string, any>
  responsiveStyles?: Record<string, Record<string, any>>
}

interface ImageBlockProps {
  block: Block
  blockId: string
}

export default function ImageBlock({ block, blockId }: ImageBlockProps) {
  const { src, alt, width, height, link, logoOnScroll } = block.content

  if (!src) return null

  // The block-level styles (like borderRadius) are already applied via CSS by BlockComponent
  // We only apply inline styles for dimension controls
  const imageElement = (
    <img
      src={src}
      alt={alt || ''}
      className={`block-image block-${blockId}`}
      style={{
        width: width || '100%',
        height: height || 'auto',
        display: 'block'
      }}
    />
  )

  const content = link?.url ? (
    <a href={link.url} target={link.target || '_self'} style={{ display: 'block' }}>
      {imageElement}
    </a>
  ) : imageElement

  return (
    <div
      className={`image-block block-${blockId}`}
      data-block-id={blockId}
      data-logo-on-scroll={logoOnScroll || undefined}
    >
      {content}
    </div>
  )
}
