/**
 * Form Component - Stub
 *
 * Placeholder for Frontspace CMS form renderer
 */

'use client'

import React from 'react'

interface FormComponentProps {
  form: any
}

export function FormComponent({ form }: FormComponentProps) {
  return (
    <div className="w-full p-8 border border-gray-300 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">
        {form?.title || 'Form'}
      </h3>
      <p className="text-gray-500 text-sm">
        Form component placeholder
      </p>
    </div>
  )
}
