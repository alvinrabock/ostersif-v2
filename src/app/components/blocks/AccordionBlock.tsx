'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface AccordionItem {
  id: string;
  title: string;
  content: string;
}

interface AccordionBlockProps {
  block: {
    id: string;
    content: {
      items?: AccordionItem[];
      dividerColor?: string;
      titleBackgroundColor?: string;
      titleHoverBackgroundColor?: string;
      titleTextColor?: string;
      contentBackgroundColor?: string;
      contentTextColor?: string;
      iconColor?: string;
      contentLinkColor?: string;
    };
    styles?: Record<string, string>;
  };
  blockId: string;
}

export default function AccordionBlock({ block, blockId }: AccordionBlockProps) {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const { content, styles = {} } = block;

  const toggleItem = (itemId: string) => {
    setOpenItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const items = content.items || [];
  const {
    dividerColor,
    titleBackgroundColor,
    titleHoverBackgroundColor,
    titleTextColor,
    contentBackgroundColor,
    contentTextColor,
    iconColor,
    contentLinkColor,
  } = content;

  // Generate unique class for hover styles
  const accordionId = `accordion-${block.id.replace(/-/g, '')}`;

  // Build dynamic styles for the button and content links
  const buildDynamicStyles = () => `
    .${accordionId}-btn {
      ${titleBackgroundColor ? `background-color: ${titleBackgroundColor};` : ''}
      ${titleTextColor ? `color: ${titleTextColor};` : ''}
    }
    ${titleHoverBackgroundColor ? `
    .${accordionId}-btn:hover {
      background-color: ${titleHoverBackgroundColor} !important;
    }
    ` : ''}
    ${contentLinkColor ? `
    .${accordionId}-content a {
      color: ${contentLinkColor} !important;
    }
    .${accordionId}-content a:hover {
      opacity: 0.8;
    }
    ` : ''}
  `;

  return (
    <>
      {/* Inject dynamic styles */}
      <style dangerouslySetInnerHTML={{ __html: buildDynamicStyles() }} />

      <div className={`accordion-block block-${blockId} flex flex-col gap-2`}>
        {items.map((item, index) => {
          const isOpen = openItems.has(item.id);
          const isLast = index === items.length - 1;

          return (
            <div
              key={item.id}
              style={dividerColor && !isLast ? {
                borderBottomWidth: '1px',
                borderBottomStyle: 'solid',
                borderBottomColor: dividerColor
              } : undefined}
            >
              {/* Title Button */}
              <button
                onClick={() => toggleItem(item.id)}
                aria-expanded={isOpen}
                aria-controls={`accordion-content-${item.id}`}
                className={`${accordionId}-btn w-full flex items-center justify-between p-4 text-left transition-colors rounded-lg`}
              >
                <span className="font-medium">{item.title}</span>
                {isOpen ? (
                  <ChevronDown
                    className="h-5 w-5 flex-shrink-0 transition-transform ml-3"
                    style={iconColor ? { color: iconColor } : undefined}
                  />
                ) : (
                  <ChevronRight
                    className="h-5 w-5 flex-shrink-0 transition-transform ml-3"
                    style={iconColor ? { color: iconColor } : undefined}
                  />
                )}
              </button>

              {/* Content */}
              <div
                id={`accordion-content-${item.id}`}
                role="region"
                className="overflow-hidden transition-all duration-300 ease-in-out"
                style={{
                  maxHeight: isOpen ? '2000px' : '0px',
                  opacity: isOpen ? 1 : 0,
                  ...(contentBackgroundColor ? { backgroundColor: contentBackgroundColor } : {}),
                }}
              >
                <div
                  className={`${accordionId}-content p-4 prose prose-sm max-w-none [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_h3:first-child]:mt-0 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-3 [&_h4]:text-lg [&_h4]:font-medium [&_h4]:mt-3 [&_h4]:mb-2 [&_p]:text-base [&_p]:leading-relaxed [&_p]:mb-3 [&_strong]:font-semibold [&_ul]:mb-3 [&_ul]:pl-6 [&_ul]:list-disc [&_ol]:mb-3 [&_ol]:pl-6 [&_ol]:list-decimal [&_li]:mb-1 [&_a]:underline`}
                  style={contentTextColor ? { color: contentTextColor } : undefined}
                  dangerouslySetInnerHTML={{ __html: item.content }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
