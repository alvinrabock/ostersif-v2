import React from 'react'
import { HeaderClient } from './HeaderClient';
import { frontspace } from '@/lib/frontspace/client';
import { fetchHuvudpartners } from '@/lib/frontspace/adapters/partners';
import { Header as HeaderType } from '@/types';

const Header = async () => {
    // Fetch menu and partners from Frontspace
    const [huvudmeny, huvudpartners] = await Promise.all([
        frontspace.menus.getHuvudmeny(),
        fetchHuvudpartners(),
    ]);

    // Transform menu items to match Header type
    const transformMenuItem = (item: any) => {
        if (!item) return null;

        const label = item.title;
        const linkType = item.link_type;
        const slug = item.slug;
        const url = item.url;
        const target = item.target || '_self';

        // Determine the type and url based on link_type
        let type: string;
        let linkUrl: string | undefined;

        if (linkType === 'internal' && slug) {
            type = 'reference';
            linkUrl = undefined;
        } else if (linkType === 'external' && url) {
            type = 'custom';
            linkUrl = url;
        } else if (linkType === 'none') {
            type = 'none';
            linkUrl = undefined;
        } else {
            type = linkType || 'none';
            linkUrl = url;
        }

        return {
            id: item.id,
            link: {
                label,
                type,
                url: linkUrl,
                newTab: target === '_blank',
                reference: (type === 'reference' && slug) ? {
                    relationTo: 'pages',
                    value: {
                        slug,
                    },
                } : undefined,
            },
            subMenu: item.children && item.children.length > 0
                ? item.children.map(transformMenuItem).filter(Boolean)
                : [],
        };
    };

    const navItems = huvudmeny?.items
        ?.map(transformMenuItem)
        .filter((item): item is NonNullable<typeof item> => item !== null) || [];

    const headerData: HeaderType = {
        id: 'main-header',
        name: 'Main Header',
        content: { blocks: [] },
        enableAlert: false,
        headsUpMessage: '',
        backgroundColor: undefined,
        textColor: undefined,
        link: undefined,
        navItems,
        smallMenu: [],
        socialMedia: [
            { id: '1', platform: 'Facebook', url: 'https://www.facebook.com/ostersif' },
            { id: '2', platform: 'Instagram', url: 'https://www.instagram.com/ostersif' },
            { id: '3', platform: 'TikTok', url: 'https://www.tiktok.com/@ostersif' },
            { id: '4', platform: 'Youtube', url: 'https://www.youtube.com/@ostersif' },
            { id: '5', platform: 'X', url: 'https://twitter.com/ostersif' },
        ],
    };

    return (
        <HeaderClient headerData={headerData} huvudpartners={huvudpartners} />
    )
}

export default Header