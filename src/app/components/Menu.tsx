/**
 * Menu Component
 * Server component that fetches and renders navigation menus
 */

import { fetchMenuBySlug } from '@/lib/frontspace/client'
import { MenuItemClient } from './MenuItemClient'

// Menu item type matching the new Frontspace client response
interface MenuItem {
  id: string
  title: string
  link_type: string
  url?: string
  slug?: string
  page_id?: string
  target?: string
  children?: MenuItem[]
}

interface MenuProps {
  menuId: string
  orientation?: 'horizontal' | 'vertical'
  alignment?: 'left' | 'center' | 'right'
  textColor?: string
  className?: string
}

export async function Menu({ menuId, orientation = 'horizontal', alignment = 'left', textColor, className = '' }: MenuProps) {
  // Fetch menu data from Frontspace API (using new client with proper cache tags)
  const menu = await fetchMenuBySlug(menuId)

  if (!menu || !menu.items || menu.items.length === 0) {
    return null
  }

  return (
    <nav className={`menu ${className}`} style={{ color: textColor || 'inherit', position: 'relative' }}>
      <ul
        style={{
          display: 'flex',
          flexDirection: orientation === 'vertical' ? 'column' : 'row',
          justifyContent:
            alignment === 'center' ? 'center' :
            alignment === 'right' ? 'flex-end' :
            'flex-start',
          listStyle: 'none',
          margin: 0,
          padding: 0,
          gap: '1rem',
          position: 'relative',
        }}
      >
        {menu.items.map((item: MenuItem) => (
          <MenuItemClient key={item.id} item={item} textColor={textColor} />
        ))}
      </ul>
    </nav>
  )
}
