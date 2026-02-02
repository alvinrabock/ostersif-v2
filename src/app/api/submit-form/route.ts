import { NextRequest, NextResponse } from 'next/server'

const FRONTSPACE_ENDPOINT = process.env.FRONTSPACE_ENDPOINT || 'http://localhost:3000/api/graphql'
const FRONTSPACE_STORE_ID = process.env.FRONTSPACE_STORE_ID || ''
const FRONTSPACE_API_KEY = process.env.FRONTSPACE_API_KEY

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { storeId, formId, formData } = body

    // Use storeId from request body or fall back to env
    const actualStoreId = storeId || FRONTSPACE_STORE_ID

    if (!actualStoreId) {
      return NextResponse.json(
        { error: 'Store ID is required' },
        { status: 400 }
      )
    }

    if (!formId) {
      return NextResponse.json(
        { error: 'Form ID is required' },
        { status: 400 }
      )
    }

    // Get user agent for tracking
    const userAgent = request.headers.get('user-agent') || undefined

    // GraphQL mutation for form submission
    const mutation = `
      mutation SubmitForm($storeId: String!, $formId: String!, $formData: JSON!, $userAgent: String) {
        submitForm(storeId: $storeId, formId: $formId, formData: $formData, userAgent: $userAgent) {
          success
          message
        }
      }
    `

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-store-id': actualStoreId,
    }

    if (FRONTSPACE_API_KEY) {
      headers['Authorization'] = `Bearer ${FRONTSPACE_API_KEY}`
    }

    const response = await fetch(FRONTSPACE_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: mutation,
        variables: {
          storeId: actualStoreId,
          formId,
          formData,
          userAgent
        }
      })
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('GraphQL form submission error:', result)
      return NextResponse.json(
        { error: result.errors?.[0]?.message || 'Form submission failed' },
        { status: response.status }
      )
    }

    if (result.errors) {
      console.error('GraphQL errors:', result.errors)
      return NextResponse.json(
        { error: result.errors[0]?.message || 'Form submission failed' },
        { status: 400 }
      )
    }

    const submitResult = result.data?.submitForm

    if (!submitResult?.success) {
      return NextResponse.json(
        { error: submitResult?.message || 'Form submission failed' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: submitResult.message || 'Form submitted successfully'
    })
  } catch (error) {
    console.error('Error submitting form:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
