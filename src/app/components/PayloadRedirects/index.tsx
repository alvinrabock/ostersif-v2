import type React from 'react'
import { notFound, redirect } from 'next/navigation'

import type { Page, Post } from '@/types'
import { getCachedRedirects } from '@/utils/getRedirects'
import { getCachedDocument } from '@/utils/getDocument'

interface Props {
  disableNotFound?: boolean
  url: string
}

// Define the correct type for redirect items
interface Redirect {
  from: string
  to?: {
    url?: string
    reference?: {
      value: string | { slug: string }
      relationTo: string
    }
  }
}

/* This component helps us with SSR based dynamic redirects */
export const PayloadRedirects: React.FC<Props> = async ({ disableNotFound, url }) => {
  const redirects: Redirect[] = await getCachedRedirects()

  const redirectItem = redirects.find((redirect) => redirect.from === url)

  if (redirectItem) {
    if (redirectItem.to?.url) {
      redirect(redirectItem.to.url)
    }

    let redirectUrl: string

    if (typeof redirectItem.to?.reference?.value === 'string') {
      const collection = redirectItem.to?.reference?.relationTo

      // Correctly await the result of getCachedDocument
      const documentFetcher = await getCachedDocument(collection)
      const document = (await documentFetcher()) as Page | Post

      redirectUrl = `${redirectItem.to?.reference?.relationTo !== 'pages' ? `/${redirectItem.to?.reference?.relationTo}` : ''}/${
        document?.slug
      }`
    } else {
      redirectUrl = `${redirectItem.to?.reference?.relationTo !== 'pages' ? `/${redirectItem.to?.reference?.relationTo}` : ''}/${
        typeof redirectItem.to?.reference?.value === 'object'
          ? redirectItem.to?.reference?.value?.slug
          : ''
      }`
    }

    if (redirectUrl) {
      redirect(redirectUrl)
    }
  }

  if (disableNotFound) return null

  notFound()
}
