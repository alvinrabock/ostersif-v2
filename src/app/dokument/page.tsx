import {
  fetchAllDokument,
  fetchAllDokumentkategorier,
  fetchDokumentByCategory,
  type FrontspaceDokument,
} from '@/lib/frontspace/adapters/dokument';
import Link from 'next/link';
import MaxWidthWrapper from '../components/MaxWidthWrapper';
import { Button } from '../components/ui/Button';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dokument',
  description: 'Ladda ner dokument och filer från Östers IF.',
  openGraph: {
    title: 'Dokument - Östers IF',
    description: 'Ladda ner dokument och filer från Östers IF.',
    type: 'website',
    locale: 'sv_SE',
    siteName: 'Östers IF',
  },
  alternates: {
    canonical: '/dokument',
  },
};

function DocumentCard({ doc }: { doc: FrontspaceDokument }) {
  const fileUrl = doc.content.fil || null;
  const fileName = fileUrl
    ? fileUrl.split('/').pop() || `${doc.title}.pdf`
    : `${doc.title}.pdf`;

  return (
    <li className="border border-white/10 rounded p-6 shadow-sm hover:shadow-md transition bg-white/5">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h3 className="text-xl font-semibold mb-1">{doc.title}</h3>
          {doc.content.beskrivning && (
            <p className="text-sm text-white/70">{doc.content.beskrivning}</p>
          )}
        </div>
        <div className="flex gap-3 shrink-0">
          {fileUrl ? (
            <>
              <Link href={fileUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="whitespace-nowrap">
                  Visa dokument
                </Button>
              </Link>
              <Link
                href={fileUrl}
                download={fileName}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="secondary" className="whitespace-nowrap">
                  Ladda ner
                </Button>
              </Link>
            </>
          ) : (
            <span className="text-white/50 text-sm italic">Fil saknas</span>
          )}
        </div>
      </div>
    </li>
  );
}

export default async function Page() {
  // Fetch categories and all documents in parallel
  const [categories, allDocuments] = await Promise.all([
    fetchAllDokumentkategorier(),
    fetchAllDokument(),
  ]);

  // Fetch documents for each category
  const categorizedDocs = await Promise.all(
    categories.map(async (category) => ({
      category,
      documents: await fetchDokumentByCategory(category.slug),
    }))
  );

  // Find uncategorized documents (documents not in any category)
  const categorizedDocIds = new Set(
    categorizedDocs.flatMap((cd) => cd.documents.map((d) => d.id))
  );
  const uncategorizedDocs = allDocuments.filter(
    (doc) => !categorizedDocIds.has(doc.id)
  );

  return (
    <main className="w-full py-40 bg-custom_dark_dark_red text-white">
      <MaxWidthWrapper>
        <h1 className="text-3xl font-bold mb-8">Dokument</h1>

        {categorizedDocs.map(
          ({ category, documents }) =>
            documents.length > 0 && (
              <section key={category.id} className="mb-12">
                <h2 className="text-2xl font-bold mb-4 border-b border-white/20 pb-2">
                  {category.title}
                </h2>
                <ul className="space-y-4">
                  {documents.map((doc) => (
                    <DocumentCard key={doc.id} doc={doc} />
                  ))}
                </ul>
              </section>
            )
        )}

        {uncategorizedDocs.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4 border-b border-white/20 pb-2">
              Övriga dokument
            </h2>
            <ul className="space-y-4">
              {uncategorizedDocs.map((doc) => (
                <DocumentCard key={doc.id} doc={doc} />
              ))}
            </ul>
          </section>
        )}

        {allDocuments.length === 0 && <p>Inga dokument hittades.</p>}
      </MaxWidthWrapper>
    </main>
  );
}
