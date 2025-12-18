import PageTemplate, { generateMetadata } from './[slug]/page'

// Cache homepage for 60 seconds, revalidated on-demand via webhook
export const revalidate = 60;

export default PageTemplate

export { generateMetadata }