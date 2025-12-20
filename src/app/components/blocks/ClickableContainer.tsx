'use client'

import { useRouter } from 'next/navigation'
import React from 'react'

interface ClickableContainerProps {
  href: string
  isInternal: boolean
  target?: string
  rel?: string
  className?: string
  id?: string
  style?: React.CSSProperties
  children: React.ReactNode
  'data-block-id'?: string
}

/**
 * Client-side clickable container that uses onClick instead of <a> wrapper
 * This avoids nested <a> issues when children contain links
 */
export function ClickableContainer({
  href,
  isInternal,
  target,
  rel,
  className,
  id,
  style,
  children,
  'data-block-id': dataBlockId,
}: ClickableContainerProps) {
  const router = useRouter()

  const handleClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on a nested link or button
    const target = e.target as HTMLElement
    if (target.closest('a') || target.closest('button')) {
      return
    }

    if (isInternal) {
      router.push(href)
    } else {
      window.open(href, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div
      id={id}
      className={className}
      data-block-id={dataBlockId}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick(e as unknown as React.MouseEvent)
        }
      }}
      role="link"
      tabIndex={0}
      style={{ ...style, cursor: 'pointer' }}
    >
      {children}
    </div>
  )
}
