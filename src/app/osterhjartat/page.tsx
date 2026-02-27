import type { Metadata } from 'next';
import OsterhjartatClient from './OsterhjartatClient';

export const metadata: Metadata = {
  title: 'Österhjärtat - Östers IF',
  description: 'Stötta Östers IF på ett unikt sätt med Österhjärtat.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function OsterhjartatPage() {
  return <OsterhjartatClient />;
}
