import { MediaBlock } from '@/blocks/MediaBlock/Component'
import {
  DefaultNodeTypes,
  SerializedBlockNode,
  SerializedLinkNode,
  type DefaultTypedEditorState,
} from '@payloadcms/richtext-lexical'
import {
  JSXConvertersFunction,
  LinkJSXConverter,
  RichText as ConvertRichText,
} from '@payloadcms/richtext-lexical/react'

import { CodeBlock, CodeBlockProps } from '@/blocks/Code/Component'

import type {
  BannerBlock as BannerBlockProps,
  CallToActionBlock as CTABlockProps,
  MediaBlock as MediaBlockProps,
  MatchPickerBlock as MatchPickerBlockProps,
  VideoBlock as VideoBlockProps,
  ButtonBlock as ButtonBlockProps,
  IconListBlock as IconListBlockType,
  ImageGalleryBlock as ImageGalleryBlockType
} from '@/types'

import { BannerBlock } from '@/blocks/Banner/Component'
import { CallToActionBlock } from '@/blocks/CallToAction/Component'
import { cn } from '@/lib/utils'
import { VideoBlockComponent } from '@/blocks/VideoBlock/Component'
import { MatchPickerBlock } from '@/blocks/matchPickerBlock/Component'
import { ButtonBlock } from '@/blocks/ButtonBlock/Component'
import { IconListBlock } from '@/blocks/ListIconBlock/Component'
import { ImageGalleryBlockComponent } from '@/blocks/ImageGalleryBlockComponent/Component'

type NodeTypes =
  | DefaultNodeTypes
  | SerializedBlockNode<CTABlockProps | MediaBlockProps | BannerBlockProps | CodeBlockProps | MatchPickerBlockProps | VideoBlockProps | ButtonBlockProps | IconListBlockType | ImageGalleryBlockType>

// Correct function signature for internalDocToHref
const internalDocToHref = ({ linkNode }: { linkNode: SerializedLinkNode }) => {
  console.log('internalDocToHref called with linkNode:', linkNode);
  
  // Handle case where doc field is missing
  if (!linkNode.fields.doc) {
    console.warn('Link node missing doc field:', linkNode);
    return '/';
  }

  const { value, relationTo } = linkNode.fields.doc;
  
  // Handle case where value is not an object
  if (typeof value !== 'object' || !value) {
    console.warn('Expected value to be an object, got:', typeof value, value);
    return '/';
  }

  const slug = value.slug;
  console.log(`Processing ${relationTo} with slug: ${slug}`);

  // Handle different collection types
  switch (relationTo) {
    case 'pages':
      return slug === 'home' ? '/' : `/${slug}`;
    case 'posts':
      return `/blog/${slug}`;
    case 'products':  
      return `/products/${slug}`;
    case 'categories':
      return `/categories/${slug}`;
    default:
      console.warn(`Unknown relationTo: ${relationTo}`);
      return slug ? `/${slug}` : '/';
  }
}

const jsxConverters: JSXConvertersFunction<NodeTypes> = ({ defaultConverters }) => ({
  ...defaultConverters,
  ...LinkJSXConverter({ internalDocToHref }), // This is the key line!
  blocks: {
    banner: ({ node }) => <BannerBlock className="col-start-2 mb-4" {...node.fields} />,
    mediaBlock: ({ node }) => (
      <MediaBlock
        {...node.fields}
        captionClassName="mx-auto max-w-[48rem]"
        className="w-full max-w-full overflow-hidden" 
        imgClassName="w-full h-auto max-w-full object-cover" 
      />
    ),
    code: ({ node }) => <CodeBlock className="col-start-2" {...node.fields} />,
    cta: ({ node }) => <CallToActionBlock {...node.fields} />,
    matchPickerBlock: ({ node }) => <MatchPickerBlock {...node.fields} />,
    videoBlock: ({ node }) => <VideoBlockComponent {...node.fields} />,
    ButtonBlock: ({ node }) => <ButtonBlock {...node.fields} />,
    iconListBlock: ({ node }) => <IconListBlock {...node.fields} />,
    imageGalleryBlock: ({ node }) => <ImageGalleryBlockComponent {...node.fields} />,
  },
})

type Props = {
  data: DefaultTypedEditorState
  enableGutter?: boolean
  enableProse?: boolean
} & React.HTMLAttributes<HTMLDivElement>

export default function RichText(props: Props) {
  const { className, enableProse = true, enableGutter = true, ...rest } = props
  
  return (
    <ConvertRichText
      converters={jsxConverters}
      className={cn(
        'payload-richtext text-white [&_*]:text-white', 
        {
          container: enableGutter,
          'max-w-none': !enableGutter,
          'mx-auto prose md:prose-md': enableProse,
        },
        className,
      )}
      {...rest}
    />  
  )
}