/**
 * Custom Component Block
 *
 * Renders custom components from Frontspace CMS
 * Add new custom components to the switch statement below
 */

import React from 'react';

export interface Block {
  id: string;
  type: string;
  content: any;
  styles?: Record<string, any>;
  responsiveStyles?: Record<string, Record<string, any>>;
}

interface CustomComponentBlockProps {
  block: Block;
  blockId: string;
}

export default async function CustomComponentBlock({
  block,
  blockId
}: CustomComponentBlockProps) {
  const content = block.content || {};
  const componentName = content.componentName;
  const props = content.props || {};

  // Handle different component types
  switch (componentName) {
    case 'SenastSpeladeMatcher': {

      // Dynamically import the component (client component)
      const { default: SenastSpeladeMatcher } = await import('@/app/components/SenastSpeladeMatcher');

      return (
        <div
          className={`custom-component-block senast-spelade-matcher block-${blockId}`}
          data-block-id={blockId}
        >
          <SenastSpeladeMatcher maxMatches={props.maxMatches || 5} />
        </div>
      );
    }

    case 'TabellBlock': {
      // Dynamically import the component (client component)
      const { default: TabellBlock } = await import('@/blocks/TabellBlock');

      return (
        <div
          className={`custom-component-block tabell-block block-${blockId}`}
          data-block-id={blockId}
        >
          <TabellBlock />
        </div>
      );
    }

    case 'SenasteNyheter':
    case 'LatestNewsBlock': {
      // Dynamically import the component (server component)
      const { default: SenasteNyheterBlock } = await import('@/blocks/SenasteNyheterBlock/Component');

      return <SenasteNyheterBlock maxPosts={props.maxPosts || 3} />;
    }

    case 'KommandeMatcher':
    case 'UpcomingMatchesBlock': {
      // Dynamically import the component (client component)
      const { default: KommandeMatcher } = await import('@/app/components/KommandeMatcher');

      return (
        <div
          className={`custom-component-block kommande-matcher block-${blockId}`}
          data-block-id={blockId}
        >
          <KommandeMatcher maxMatches={props.maxMatches || 3} />
        </div>
      );
    }

    case 'HeroSlider': {
      // Dynamically import the component (client component)
      const { default: HeroSlider } = await import('@/app/components/HeroSlider');

      // HeroSlider needs full width, no wrapper constraints
      return <HeroSlider maxPosts={props.maxPosts || 5} />;
    }

    default:
      console.warn(`⚠️ Unknown custom component: ${componentName}`);
      console.warn('Available components: SenastSpeladeMatcher, TabellBlock, SenasteNyheter, LatestNewsBlock, KommandeMatcher, UpcomingMatchesBlock, HeroSlider');
      return (
        <div
          className={`custom-component-block block-${blockId}`}
          data-block-id={blockId}
        >
          <p>Custom component not configured: {componentName}</p>
        </div>
      );
  }
}
