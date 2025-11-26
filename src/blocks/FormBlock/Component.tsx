/**
 * Form Block Component
 *
 * Renders Frontspace CMS forms
 * Fetches form data from API and displays using FormComponent
 */

import React from 'react'
import { frontspace } from '@/lib/frontspace/client'
import { FormComponent } from '@/app/components/FormComponent'

export interface Block {
  id: string
  type: string
  content: any
  styles?: Record<string, any>
  responsiveStyles?: Record<string, Record<string, any>>
}

interface FormBlockProps {
  block: Block
  blockId: string
}

export default async function FormBlock({ block, blockId }: FormBlockProps) {
  const content = block.content || {}
  const formId = content.selectedFormId

  // If no form selected, return null
  if (!formId) {
    return null
  }

  try {
    // Fetch the form from API
    const form = await frontspace.forms.getById(formId)

    // If form not found or not active, return null
    if (!form || form.status !== 'active') {
      return null
    }

    return (
      <div
        className={`form-block block-${blockId}`}
        data-block-id={blockId}
      >
        <FormComponent
          form={form}
          className={`block-${blockId}`}
          submitButtonColor={content.submitButtonColor}
          submitButtonTextColor={content.submitButtonTextColor}
        />
      </div>
    )
  } catch (error) {
    // Silently fail - form doesn't exist or backend error
    // This prevents pages with broken forms from crashing
    console.error('Error loading form:', error)
    return null
  }
}
