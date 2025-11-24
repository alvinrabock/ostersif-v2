/**
 * Menu Component
 * Server component that fetches and renders navigation menus
 */

import client from '@/lib/frontspace-client'
import { MenuItemClient } from './MenuItemClient'

interface MenuProps {
  menuId: string
  orientation?: 'horizontal' | 'vertical'
  alignment?: 'left' | 'center' | 'right'
  textColor?: string
  className?: string
}

export async function Menu({ menuId, orientation = 'horizontal', alignment = 'left', textColor, className = '' }: MenuProps) {
  // Fetch menu data from Frontspace API
  const menu = await client.getMenu(menuId)

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
        {menu.items.map((item) => (
          <MenuItemClient key={item.id} item={item} textColor={textColor} />
        ))}
      </ul>
    </nav>
  )
}
