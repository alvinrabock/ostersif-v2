/**
 * Custom Component Block
 *
 * Renders custom components from Frontspace CMS
 * Add new custom components to the switch statement below
 */

import React, { Suspense } from 'react';
import { MatchCardSkeleton } from '@/app/components/Skeletons/MatchCardSkeleton';
import MiniMatchCardSkeleton from '@/app/components/Skeletons/MiniMatchCardSkeleton';

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

  try {
    // Handle different component types
    return await renderCustomComponent(componentName, props, blockId);
  } catch (error) {
    console.error(`[CustomComponentBlock] Error rendering ${componentName}:`, error);
    // Return null instead of crashing - the block just won't render
    return null;
  }
}

async function renderCustomComponent(componentName: string, props: any, blockId: string) {
  switch (componentName) {
    case 'SenastSpeladeMatcher': {
      // Use streaming server component for non-blocking render (grid layout)
      const { default: SenastSpeladeMatcherServer } = await import('@/app/components/SenastSpeladeMatcherServer');

      return (
        <div
          className={`custom-component-block senast-spelade-matcher block-${blockId}`}
          data-block-id={blockId}
        >
          <Suspense fallback={
            <div className="flex flex-col gap-4 w-full rounded-md">
              <h2 className="text-3xl font-bold mb-4 text-left text-white">Senast spelade matcher</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => <MiniMatchCardSkeleton key={i} />)}
              </div>
            </div>
          }>
            <SenastSpeladeMatcherServer maxMatches={props.maxMatches || 4} />
          </Suspense>
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

    case 'HistoriaPostsComponent': {
      // Dynamically import the component (server component)
      const { default: HistoriaPostsBlock } = await import('@/blocks/HistoriaPostsBlock/Component');

      return <HistoriaPostsBlock maxPosts={props.maxPosts || 3} />;
    }

    case 'KommandeMatcher':
    case 'UpcomingMatchesBlock': {
      // Use streaming server component for non-blocking render
      const { default: KommandeMatcherServer } = await import('@/app/components/KommandeMatcherServer');

      return (
        <div
          className={`custom-component-block kommande-matcher block-${blockId}`}
          data-block-id={blockId}
        >
          <Suspense fallback={
            <div className="flex flex-col gap-4">
              {[...Array(3)].map((_, i) => <MatchCardSkeleton key={i} />)}
            </div>
          }>
            <KommandeMatcherServer maxMatches={props.maxMatches || 3} />
          </Suspense>
        </div>
      );
    }

    case 'HeroSlider': {
      // Dynamically import the component (client component)
      const { default: HeroSlider } = await import('@/app/components/HeroSlider');

      // HeroSlider needs full width, no wrapper constraints
      return <HeroSlider maxPosts={props.maxPosts || 5} />;
    }

    case 'KontaktSection': {
      // Dynamically import the component (server component)
      const { default: KontaktSection } = await import('@/app/components/KontaktSection');

      return (
        <div
          className={`custom-component-block kontakt-section block-${blockId}`}
          data-block-id={blockId}
        >
          <KontaktSection columns={props.columns || 3} />
        </div>
      );
    }

    case 'StyrelseSection': {
      // Dynamically import the component (server component)
      const { default: StyrelseSection } = await import('@/app/components/StyrelseSection');

      return (
        <div
          className={`custom-component-block styrelse-section block-${blockId}`}
          data-block-id={blockId}
        >
          <StyrelseSection columns={props.columns || 3} />
        </div>
      );
    }

    case 'PartnerSection': {
      // Dynamically import the component (server component)
      const { default: PartnerSection } = await import('@/app/components/PartnerSection');

      return (
        <div
          className={`custom-component-block partner-section block-${blockId}`}
          data-block-id={blockId}
        >
          <PartnerSection />
        </div>
      );
    }

    case 'PartnersIAffarsnatverket': {
      // Dynamically import the component (server component)
      const { default: PartnersIAffarsnatverket } = await import('@/app/components/PartnersIAffarsnatverket');

      return (
        <div
          className={`custom-component-block partners-affarsnatverket block-${blockId}`}
          data-block-id={blockId}
        >
          <PartnersIAffarsnatverket />
        </div>
      );
    }

    case 'Partnerpaket': {
      // Dynamically import the component (server component)
      const { default: Partnerpaket } = await import('@/app/components/Partnerpaket');

      return (
        <div
          className={`custom-component-block partnerpaket block-${blockId}`}
          data-block-id={blockId}
        >
          <Partnerpaket />
        </div>
      );
    }

    case 'PartnernivaerComponent': {
      // Dynamically import the component (server component)
      const { default: PartnernivaerComponent } = await import('@/app/components/PartnernivaerComponent');

      return (
        <div
          className={`custom-component-block partnernivaer block-${blockId}`}
          data-block-id={blockId}
        >
          <PartnernivaerComponent />
        </div>
      );
    }

    case 'PartnerpaketAffarsnatverk': {
      // Dynamically import the component (server component)
      const { default: PartnerpaketAffarsnatverk } = await import('@/app/components/PartnerpaketAffarsnatverk');

      return (
        <div
          className={`custom-component-block partnerpaket-affarsnatverk block-${blockId}`}
          data-block-id={blockId}
        >
          <PartnerpaketAffarsnatverk />
        </div>
      );
    }

    case 'PartnerpaketPrivatloge': {
      // Dynamically import the component (server component)
      const { default: PartnerpaketPrivatloge } = await import('@/app/components/PartnerpaketPrivatloge');

      return (
        <div
          className={`custom-component-block partnerpaket-privatloge block-${blockId}`}
          data-block-id={blockId}
        >
          <PartnerpaketPrivatloge />
        </div>
      );
    }

    case 'PartnerpaketStigsvensson': {
      // Dynamically import the component (server component)
      const { default: PartnerpaketStigsvensson } = await import('@/app/components/PartnerpaketStigsvensson');

      return (
        <div
          className={`custom-component-block partnerpaket-stigsvensson block-${blockId}`}
          data-block-id={blockId}
        >
          <PartnerpaketStigsvensson />
        </div>
      );
    }

    case 'PartnerpaketOsterisamhallet': {
      // Dynamically import the component (server component)
      const { default: PartnerpaketOsterisamhallet } = await import('@/app/components/PartnerpaketOsterisamhallet');

      return (
        <div
          className={`custom-component-block partnerpaket-osterisamhallet block-${blockId}`}
          data-block-id={blockId}
        >
          <PartnerpaketOsterisamhallet />
        </div>
      );
    }

    case 'HuvudpartnerComponentFooter': {
      // Dynamically import the component (server component)
      const { default: HuvudpartnerComponentFooter } = await import('@/app/components/HuvudpartnerComponentFooter');

      return (
        <div
          className={`custom-component-block huvudpartner-footer block-${blockId}`}
          data-block-id={blockId}
        >
          <HuvudpartnerComponentFooter />
        </div>
      );
    }

    default:
      console.warn(`⚠️ Unknown custom component: ${componentName}`);
      console.warn('Available components: SenastSpeladeMatcher, TabellBlock, SenasteNyheter, LatestNewsBlock, HistoriaPostsComponent, KommandeMatcher, UpcomingMatchesBlock, HeroSlider, KontaktSection, StyrelseSection, PartnerSection, PartnersIAffarsnatverket, Partnerpaket, PartnernivaerComponent, PartnerpaketAffarsnatverk, PartnerpaketPrivatloge, PartnerpaketStigsvensson, PartnerpaketOsterisamhallet, HuvudpartnerComponentFooter');
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
