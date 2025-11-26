'use client'

/**
 * Form Component - Client-side form with submission handling
 * Implements Frontspace Form Block with all field types and validation
 */

import { useState, FormEvent } from 'react'
import { Form as FormType } from '@/lib/frontspace/client'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'

interface FormComponentProps {
  form: FormType
  className?: string
  submitButtonColor?: string
  submitButtonTextColor?: string
}

export function FormComponent({
  form,
  className = '',
  submitButtonColor = '#0A0D26',
  submitButtonTextColor = '#ffffff'
}: FormComponentProps) {
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (fieldName: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch('/api/submit-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeId: process.env.NEXT_PUBLIC_FRONTSPACE_STORE_ID,
          formId: form.id,
          formData: formData
        })
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Form submission failed')
      }

      setSuccess(true)
      setFormData({}) // Reset form
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit form')
    } finally {
      setLoading(false)
    }
  }

  // Success state - show completion message
  if (success) {
    return (
      <div className={`p-8 bg-green-50 border border-green-200 rounded-xl ${className}`}>
        <div className="flex items-center gap-3 mb-3">
          <CheckCircle className="w-6 h-6 text-green-600" />
          <h3 className="text-lg font-semibold text-green-900">Tack!</h3>
        </div>
        <p className="text-green-700">
          Ditt formulär har skickats. Vi återkommer så snart som möjligt.
        </p>
      </div>
    )
  }

  const baseInputClasses = `
    w-full px-4 py-3 rounded-lg border border-gray-300
    focus:ring-2 focus:ring-blue-500 focus:border-transparent
    transition-all duration-200
    placeholder:text-gray-400
    disabled:bg-gray-50 disabled:cursor-not-allowed
  `

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
      {form.fields.map(field => {
        // Checkbox has different layout (label after input)
        if (field.type === 'checkbox') {
          return (
            <div key={field.name} className="flex items-start">
              <input
                id={field.name}
                type="checkbox"
                name={field.name}
                checked={formData[field.name] || false}
                onChange={(e) => handleChange(field.name, e.target.checked)}
                required={field.required}
                className="mt-1 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor={field.name} className="ml-3 text-gray-700">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
            </div>
          )
        }

        // Radio buttons
        if (field.type === 'radio') {
          return (
            <div key={field.name}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              <div className="space-y-3">
                {field.options?.map((option) => (
                  <div key={option} className="flex items-center">
                    <input
                      type="radio"
                      id={`${field.name}-${option}`}
                      name={field.name}
                      value={option}
                      checked={formData[field.name] === option}
                      onChange={(e) => handleChange(field.name, e.target.value)}
                      required={field.required}
                      className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <label
                      htmlFor={`${field.name}-${option}`}
                      className="ml-3 text-gray-700"
                    >
                      {option}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )
        }

        // All other field types (text, email, tel, textarea, select)
        return (
          <div key={field.name}>
            <label
              htmlFor={field.name}
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>

            {field.type === 'textarea' ? (
              <textarea
                id={field.name}
                name={field.name}
                placeholder={field.placeholder}
                required={field.required}
                value={formData[field.name] || ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
                rows={5}
                className={baseInputClasses}
              />
            ) : field.type === 'select' ? (
              <select
                id={field.name}
                name={field.name}
                required={field.required}
                value={formData[field.name] || ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
                className={baseInputClasses}
              >
                <option value="">Välj ett alternativ</option>
                {field.options?.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : (
              <input
                id={field.name}
                type={field.type}
                name={field.name}
                placeholder={field.placeholder}
                required={field.required}
                value={formData[field.name] || ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
                className={baseInputClasses}
              />
            )}
          </div>
        )
      })}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 px-6 rounded-lg font-semibold
                   focus:ring-4 focus:ring-blue-300
                   disabled:opacity-50 disabled:cursor-not-allowed
                   transition-all duration-200 flex items-center justify-center gap-2"
        style={{
          backgroundColor: loading ? '#9CA3AF' : submitButtonColor,
          color: submitButtonTextColor,
        }}
      >
        {loading && <Loader2 className="w-5 h-5 animate-spin" />}
        {loading ? 'Skickar...' : 'Skicka'}
      </button>
    </form>
  )
}
