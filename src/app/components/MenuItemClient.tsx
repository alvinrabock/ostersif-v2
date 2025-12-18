'use client'

/**
 * Client-side Menu Item Component
 * Handles hover interactions for dropdowns
 */

import { useState, useCallback } from 'react'
import Link from 'next/link'

// Menu item type from new Frontspace client
interface MenuItemType {
  id: string
  title: string
  link_type: string
  url?: string
  slug?: string
  page_id?: string
  target?: string
  children?: MenuItemType[]
}

interface MenuItemProps {
  item: MenuItemType
  textColor?: string
}

export function MenuItemClient({ item, textColor }: MenuItemProps) {
  const [isOpen, setIsOpen] = useState(false)
  const hasChildren = item.children && item.children.length > 0

  // Memoize handlers to prevent memory leaks
  const handleMouseEnter = useCallback(() => {
    if (hasChildren) {
      setIsOpen(true)
    }
  }, [hasChildren])

  const handleMouseLeave = useCallback(() => {
    if (hasChildren) {
      setIsOpen(false)
    }
  }, [hasChildren])

  // Determine the URL based on link_type:
  // - 'internal': Use full nested path from url field (e.g., /partners/vara-partners)
  // - 'external': Use full URL (e.g., https://test.se)
  // - 'none': Use '#' (just a dropdown trigger)
  let href = '#'
  if (item.link_type === 'internal' && item.url) {
    // Use the full nested path built by the resolver
    href = item.url
  } else if (item.link_type === 'external' && item.url) {
    href = item.url
  } else if (item.url) {
    // Fallback: if user entered a URL directly
    href = item.url
  }

  const openInNewWindow = item.target === '_blank'
  const linkProps = {
    href,
    target: openInNewWindow ? '_blank' : '_self',
    rel: openInNewWindow ? 'noopener noreferrer' : undefined,
    style: {
      textDecoration: 'none',
      color: textColor || 'inherit',
      padding: '0.5rem 1rem',
      display: 'block',
    }
  }

  return (
    <li
      style={{ position: 'relative', zIndex: isOpen ? 1001 : 1 }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {hasChildren ? (
        // If has children, render as span or button instead of link
        <span
          style={{
            textDecoration: 'none',
            color: textColor || 'inherit',
            padding: '0.5rem 1rem',
            display: 'block',
            cursor: 'pointer',
          }}
        >
          {item.title}
        </span>
      ) : item.link_type === 'internal' ? (
        <Link {...linkProps}>
          {item.title}
        </Link>
      ) : (
        <a {...linkProps}>
          {item.title}
        </a>
      )}

      {hasChildren && (
        <ul
          style={{
            display: isOpen ? 'block' : 'none',
            position: 'absolute',
            top: '100%',
            left: 0,
            listStyle: 'none',
            margin: 0,
            padding: 0,
            backgroundColor: '#ffffff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            minWidth: '200px',
            zIndex: 1000,
            borderRadius: '0.5rem',
            overflow: 'hidden',
          }}
          data-menu-label={item.title}
          data-is-open={isOpen}
        >
          {item.children!.map((child) => (
            <li key={child.id} style={{
              borderBottom: '1px solid #f0f0f0',
            }}>
              {(() => {
                // Determine child URL based on link_type
                let childHref = '#'
                if (child.link_type === 'internal' && child.url) {
                  // Use the full nested path built by the resolver
                  childHref = child.url
                } else if (child.link_type === 'external' && child.url) {
                  childHref = child.url
                } else if (child.url) {
                  childHref = child.url
                }

                const childOpenInNewWindow = child.target === '_blank'
                const childLinkProps = {
                  href: childHref,
                  target: childOpenInNewWindow ? '_blank' : '_self',
                  rel: childOpenInNewWindow ? 'noopener noreferrer' : undefined,
                  className: 'submenu-item',
                  style: {
                    textDecoration: 'none',
                    color: '#333',
                    padding: '0.75rem 1rem',
                    display: 'block',
                  }
                }

                // Use Link for internal pages, <a> for external
                return child.link_type === 'internal' ? (
                  <Link {...childLinkProps}>
                    {child.title}
                  </Link>
                ) : (
                  <a {...childLinkProps}>
                    {child.title}
                  </a>
                )
              })()}
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}
