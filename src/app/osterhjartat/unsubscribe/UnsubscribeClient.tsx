'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function UnsubscribeClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'confirm' | 'success' | 'error'>('loading');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Ogiltig länk. Vänligen begär en ny avregistreringslänk.');
    } else {
      setStatus('confirm');
    }
  }, [token]);

  const handleUnsubscribe = async () => {
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/osterhjartat/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
      } else {
        setStatus('error');
        setErrorMessage(data.error || 'Något gick fel. Försök igen.');
      }
    } catch {
      setStatus('error');
      setErrorMessage('Något gick fel. Försök igen.');
    }

    setIsSubmitting(false);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#1e0101] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-[#1e0101] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-[#c52814] rounded-full flex items-center justify-center mx-auto mb-8">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4 font-heading">
            Avregistrering genomförd
          </h1>
          <p className="text-white/70 mb-8">
            Du är nu avregistrerad från Österhjärtat. Vi hoppas att vi ses igen!
          </p>
          <Link
            href="/osterhjartat"
            className="inline-block px-8 py-4 bg-white hover:bg-white/90 text-[#1e0101] font-semibold rounded-full transition-all"
          >
            Tillbaka till Österhjärtat
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-[#1e0101] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4 font-heading">
            Något gick fel
          </h1>
          <p className="text-white/70 mb-8">{errorMessage}</p>
          <Link
            href="/osterhjartat"
            className="inline-block px-8 py-4 bg-white hover:bg-white/90 text-[#1e0101] font-semibold rounded-full transition-all"
          >
            Tillbaka till Österhjärtat
          </Link>
        </div>
      </div>
    );
  }

  // Confirm state
  return (
    <div className="min-h-screen bg-[#1e0101] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 bg-[#500100] rounded-full flex items-center justify-center mx-auto mb-8">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-white mb-4 font-heading">
          Avregistrera från Österhjärtat?
        </h1>
        <p className="text-white/70 mb-8">
          Är du säker på att du vill avsluta ditt medlemskap? Du kommer inte längre att bidra till Östers IF när laget vinner.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/osterhjartat"
            className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-full transition-all"
          >
            Avbryt
          </Link>
          <button
            onClick={handleUnsubscribe}
            disabled={isSubmitting}
            className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                Avregistrerar...
              </>
            ) : (
              'Ja, avregistrera mig'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
