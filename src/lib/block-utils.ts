/**
 * Block Rendering Utilities
 *
 * Helper functions for processing block styles and generating responsive CSS
 * Updated: Fixed grid-template-columns responsive behavior
 */

export type Breakpoint = 'mobile' | 'tablet' | 'desktop'

export interface ResponsiveStyles {
  [property: string]: {
    mobile?: string
    tablet?: string
    desktop?: string
  }
}

/**
 * Convert kebab-case CSS properties to camelCase for React inline styles
 */
export function convertToCamelCase(styles: Record<string, any>): Record<string, any> {
  const converted: Record<string, any> = {}

  Object.keys(styles).forEach((key) => {
    // Convert kebab-case to camelCase
    const camelKey = key.replace(/-([a-z])/g, (g) => g[1].toUpperCase())
    converted[camelKey] = styles[key]
  })

  return converted
}

/**
 * Convert camelCase to kebab-case for CSS properties
 */
export function convertToKebabCase(property: string): string {
  return property.replace(/([A-Z])/g, '-$1').toLowerCase()
}

/**
 * Expand shorthand CSS properties into longhand properties
 * This prevents conflicts between shorthand (padding) and longhand (padding-left)
 */
export function expandShorthandProperties(styles: Record<string, any>): Record<string, any> {
  const expanded: Record<string, any> = {}

  Object.keys(styles).forEach((key) => {
    const value = styles[key]

    // Expand padding shorthand
    if (key === 'padding' && typeof value === 'string') {
      const parts = value.trim().split(/\s+/)
      if (parts.length === 1) {
        expanded.paddingTop = parts[0]
        expanded.paddingRight = parts[0]
        expanded.paddingBottom = parts[0]
        expanded.paddingLeft = parts[0]
      } else if (parts.length === 2) {
        expanded.paddingTop = parts[0]
        expanded.paddingRight = parts[1]
        expanded.paddingBottom = parts[0]
        expanded.paddingLeft = parts[1]
      } else if (parts.length === 3) {
        expanded.paddingTop = parts[0]
        expanded.paddingRight = parts[1]
        expanded.paddingBottom = parts[2]
        expanded.paddingLeft = parts[1]
      } else if (parts.length === 4) {
        expanded.paddingTop = parts[0]
        expanded.paddingRight = parts[1]
        expanded.paddingBottom = parts[2]
        expanded.paddingLeft = parts[3]
      }
    }
    // Expand margin shorthand
    else if (key === 'margin' && typeof value === 'string') {
      const parts = value.trim().split(/\s+/)
      if (parts.length === 1) {
        expanded.marginTop = parts[0]
        expanded.marginRight = parts[0]
        expanded.marginBottom = parts[0]
        expanded.marginLeft = parts[0]
      } else if (parts.length === 2) {
        expanded.marginTop = parts[0]
        expanded.marginRight = parts[1]
        expanded.marginBottom = parts[0]
        expanded.marginLeft = parts[1]
      } else if (parts.length === 3) {
        expanded.marginTop = parts[0]
        expanded.marginRight = parts[1]
        expanded.marginBottom = parts[2]
        expanded.marginLeft = parts[1]
      } else if (parts.length === 4) {
        expanded.marginTop = parts[0]
        expanded.marginRight = parts[1]
        expanded.marginBottom = parts[2]
        expanded.marginLeft = parts[3]
      }
    }
    // Expand borderRadius shorthand
    else if (key === 'borderRadius' && typeof value === 'string') {
      const parts = value.trim().split(/\s+/)
      if (parts.length === 1) {
        expanded.borderTopLeftRadius = parts[0]
        expanded.borderTopRightRadius = parts[0]
        expanded.borderBottomRightRadius = parts[0]
        expanded.borderBottomLeftRadius = parts[0]
      } else if (parts.length === 2) {
        expanded.borderTopLeftRadius = parts[0]
        expanded.borderTopRightRadius = parts[1]
        expanded.borderBottomRightRadius = parts[0]
        expanded.borderBottomLeftRadius = parts[1]
      } else if (parts.length === 3) {
        expanded.borderTopLeftRadius = parts[0]
        expanded.borderTopRightRadius = parts[1]
        expanded.borderBottomRightRadius = parts[2]
        expanded.borderBottomLeftRadius = parts[1]
      } else if (parts.length === 4) {
        expanded.borderTopLeftRadius = parts[0]
        expanded.borderTopRightRadius = parts[1]
        expanded.borderBottomRightRadius = parts[2]
        expanded.borderBottomLeftRadius = parts[3]
      }
    }
    // Keep all other properties as-is
    else {
      expanded[key] = value
    }
  })

  return expanded
}

