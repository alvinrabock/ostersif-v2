/**
 * Menu Block Component
 *
 * Renders navigation menu using the Menu component
 * Fetches menu data from Frontspace CMS
 */

import React from 'react'
import { Menu } from '@/app/components/Menu'

export interface Block {
  id: string
  type: string
  content: any
  styles?: Record<string, any>
  responsiveStyles?: Record<string, Record<string, any>>
}

interface MenuBlockProps {
  block: Block
  blockId: string
}

export default async function MenuBlock({ block, blockId }: MenuBlockProps) {
  const content = block.content || {}
  const orientation = content.orientation || 'horizontal'
  const alignment = content.alignment || 'left'
  const textColor = content.colors?.textColor

  // If no selectedMenuId, return null
  if (!content.selectedMenuId) {
    return null
  }

  return (
    <div
      className={`menu-block block-${blockId}`}
      data-block-id={blockId}
      style={{ position: 'relative', overflow: 'visible' }}
    >
      <Menu
        menuId={content.selectedMenuId}
        orientation={orientation}
        alignment={alignment}
        textColor={textColor}
        className={`block-${blockId}`}
      />
    </div>
  )
}
