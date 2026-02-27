import type { Metadata } from 'next';
import { Suspense } from 'react';
import OsterhjartatClient from './OsterhjartatClient';

export const metadata: Metadata = {
  title: 'Österhjärtat - Östers IF',
  description: 'Stötta Östers IF på ett unikt sätt med Österhjärtat.',
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

export default function OsterhjartatPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <OsterhjartatClient />
    </Suspense>
  );
}
