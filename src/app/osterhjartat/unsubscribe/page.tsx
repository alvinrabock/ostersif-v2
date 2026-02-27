import type { Metadata } from 'next';
import UnsubscribeClient from './UnsubscribeClient';

export const metadata: Metadata = {
  title: 'Avregistrera - Österhjärtat',
  robots: {
    index: false,
    follow: false,
  },
};

export default function UnsubscribePage() {
  return <UnsubscribeClient />;
}
