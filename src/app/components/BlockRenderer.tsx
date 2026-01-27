/**
 * Block Renderer
 *
 * Main component for rendering Frontspace CMS blocks
 * Supports all block types with responsive styles and nested children
 */

import React from 'react'
import { generateBlockCSS } from '@/lib/block-utils'

export interface Block {
  id: string
  type: string
  content: any
  styles?: Record<string, any>
  responsiveStyles?: Record<string, Record<string, any>>
  visibility?: {
    desktop?: boolean
    tablet?: boolean
    mobile?: boolean
  }
  hidden?: boolean
}

/**
 * Check if a block should be completely hidden (not rendered at all)
 *
 * NOTE: Responsive visibility (desktop/tablet/mobile) is handled via CSS media queries
 * in generateBlockCSS, NOT here. This only checks for explicit hidden flags.
 */
function isBlockHidden(block: Block): boolean {
  // Check direct hidden property (if Frontspace ever adds this)
  if (block.hidden === true) return true

  // Check content.hidden property (common CMS pattern)
  if (block.content?.hidden === true) return true

  // Responsive visibility (block.visibility) is handled by CSS media queries
  // in generateBlockCSS - blocks are rendered but hidden via display:none
  // So we do NOT filter here based on visibility flags

  return false
}

interface BlockRendererProps {
  blocks: Block[]
}

/**
 * Main renderer component - renders an array of blocks
 * Uses Promise.allSettled to prevent one failing block from crashing all blocks
 * Filters out hidden blocks before rendering
 */
export async function BlockRenderer({ blocks }: BlockRendererProps) {
  if (!blocks || blocks.length === 0) return null

  // Filter out hidden blocks before rendering
  const visibleBlocks = blocks.filter((block) => !isBlockHidden(block))

  if (visibleBlocks.length === 0) return null

  // Use allSettled so one failing block doesn't crash all others
  const results = await Promise.allSettled(
    visibleBlocks.map(async (block) => ({
      id: block.id,
      element: await BlockComponent({ block })
    }))
  )

  return (
    <>
      {results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return <React.Fragment key={result.value.id}>{result.value.element}</React.Fragment>
        } else {
          // Log error but don't crash - render nothing for this block
          console.error(`[BlockRenderer] Block ${visibleBlocks[index]?.id} failed:`, result.reason)
          return null
        }
      })}
    </>
  )
}

/**
 * Individual block component - routes to specific block type
 */
async function BlockComponent({ block }: { block: Block }) {
  // Use the block ID directly from CMS (already has 'block-' prefix)
  const blockId = block.id

  const css = generateBlockCSS(blockId, block.styles, block.responsiveStyles, block.visibility)

  return (
    <>
      {css && <style key={`style-${blockId}`} dangerouslySetInnerHTML={{ __html: css }} />}
      {await renderBlock(block, blockId)}
    </>
  )
}

/**
 * Render specific block type
 */
async function renderBlock(block: Block, blockId: string) {
  switch (block.type) {
    case 'container': {
      const { default: ContainerBlock } = await import('@/app/components/blocks/ContainerBlock')
      return <ContainerBlock block={block} blockId={blockId} />
    }

    case 'text': {
      const { default: TextBlock } = await import('@/app/components/blocks/TextBlock')
      return <TextBlock block={block} blockId={blockId} />
    }

    case 'image': {
      const { default: ImageBlock } = await import('@/app/components/blocks/ImageBlock')
      return <ImageBlock block={block} blockId={blockId} />
    }

    case 'button': {
      const { default: ButtonBlock } = await import('@/app/components/blocks/ButtonBlock')
      return <ButtonBlock block={block} blockId={blockId} />
    }

    case 'accordion': {
      const { default: AccordionBlock } = await import('@/app/components/blocks/AccordionBlock')
      return <AccordionBlock block={block} blockId={blockId} />
    }

    case 'spacer': {
      const { default: SpacerBlock } = await import('@/app/components/blocks/SpacerBlock')
      return <SpacerBlock blockId={blockId} />
    }

    case 'divider': {
      const { default: DividerBlock } = await import('@/app/components/blocks/DividerBlock')
      return <DividerBlock blockId={blockId} />
    }

    case 'form': {
      const { default: FormBlock } = await import('@/blocks/FormBlock/Component')
      return <FormBlock block={block} blockId={blockId} />
    }

    case 'textarea': {
      const { default: TextareaBlock } = await import('@/app/components/blocks/TextareaBlock')
      return <TextareaBlock block={block} blockId={blockId} />
    }

    case 'menu': {
      const { default: MenuBlock } = await import('@/app/components/blocks/MenuBlock')
      return <MenuBlock block={block} blockId={blockId} />
    }

    case 'map':
      return <MapBlockRenderer block={block} blockId={blockId} />

    case 'custom': {
      const { default: CustomComponentBlock } = await import('@/app/components/blocks/CustomComponentBlock')
      return <CustomComponentBlock block={block} blockId={blockId} />
    }

    case 'post-list': {
      const { default: PostListBlock } = await import('@/app/components/blocks/PostListBlock')
      return <PostListBlock block={block} blockId={blockId} />
    }

    case 'video': {
      const { default: VideoBlock } = await import('@/app/components/blocks/VideoBlock')
      return <VideoBlock block={block} blockId={blockId} />
    }

    default:
      console.warn(`Unknown block type: ${block.type}`)
      return null
  }
}

/**
 * Map Block - renders interactive Leaflet map with markers
 * Supports width and height from block.content for dimension control
 */
async function MapBlockRenderer({ block, blockId }: { block: Block; blockId: string }) {
  const content = block.content || {}
  const markers = content.markers || []
  const zoom = content.zoom || 10
  const width = content.width
  const height = content.height
  const tileProvider = content.tileProvider || 'openstreetmap'

  // Dynamically import MapBlock to avoid tainting this module with 'use client'
  const { default: MapBlock } = await import('@/app/components/blocks/MapBlockWrapper')

  return <MapBlock id={blockId} markers={markers} zoom={zoom} width={width} height={height} tileProvider={tileProvider} className={`map-block ${blockId}`} />
}

