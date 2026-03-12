'use client'

import React from 'react'
import { GalleryBlock } from '../GalleryBlock'
import { YouTubeEmbed } from '../YouTubeEmbed'

interface TiptapMark {
  type: string
  attrs?: Record<string, any>
}

interface TiptapNode {
  type: string
  attrs?: Record<string, any>
  content?: TiptapNode[]
  marks?: TiptapMark[]
  text?: string
}

interface TiptapDoc {
  type: 'doc'
  content?: TiptapNode[]
}

interface RichTextContentProps {
  content: string | TiptapDoc | Record<string, unknown>
  className?: string
}

/**
 * Try to extract Tiptap JSON from a Frontspace image proxy URL.
 * The new image delivery wraps content as:
 *   https://...frontspace.../v1/image?url={URL-encoded Tiptap JSON}&w=800&q=80&f=auto
 */
function extractFromImageProxy(value: string): TiptapDoc | null {
  if (!value.includes('frontspace') || !value.includes('/v1/image')) return null
  try {
    const url = new URL(value)
    const encoded = url.searchParams.get('url')
    if (!encoded) return null
    const decoded = decodeURIComponent(encoded)
    const parsed = JSON.parse(decoded)
    if (parsed && parsed.type === 'doc') return parsed as TiptapDoc
  } catch { /* not a proxy URL or not valid JSON */ }
  return null
}

/**
 * Check if content is Tiptap JSON format
 */
function isTiptapJson(content: string | TiptapDoc | Record<string, unknown>): boolean {
  if (typeof content === 'object' && content !== null) {
    // Direct Tiptap doc
    if ('type' in content && content.type === 'doc') return true
    // Wrapped format: { json: { type: "doc", ... } } or { tiptap: { type: "doc", ... } }
    const wrapped = (content as any).json || (content as any).tiptap
    if (wrapped && typeof wrapped === 'object' && wrapped.type === 'doc') return true
  }
  if (typeof content === 'string') {
    try {
      const parsed = JSON.parse(content)
      return parsed && parsed.type === 'doc'
    } catch {
      // Check if it's a Frontspace image proxy URL wrapping Tiptap JSON
      if (extractFromImageProxy(content)) return true
      return false
    }
  }
  return false
}

/**
 * Parse Tiptap JSON string to object
 */
function parseTiptapContent(content: string | TiptapDoc | Record<string, unknown>): TiptapDoc | null {
  if (typeof content === 'object' && content !== null) {
    if ('type' in content && content.type === 'doc') {
      return content as TiptapDoc
    }
    // Handle wrapped format: { json: { type: "doc", ... } }
    const wrapped = (content as any).json || (content as any).tiptap
    if (wrapped && typeof wrapped === 'object' && wrapped.type === 'doc') {
      return wrapped as TiptapDoc
    }
    return null
  }
  // Try direct JSON parse
  try {
    return JSON.parse(content as string)
  } catch {
    // Try extracting from Frontspace image proxy URL
    if (typeof content === 'string') {
      const extracted = extractFromImageProxy(content)
      if (extracted) return extracted
    }
    return null
  }
}

/**
 * Extract YouTube video ID from URL
 */
function getYouTubeVideoId(url: string): string | null {
  if (!url) return null
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/)
  return match ? match[1] : null
}

/**
 * Render text with marks (bold, italic, links, etc.)
 */
function renderTextWithMarks(text: string, marks?: TiptapMark[], key?: string): React.ReactNode {
  if (!marks || marks.length === 0) {
    return text
  }

  let result: React.ReactNode = text

  // Apply marks in order
  marks.forEach((mark, index) => {
    switch (mark.type) {
      case 'bold':
        result = <strong key={`${key}-bold-${index}`}>{result}</strong>
        break
      case 'italic':
        result = <em key={`${key}-italic-${index}`}>{result}</em>
        break
      case 'underline':
        result = <u key={`${key}-underline-${index}`}>{result}</u>
        break
      case 'strike':
        result = <s key={`${key}-strike-${index}`}>{result}</s>
        break
      case 'code':
        result = <code key={`${key}-code-${index}`} className="bg-gray-800 px-1 rounded">{result}</code>
        break
      case 'link':
        result = (
          <a
            key={`${key}-link-${index}`}
            href={mark.attrs?.href || '#'}
            target={mark.attrs?.target || '_blank'}
            rel={mark.attrs?.rel || 'noopener noreferrer'}
            className="text-blue-400 hover:text-blue-300 underline"
          >
            {result}
          </a>
        )
        break
    }
  })

  return result
}

/**
 * Render a single Tiptap node
 */
