/**
 * Button Block Component
 *
 * Renders clickable buttons with links
 * Supports all link types: internal, external, email, phone, anchor
 */

import React from 'react'
import Link from 'next/link'
import { isInternalUrl } from '@/lib/block-utils'

export interface Block {
  id: string
  type: string
  content: any
  styles?: Record<string, any>
  responsiveStyles?: Record<string, Record<string, any>>
}

interface ButtonBlockProps {
  block: Block
  blockId: string
}

export default function ButtonBlock({ block, blockId }: ButtonBlockProps) {
  const { text, link } = block.content

  // Resolve link URL based on type
  const resolveLink = () => {
    if (!link || !link.url) return null

    switch (link.type) {
      case 'internal':
        return link.url
      case 'external':
        return link.url
      case 'email':
        return `mailto:${link.url}`
      case 'phone':
        return `tel:${link.url}`
      case 'anchor':
        return link.url // Already has # prefix
      default:
        return link.url
    }
  }

  const href = resolveLink()

  // No link - render as button
  if (!href) {
    return (
      <button
        className={`button-block block-${blockId}`}
        data-block-id={blockId}
        type="button"
      >
        {text || 'Button'}
      </button>
    )
  }

  // Internal link - use Next.js Link
  if (link.type === 'internal' && isInternalUrl(href)) {
    const linkProps = link.openInNewWindow
      ? { target: '_blank', rel: 'noopener noreferrer' }
      : {}

    return (
      <Link
        href={href}
        {...linkProps}
        className={`button-block block-${blockId}`}
        data-block-id={blockId}
      >
        {text || 'Button'}
      </Link>
    )
  }

  // External/email/phone/anchor - use regular anchor tag
  const linkProps = link.openInNewWindow
    ? { target: '_blank', rel: 'noopener noreferrer' }
    : {}

  return (
    <a
      href={href}
      {...linkProps}
      className={`button-block block-${blockId}`}
      data-block-id={blockId}
    >
      {text || 'Button'}
    </a>
  )
}