/**
 * Get merged styles for a specific breakpoint
 */
export function getBlockStyles(
  baseStyles: Record<string, any> = {},
  responsiveStyles: ResponsiveStyles = {},
  breakpoint: Breakpoint = 'desktop'
): Record<string, any> {
  const mergedStyles: Record<string, any> = { ...baseStyles }

  // Merge responsive styles based on breakpoint
  Object.keys(responsiveStyles).forEach((property) => {
    const breakpointValues = responsiveStyles[property]
    if (breakpointValues && breakpointValues[breakpoint]) {
      mergedStyles[property] = breakpointValues[breakpoint]
    }
  })

  return convertToCamelCase(mergedStyles)
}

/**
 * Generate CSS string for a block with responsive styles
 * Uses CSS custom properties (CSS variables) for better flexibility
 * Desktop-first approach: merges desktop responsive styles into base styles
 * Properly handles shorthand property expansion for responsive overrides
 * Supports linkColor for styling anchor tags within text blocks
 */
export function generateBlockCSS(
  blockId: string,
  baseStyles: Record<string, any> = {},
  responsiveStyles: ResponsiveStyles = {}
): string {
  const className = `.block-${blockId}`
  let css = `${className} {\n`

  // Extract linkColor from responsiveStyles for special handling
  const linkColor = responsiveStyles.linkColor as { desktop?: string; tablet?: string; mobile?: string } | undefined

  // Create a copy of responsiveStyles without linkColor for normal processing
  const { linkColor: _, ...normalResponsiveStyles } = responsiveStyles

  // Expand shorthand properties in base styles to avoid conflicts
  const expandedBaseStyles = expandShorthandProperties(baseStyles)

  // Collect all responsive properties (excluding linkColor which is handled separately)
  const allResponsiveProps = Object.keys(normalResponsiveStyles)

  // Merge desktop responsive styles into base styles (desktop-first approach)
  // This matches the non-headless version behavior
  const mergedBaseStyles = { ...expandedBaseStyles }
  allResponsiveProps.forEach((property) => {
    let desktopValue = normalResponsiveStyles[property]?.desktop
    if (desktopValue !== undefined && desktopValue !== null && desktopValue !== '') {
      // Convert grid-template-columns shorthand (e.g., "2" -> "repeat(2, 1fr)")
      if (property === 'gridTemplateColumns' && /^\d+$/.test(desktopValue)) {
        desktopValue = `repeat(${desktopValue}, 1fr)`
      }
      mergedBaseStyles[property] = desktopValue
    }
  })

  // Expand merged base styles again to handle desktop responsive shorthands
  const finalExpandedBaseStyles = expandShorthandProperties(mergedBaseStyles)

  // Base styles (now including desktop responsive values) using CSS custom properties
  Object.keys(finalExpandedBaseStyles).forEach((property) => {
    const cssProperty = convertToKebabCase(property)
    const cssVarName = `--${cssProperty}`
    let value = finalExpandedBaseStyles[property]

    // Convert grid-template-columns shorthand in base styles too
    if (property === 'gridTemplateColumns' && /^\d+$/.test(value)) {
      value = `repeat(${value}, 1fr)`
    }

    css += `    ${cssVarName}: ${value};\n`
    css += `    ${cssProperty}: var(${cssVarName});\n`
  })

  css += `}\n\n`

  // Mobile styles (override desktop/base values on mobile)
  const mobileProps = allResponsiveProps.filter(prop => {
    const value = normalResponsiveStyles[prop]?.mobile
    return value !== undefined && value !== null && value !== ''
  })
  if (mobileProps.length > 0) {
    css += `@media (max-width: 767px) { ${className} {\n`

    // Expand shorthand properties in mobile responsive styles
    const mobileStyles: Record<string, any> = {}
    mobileProps.forEach(property => {
      mobileStyles[property] = normalResponsiveStyles[property].mobile
    })
    const expandedMobileStyles = expandShorthandProperties(mobileStyles)

    Object.keys(expandedMobileStyles).forEach(property => {
      const cssProperty = convertToKebabCase(property)
      let mobileValue = expandedMobileStyles[property]

      // Convert grid-template-columns shorthand (e.g., "2" -> "repeat(2, 1fr)")
      if (property === 'gridTemplateColumns' && mobileValue && /^\d+$/.test(mobileValue)) {
        mobileValue = `repeat(${mobileValue}, 1fr)`
      }

      // Apply property directly without CSS variables for better compatibility
      css += `    ${cssProperty}: ${mobileValue} !important;\n`
    })

    // Reset grid positioning on mobile for single column layouts
    const hasGridTemplateColumns = mobileProps.includes('gridTemplateColumns')
    if (hasGridTemplateColumns) {
      css += `    grid-column: auto !important;\n`
      css += `    grid-row: auto !important;\n`
    }

    css += `  }\n}\n\n`
  }

  // Tablet styles (override desktop/base values on tablet)
  const tabletProps = allResponsiveProps.filter(prop => {
    const value = normalResponsiveStyles[prop]?.tablet
    return value !== undefined && value !== null && value !== ''
  })
  if (tabletProps.length > 0) {
    css += `@media (min-width: 768px) and (max-width: 1023px) { ${className} {\n`

    // Expand shorthand properties in tablet responsive styles
    const tabletStyles: Record<string, any> = {}
    tabletProps.forEach(property => {
      tabletStyles[property] = normalResponsiveStyles[property].tablet
    })
    const expandedTabletStyles = expandShorthandProperties(tabletStyles)

    Object.keys(expandedTabletStyles).forEach(property => {
      const cssProperty = convertToKebabCase(property)
      let tabletValue = expandedTabletStyles[property]

      // Convert grid-template-columns shorthand (e.g., "2" -> "repeat(2, 1fr)")
      if (property === 'gridTemplateColumns' && tabletValue && /^\d+$/.test(tabletValue)) {
        tabletValue = `repeat(${tabletValue}, 1fr)`
      }

      // Apply property directly without CSS variables for better compatibility
      css += `    ${cssProperty}: ${tabletValue} !important;\n`
    })

    // Reset grid positioning on tablet for single column layouts
    const hasGridTemplateColumns = tabletProps.includes('gridTemplateColumns')
    if (hasGridTemplateColumns) {
      css += `    grid-column: auto !important;\n`
      css += `    grid-row: auto !important;\n`
    }

    css += `  }\n}\n\n`
  }

  // Generate linkColor CSS for anchor tags within the block
  if (linkColor) {
    const desktopLinkColor = linkColor.desktop
    const tabletLinkColor = linkColor.tablet || desktopLinkColor
    const mobileLinkColor = linkColor.mobile || tabletLinkColor || desktopLinkColor

    // Desktop link color (base)
    if (desktopLinkColor) {
      css += `${className} a { color: ${desktopLinkColor}; }\n`
    }

    // Tablet link color
    if (tabletLinkColor && tabletLinkColor !== desktopLinkColor) {
      css += `@media (min-width: 768px) and (max-width: 1023px) { ${className} a { color: ${tabletLinkColor}; } }\n`
    }

    // Mobile link color
    if (mobileLinkColor && mobileLinkColor !== tabletLinkColor) {
      css += `@media (max-width: 767px) { ${className} a { color: ${mobileLinkColor}; } }\n`
    }
  }

  return css
}

/**
 * Sanitize HTML content for safe rendering
 * Note: For production, consider using a library like DOMPurify
 */
export function sanitizeHTML(html: string): string {
  // Basic sanitization - for production use DOMPurify or similar
  return html
}

/**
 * Check if a URL is internal (relative)
 */
export function isInternalUrl(url: string): boolean {
  return url.startsWith('/')
}

/**
 * Extract numeric value from CSS size string
 */
export function extractNumericValue(value: string | undefined, defaultValue: number = 0): number {
  if (!value) return defaultValue
  const match = value.match(/^(\d+)/)
  return match ? parseInt(match[1]) : defaultValue
}
