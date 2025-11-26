'use client'

/**
 * Client-side Menu Item Component
 * Handles hover interactions for dropdowns
 */

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { MenuItem as MenuItemType } from '@/lib/frontspace-client'

interface MenuItemProps {
  item: MenuItemType
  textColor?: string
}

export function MenuItemClient({ item, textColor }: MenuItemProps) {
  const [isOpen, setIsOpen] = useState(false)
  const hasChildren = item.children && item.children.length > 0

  // Debug logging
  console.log('MenuItemClient:', {
    label: item.label,
    type: item.type,
    url: item.url,
    pageSlug: item.pageSlug
  })

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
  if (item.type === 'internal' && item.url) {
    // Use the full nested path built by the resolver
    href = item.url
  } else if (item.type === 'external' && item.url) {
    href = item.url
  } else if (item.url) {
    // Fallback: if user entered a URL directly
    href = item.url
  }

  const linkProps = {
    href,
    target: item.openInNewWindow ? '_blank' : '_self',
    rel: item.openInNewWindow ? 'noopener noreferrer' : undefined,
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
          {item.label}
        </span>
      ) : item.type === 'internal' ? (
        <Link {...linkProps}>
          {item.label}
        </Link>
      ) : (
        <a {...linkProps}>
          {item.label}
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
          data-menu-label={item.label}
          data-is-open={isOpen}
        >
          {item.children!.map((child) => (
            <li key={child.id} style={{
              borderBottom: '1px solid #f0f0f0',
            }}>
              {(() => {
                // Determine child URL based on link_type
                let childHref = '#'
                if (child.type === 'internal' && child.url) {
                  // Use the full nested path built by the resolver
                  childHref = child.url
                } else if (child.type === 'external' && child.url) {
                  childHref = child.url
                } else if (child.url) {
                  childHref = child.url
                }

                const childLinkProps = {
                  href: childHref,
                  target: child.openInNewWindow ? '_blank' : '_self',
                  rel: child.openInNewWindow ? 'noopener noreferrer' : undefined,
                  className: 'submenu-item',
                  style: {
                    textDecoration: 'none',
                    color: '#333',
                    padding: '0.75rem 1rem',
                    display: 'block',
                  }
                }

                // Use Link for internal pages, <a> for external
                return child.type === 'internal' ? (
                  <Link {...childLinkProps}>
                    {child.label}
                  </Link>
                ) : (
                  <a {...childLinkProps}>
                    {child.label}
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
