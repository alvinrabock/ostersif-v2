/**
 * Divider Block Component
 *
 * Renders a horizontal line/divider
 * Styling is controlled by block styles (border, color, etc.)
 */

import React from 'react'

interface DividerBlockProps {
  blockId: string
}

export default function DividerBlock({ blockId }: DividerBlockProps) {
  return (
    <hr
      className="divider-block"
      data-block-id={blockId}
    />
  )
}
