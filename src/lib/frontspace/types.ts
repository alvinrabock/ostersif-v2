/**
 * Frontspace CMS Type Definitions
 * These types match the Frontspace post types for Östers IF
 */

// Base post interface that all posts extend
export interface FrontspacePost {
  id: string;
  slug: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  status: 'draft' | 'published' | 'archived';
}

// Media/Image type
export interface FrontspaceMedia {
  id: string;
  url: string;
  alt?: string;
  width?: number;
  height?: number;
  mimeType?: string;
  fileSize?: number;
}

// Rich text/content field
export interface RichTextContent {
  type: string;
  children?: any[];
  [key: string]: any;
}

/**
 * Personal (Staff/Team members)
 */
export interface Personal extends FrontspacePost {
  namn: string;
  befattning?: string;
  avdelning?: Personalavdelningar;
  bild?: FrontspaceMedia;
  telefon?: string;
  epost?: string;
  beskrivning?: RichTextContent[];
  visaPaHemsida?: boolean;
}

/**
 * Personalavdelningar (Staff departments)
 */
export interface Personalavdelningar extends FrontspacePost {
  namn: string;
  beskrivning?: string;
  ordning?: number;
}

/**
 * Lag (Teams)
 */
export interface Lag extends FrontspacePost {
  namn: string;
  argang?: string;
  kon?: 'herr' | 'dam';
  liga?: string;
  lagbild?: FrontspaceMedia;
  truppbild?: FrontspaceMedia;
  beskrivning?: RichTextContent[];
  matcher?: any[]; // Reference to matches if stored in Frontspace
  spelare?: any[]; // Players
  ledare?: Personal[];
}

/**
 * Partners
 */
export interface Partner extends FrontspacePost {
  namn: string;
  logotyp?: FrontspaceMedia;
  beskrivning?: RichTextContent[];
  webbplats?: string;
  partnerniva?: Partnerniva;
  paket?: Partnerpaket[];
  visaPaHemsida?: boolean;
  ordning?: number;
}

/**
 * Partnerpaket (Partner packages)
 */
export interface Partnerpaket extends FrontspacePost {
  namn: string;
  beskrivning?: RichTextContent[];
  pris?: number;
  kategori?: PartnerpaketKategori;
  fordeler?: string[];
  visaPaHemsida?: boolean;
}

/**
 * Partnerpaket-kategorier (Partner package categories)
 */
export interface PartnerpaketKategori extends FrontspacePost {
  namn: string;
  beskrivning?: string;
  ordning?: number;
}

/**
 * Partnernivaer (Partner levels)
 */
export interface Partnerniva extends FrontspacePost {
  namn: string;
  beskrivning?: string;
  farg?: string; // Hex color code
  ordning?: number;
  logotypStorlek?: 'liten' | 'mellan' | 'stor';
}

/**
 * Dokument (Documents)
 */
export interface Dokument extends FrontspacePost {
  namn: string;
  fil?: FrontspaceMedia;
  kategori?: Dokumentkategori;
  beskrivning?: string;
  visaPaHemsida?: boolean;
  datum?: string;
}

/**
 * Nyheter (News/Posts)
 */
export interface Nyhet extends FrontspacePost {
  rubrik: string;
  ingress?: string;
  innehall?: RichTextContent[];
  huvudbild?: FrontspaceMedia;
  galleri?: FrontspaceMedia[];
  kategorier?: Nyhetskategori[];
  forfatta re?: Personal;
  publi ceringsdatum?: string;
  fastPost?: boolean; // Pinned post
  visaPaHemsida?: boolean;
}

/**
 * Nyhetskategorier (News categories)
 */
export interface Nyhetskategori extends FrontspacePost {
  namn: string;
  beskrivning?: string;
  farg?: string; // Hex color code
  ordning?: number;
}

/**
 * Jobb (Job listings)
 */
export interface Jobb extends FrontspacePost {
  titel: string;
  beskrivning?: RichTextContent[];
  ansokningslank?: string;
  sista AnsokningsDatum?: string;
  anstallningsTyp?: 'heltid' | 'deltid' | 'projekt' | 'praktik';
  plats?: string;
  avdelning?: Personalavdelningar;
  visaPaHemsida?: boolean;
}

/**
 * Dokumentkategorier (Document categories)
 */
export interface Dokumentkategori extends FrontspacePost {
  namn: string;
  beskrivning?: string;
  ordning?: number;
}

/**
 * Pages (Sidor)
 */
export interface Sida extends FrontspacePost {
  titel: string;
  hero?: {
    type: 'none' | 'fullscreenSlider' | 'highImpact' | 'mediumImpact' | 'lowImpact' | 'columnLayout' | 'default';
    richText?: RichTextContent[];
    links?: Array<{
      link: {
        type?: 'reference' | 'custom';
        newTab?: boolean;
        url?: string;
        label: string;
        appearance?: 'default' | 'outline';
      };
      id?: string;
    }>;
    media?: FrontspaceMedia;
  };
  layout?: any[]; // Content blocks
  meta?: {
    title?: string;
    description?: string;
    image?: FrontspaceMedia;
  };
}

/**
 * Block types for BlockRenderer
 */
export interface PageBlock {
  id: string;
  type: string;
  content: any;
  styles?: Record<string, any>;
  responsiveStyles?: Record<string, Record<string, any>>;
}

export interface TemplateContent {
  blocks: PageBlock[];
}

/**
 * Footer template from Frontspace CMS
 */
export interface FooterSettings {
  background?: string;
  padding?: string;
}

export interface Conditions {
  visibility?: string;
  pages?: string[];
  pageTypes?: string[];
  devices?: string[];
}

export interface Footer {
  id: string;
  name: string;
  content: TemplateContent;
  footerSettings?: FooterSettings;
  conditions?: Conditions;
}

/**
 * API Response types
 */
export interface FrontspaceListResponse<T> {
  posts: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface FrontspaceSingleResponse<T> {
  post: T;
}