function renderNode(node: TiptapNode, index: number): React.ReactNode {
  const key = `node-${index}`

  switch (node.type) {
    case 'text':
      return renderTextWithMarks(node.text || '', node.marks, key)

    case 'paragraph':
      return (
        <p key={key} className="mb-4">
          {node.content?.map((child, i) => renderNode(child, i))}
        </p>
      )

    case 'heading':
      const level = node.attrs?.level || 1
      const headingClasses: Record<number, string> = {
        1: 'text-4xl font-bold mb-4 mt-6',
        2: 'text-3xl font-bold mb-3 mt-5',
        3: 'text-2xl font-bold mb-3 mt-4',
        4: 'text-xl font-bold mb-2 mt-3',
        5: 'text-lg font-bold mb-2 mt-3',
        6: 'text-base font-bold mb-2 mt-2',
      }
      const headingContent = node.content?.map((child, i) => renderNode(child, i))
      const headingClassName = headingClasses[level] || ''
      if (level === 1) return <h1 key={key} className={headingClassName}>{headingContent}</h1>
      if (level === 2) return <h2 key={key} className={headingClassName}>{headingContent}</h2>
      if (level === 3) return <h3 key={key} className={headingClassName}>{headingContent}</h3>
      if (level === 4) return <h4 key={key} className={headingClassName}>{headingContent}</h4>
      if (level === 5) return <h5 key={key} className={headingClassName}>{headingContent}</h5>
      return <h6 key={key} className={headingClassName}>{headingContent}</h6>

    case 'bulletList':
      return (
        <ul key={key} className="list-disc list-inside mb-4 ml-4">
          {node.content?.map((child, i) => renderNode(child, i))}
        </ul>
      )

    case 'orderedList':
      return (
        <ol key={key} className="list-decimal list-inside mb-4 ml-4">
          {node.content?.map((child, i) => renderNode(child, i))}
        </ol>
      )

    case 'listItem':
      return (
        <li key={key} className="mb-1">
          {node.content?.map((child, i) => renderNode(child, i))}
        </li>
      )

    case 'blockquote':
      return (
        <blockquote key={key} className="border-l-4 border-gray-500 pl-4 italic mb-4">
          {node.content?.map((child, i) => renderNode(child, i))}
        </blockquote>
      )

    case 'codeBlock':
      return (
        <pre key={key} className="bg-gray-800 p-4 rounded mb-4 overflow-x-auto">
          <code>
            {node.content?.map((child, i) => renderNode(child, i))}
          </code>
        </pre>
      )

    case 'hardBreak':
      return <br key={key} />

    case 'horizontalRule':
      return <hr key={key} className="my-8 border-gray-600" />

    case 'image':
      return (
        <img
          key={key}
          src={node.attrs?.src || ''}
          alt={node.attrs?.alt || ''}
          title={node.attrs?.title || ''}
          className="max-w-full h-auto rounded-lg my-4"
          loading="lazy"
        />
      )

    case 'videoBlock':
      const videoId = getYouTubeVideoId(node.attrs?.url || '')
      if (videoId) {
        return <YouTubeEmbed key={key} videoId={videoId} />
      }
      return null

    case 'galleryBlock':
      const images = node.attrs?.images || []
      const displayMode = node.attrs?.displayMode || 'grid'
      return (
        <GalleryBlock
          key={key}
          images={images}
          displayMode={displayMode}
        />
      )

    case 'iframeBlock':
      // Iframe embed block for slideshows, maps, forms, etc.
      if (!node.attrs?.src) return null
      return (
        <div key={key} className="iframe-block my-6">
          <div className="aspect-video">
            <iframe
              src={node.attrs.src}
              className="w-full h-full rounded-lg"
              frameBorder="0"
              allowFullScreen
              loading="lazy"
            />
          </div>
        </div>
      )

    default:
      // For unknown node types, try to render content if it exists
      if (node.content) {
        return (
          <div key={key}>
            {node.content.map((child, i) => renderNode(child, i))}
          </div>
        )
      }
      return null
  }
}

/** Image file extensions to detect bare image URLs in HTML */
const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|svg|avif)(\?.*)?$/i

/**
 * Process HTML content to convert bare image URLs into proper <img> tags.
 * Frontspace's Tiptap-to-HTML renderer may output custom block content
 * (gallery images, embedded images) as plain URL text instead of <img> elements.
 */
function processHtmlWithImageUrls(html: string): string {
  // Match bare URLs on their own line (not already inside a tag attribute)
  // Handles URLs wrapped in <p> tags or standing alone
  return html.replace(
    /(<p>)?\s*(https?:\/\/[^\s<>"]+(?:\.(?:jpg|jpeg|png|gif|webp|svg|avif))(?:\?[^\s<>"]*)?)\s*(<\/p>)?/gi,
    (_match, openTag, url, closeTag) => {
      const img = `<img src="${url}" alt="" class="max-w-full h-auto rounded-lg my-4" loading="lazy" />`
      // If it was wrapped in a <p> tag, replace the whole thing
      if (openTag || closeTag) return img
      return img
    }
  )
}

/**
 * RichTextContent component that renders Tiptap JSON content
 * with support for custom blocks like gallery and video
 */
export function RichTextContent({ content, className }: RichTextContentProps) {
  // Check if content is empty
  if (!content) {
    return null
  }

  // If content is Tiptap JSON, parse and render it
  if (isTiptapJson(content)) {
    const doc = parseTiptapContent(content)
    if (!doc || !doc.content) {
      return null
    }

    return (
      <div className={className}>
        {doc.content.map((node, index) => renderNode(node, index))}
      </div>
    )
  }

  // If content is a string (HTML), process it and render
  if (typeof content === 'string') {
    // Convert bare image URLs in HTML to proper <img> tags
    // This handles cases where Frontspace's HTML renderer doesn't know about custom blocks
    const processedHtml = processHtmlWithImageUrls(content)

    return (
      <div
        className={className}
        dangerouslySetInnerHTML={{ __html: processedHtml }}
      />
    )
  }

  // If content is an unknown object format (like Lexical), try to stringify or return null
  // This handles cases where content is passed but in an unsupported format
  return null
}

export default RichTextContent
