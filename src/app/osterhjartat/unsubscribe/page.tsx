import type { Metadata } from 'next';
import { Suspense } from 'react';
import UnsubscribeClient from './UnsubscribeClient';

export const metadata: Metadata = {
  title: 'Avregistrera - Österhjärtat',
  robots: {
    index: false,
    follow: false,
  },
};

function LoadingState() {
  return (
    <div className="min-h-screen bg-[#1e0101] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <UnsubscribeClient />
    </Suspense>
  );
}
