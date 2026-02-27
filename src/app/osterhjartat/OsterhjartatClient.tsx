'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

const AUTH_COOKIE_NAME = 'osterhjartat_auth';
const DEMO_PASSWORD = 'oster2025';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

function setCookie(name: string, value: string, days: number = 7) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/`;
}

const faqItems = [
  {
    question: 'Hur fungerar registreringen?',
    answer:
      'Du registrerar dig med namn och e-post, fyller sedan i dina kortuppgifter via vår säkra betalpartner Stripe. När registreringen är klar får du ett bekräftelsemail.',
  },
  {
    question: 'Hur uppdaterar jag mina kortuppgifter?',
    answer:
      'Skriv in din e-postadress så skickar vi ett mail med en länk där du kan uppdatera dina kortuppgifter. När ändringen är genomförd får du ett bekräftelsemail.',
  },
  {
    question: 'Jag vill säga upp Österhjärtat',
    answer:
      'Skriv in din e-postadress så skickar vi ett mail med en avregistreringslänk. Klicka på länken i mailet för att bekräfta avregistreringen. Du får sedan ett bekräftelsemail när avregistreringen är genomförd.',
  },
  {
    question: 'När dras pengarna?',
    answer:
      'Pengarna dras automatiskt från ditt kort inom några dagar efter att Östers IF har vunnit en match.',
  },
  {
    question: 'Är det säkert?',
    answer:
      'Ja, alla kortuppgifter hanteras av Stripe som är en av världens ledande betaltjänster. Vi sparar aldrig dina kortuppgifter på våra servrar.',
  },
];

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-white/10">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-5 flex justify-between items-center text-left"
      >
        <span className="text-lg font-medium text-white">{question}</span>
        <span className={`text-white/60 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      {isOpen && (
        <div className="pb-5">
          <p className="text-white/70">{answer}</p>
        </div>
      )}
    </div>
  );
}

function RegistrationModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/osterhjartat/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError('Något gick fel. Försök igen.');
        setIsSubmitting(false);
      }
    } catch {
      setError('Något gick fel. Försök igen.');
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#500100] rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-2xl font-bold text-white mb-2 font-heading">Bli en del av Österhjärtat</h2>
        <p className="text-white/60 mb-6">Fyll i dina uppgifter för att fortsätta till betalning.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reg-name" className="block text-sm font-medium text-white/80 mb-2">
              Namn
            </label>
            <input
              type="text"
              id="reg-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-[#1e0101] border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
              placeholder="Ditt namn"
            />
          </div>
          <div>
            <label htmlFor="reg-email" className="block text-sm font-medium text-white/80 mb-2">
              E-postadress
            </label>
            <input
              type="email"
              id="reg-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-[#1e0101] border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
              placeholder="din@email.se"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 bg-white hover:bg-white/90 text-[#1e0101] font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-[#1e0101]"></div>
                Laddar...
              </>
            ) : (
              'Fortsätt till betalning'
            )}
          </button>

          <p className="text-white/40 text-xs text-center">
            Kortuppgifter hanteras säkert av Stripe
          </p>
        </form>
      </div>
    </div>
  );
}

function ManageModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [email, setEmail] = useState('');
  const [action, setAction] = useState<'update' | 'unsubscribe'>('update');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/osterhjartat/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, action }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        setEmail('');
      } else {
        setError(data.error || 'Något gick fel. Försök igen.');
      }
    } catch {
      setError('Något gick fel. Försök igen.');
    }

    setIsSubmitting(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#500100] rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-2xl font-bold text-white mb-2 font-heading">Hantera medlemskap</h2>
        <p className="text-white/60 mb-6">Skriv in din e-postadress så skickar vi en länk.</p>

        {message ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-[#c52814] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-white mb-4">{message}</p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
            >
              Stäng
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="manage-email" className="block text-sm font-medium text-white/80 mb-2">
                E-postadress
              </label>
              <input
                type="email"
                id="manage-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-[#1e0101] border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                placeholder="din@email.se"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Vad vill du göra?</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setAction('update')}
                  className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                    action === 'update'
                      ? 'bg-white text-[#1e0101]'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  Uppdatera kort
                </button>
                <button
                  type="button"
                  onClick={() => setAction('unsubscribe')}
                  className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                    action === 'unsubscribe'
                      ? 'bg-white text-[#1e0101]'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  Avregistrera
                </button>
              </div>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-white hover:bg-white/90 text-[#1e0101] font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-[#1e0101]"></div>
                  Skickar...
                </>
              ) : (
                'Skicka länk'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function OsterhjartatClient() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showCancelledMessage, setShowCancelledMessage] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const authCookie = getCookie(AUTH_COOKIE_NAME);
    if (authCookie === 'authenticated') {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  // Check for cancelled checkout
  useEffect(() => {
    if (searchParams.get('avbruten') === 'true') {
      setShowCancelledMessage(true);
      // Clear the URL parameter
      router.replace('/osterhjartat', { scroll: false });
    }
  }, [searchParams, router]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === DEMO_PASSWORD) {
      setCookie(AUTH_COOKIE_NAME, 'authenticated', 7);
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Fel lösenord');
    }
  };

  const handleLogout = () => {
    document.cookie = `${AUTH_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    setIsAuthenticated(false);
    setPassword('');
  };

  const openRegistration = () => {
    setShowRegistrationModal(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1e0101] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#1e0101] flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2 font-heading">Österhjärtat</h1>
            <p className="text-white/60">Logga in för att fortsätta</p>
          </div>
          <div className="bg-[#500100] border border-white/10 rounded-2xl p-8 shadow-2xl">
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-white/80 mb-2">
                  Lösenord
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#1e0101] border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                  placeholder="Ange lösenord"
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                type="submit"
                className="w-full py-3 px-4 bg-white hover:bg-white/90 text-[#1e0101] font-semibold rounded-xl transition-colors"
              >
                Logga in
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated content
  return (
    <div className="min-h-screen bg-[#1e0101]">
      {/* Cancelled Checkout Message */}
      {showCancelledMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-full mx-4">
          <div className="bg-[#500100] border border-white/20 rounded-xl p-4 shadow-2xl flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-white font-medium">Registreringen avbröts</p>
              <p className="text-white/60 text-sm">Du kan försöka igen när du vill.</p>
            </div>
            <button
              onClick={() => setShowCancelledMessage(false)}
              className="flex-shrink-0 text-white/60 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Registration Modal */}
      <RegistrationModal
        isOpen={showRegistrationModal}
        onClose={() => setShowRegistrationModal(false)}
      />

      {/* Manage Modal */}
      <ManageModal
        isOpen={showManageModal}
        onClose={() => setShowManageModal(false)}
      />

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 px-4 min-h-[80vh] flex items-center">
        <div className="absolute inset-0">
          <img
            src="/1770109672962-sjwc5x7l71.png"
            alt="Östers IF fans"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#1e0101]/80 via-[#1e0101]/60 to-[#1e0101]"></div>
        </div>
        <div className="relative max-w-6xl mx-auto text-center w-full">
          <div className="flex justify-end mb-4">
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-white/60 hover:text-white transition-colors"
            >
              Logga ut
            </button>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 font-heading">
            Välkommen till Österhjärtat
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto mb-6">
            Stötta Östers IF på ett unikt sätt. Varje gång laget vinner dras en slant från ditt kort.
          </p>
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full pl-5 pr-2 py-2">
            <span className="text-white/70 text-sm">Endast</span>
            <span className="text-xl font-bold text-white font-heading">96 kr</span>
            <span className="text-white/70 text-sm">per vinst</span>
            <button
              onClick={openRegistration}
              className="px-5 py-2 bg-white hover:bg-white/90 text-[#1e0101] font-semibold rounded-full text-sm transition-all"
            >
              Registrera dig
            </button>
          </div>
        </div>
      </div>

      {/* How it works section */}
      <div className="py-20 px-4 bg-[#1e0101]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4 font-heading">
            Så fungerar det
          </h2>
          <p className="text-white/60 text-center mb-12 max-w-2xl mx-auto">
            Tre enkla steg för att bli en del av Österhjärtat
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-[#500100] rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-[#c52814] rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl font-bold text-[#1e0101] font-heading">1</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3 font-heading">Registrera dig</h3>
              <p className="text-white/70">
                Skapa ett konto och registrera ditt kort för automatiska betalningar.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-[#500100] rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-[#c52814] rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl font-bold text-[#1e0101] font-heading">2</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3 font-heading">Öster vinner</h3>
              <p className="text-white/70">
                Följ laget och heja på dem. När Öster vinner aktiveras din donation.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-[#500100] rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-[#c52814] rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl font-bold text-[#1e0101] font-heading">3</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3 font-heading">Automatisk betalning</h3>
              <p className="text-white/70">96 kr dras automatiskt från ditt kort. Enkelt och smidigt.</p>
            </div>
          </div>

          <div className="text-center mt-12">
            <button
              onClick={openRegistration}
              className="px-8 py-4 bg-white hover:bg-white/90 text-[#1e0101] font-semibold rounded-full text-lg transition-all transform hover:scale-105"
            >
              Kom igång
            </button>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="py-20 px-4 bg-[#500100]/20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12 font-heading">
            Vanliga frågor
          </h2>
          <div>
            {faqItems.map((item, index) => (
              <FAQItem key={index} question={item.question} answer={item.answer} />
            ))}
          </div>
        </div>
      </div>

      {/* Manage Section */}
      <div className="py-12 px-4 bg-[#1e0101]">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-white/60 mb-4">
            Redan medlem? Uppdatera kortuppgifter eller avregistrera dig.
          </p>
          <button
            onClick={() => setShowManageModal(true)}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-full transition-all"
          >
            Hantera medlemskap
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-white/10">
        <div className="max-w-6xl mx-auto text-center text-white/40 text-sm">
          <p>Detta är en demo av Österhjärtat-konceptet för Östers IF</p>
        </div>
      </footer>
    </div>
  );
}
