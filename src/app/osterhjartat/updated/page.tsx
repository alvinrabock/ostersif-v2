import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Kortuppgifter uppdaterade - Österhjärtat',
  robots: {
    index: false,
    follow: false,
  },
};

export default function UpdatedPage() {
  return (
    <div className="min-h-screen bg-[#1e0101] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 bg-[#c52814] rounded-full flex items-center justify-center mx-auto mb-8">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-white mb-4 font-heading">
          Kortuppgifter uppdaterade!
        </h1>
        <p className="text-white/70 mb-8">
          Dina nya kortuppgifter har sparats. Nästa gång Östers IF vinner kommer beloppet att dras från ditt nya kort.
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
