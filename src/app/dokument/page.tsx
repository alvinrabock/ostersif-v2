'use client';

import { fetchAllDocuments } from '@/lib/apollo/fetchDocuments/fetchAllDocumentsAction';
import { Document } from '@/types';
import Link from 'next/link';
import MaxWidthWrapper from '../components/MaxWidthWrapper';
import { Button } from '../components/ui/Button';
import { useEffect, useState } from 'react';

const backendURL = process.env.NEXT_PUBLIC_BACKEND_URL;

// Function to handle file download
const handleDownload = async (fileUrl: string, fileName: string) => {
  try {
    const response = await fetch(fileUrl);
    
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    
    const blob = await response.blob();
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Download failed:', error);
    // Fallback to direct link
    window.open(fileUrl, '_blank');
  }
};

export default function Page() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const docs = await fetchAllDocuments();
        setDocuments(docs);
      } catch (error) {
        console.error('Failed to fetch documents:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDocuments();
  }, []);

  // Skeleton component
  const DocumentSkeleton = () => (
    <li className="border border-white/10 rounded p-6 shadow-sm bg-white/5">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        {/* Left side skeleton */}
        <div className="flex-1">
          <div className="h-6 bg-white/20 rounded animate-pulse mb-2 w-3/4"></div>
          <div className="h-4 bg-white/10 rounded animate-pulse w-1/2"></div>
        </div>
        
        {/* Right side skeleton */}
        <div className="flex gap-3 shrink-0">
          <div className="h-10 w-32 bg-white/20 rounded animate-pulse"></div>
          <div className="h-10 w-24 bg-white/20 rounded animate-pulse"></div>
        </div>
      </div>
    </li>
  );

  if (loading) {
    return (
      <main className="w-full py-40 bg-custom_dark_dark_red text-white">
        <MaxWidthWrapper>
          <h1 className="text-3xl font-bold mb-6">Alla Dokument</h1>
          <ul className="space-y-6">
            {Array.from({ length: 3 }).map((_, index) => (
              <DocumentSkeleton key={index} />
            ))}
          </ul>
        </MaxWidthWrapper>
      </main>
    );
  }

  return (
    <main className="w-full py-40 bg-custom_dark_dark_red text-white">
      <MaxWidthWrapper>
        <h1 className="text-3xl font-bold mb-6">Alla Dokument</h1>

        {documents?.length > 0 ? (
          <ul className="space-y-6">
            {documents.map((doc) => {
              const filePath =
                typeof doc.fil === 'string'
                  ? doc.fil
                  : doc.fil?.url ?? null;

              const fileUrl = filePath
                ? `${backendURL}${filePath}`
                : null;

              // Extract filename from path or use title as fallback
              const fileName = filePath
                ? filePath.split('/').pop() || `${doc.title}.pdf`
                : `${doc.title}.pdf`;

              return (
                <li
                  key={doc.id}
                  className="border border-white/10 rounded p-6 shadow-sm hover:shadow-md transition bg-white/5"
                >
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                    {/* Left side: title and description */}
                    <div>
                      <h2 className="text-xl font-semibold mb-1">{doc.title}</h2>
                      {doc.beskrivning && (
                        <p className="text-sm text-white/70">
                          {doc.beskrivning}
                        </p>
                      )}
                    </div>

                    {/* Right side: buttons */}
                    {fileUrl && (
                      <div className="flex gap-3 shrink-0">
                        <Link
                          href={fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="outline" className="whitespace-nowrap">
                            Visa dokument
                          </Button>
                        </Link>

                        <Button
                          variant="secondary"
                          className="whitespace-nowrap"
                          onClick={() => handleDownload(fileUrl, fileName)}
                        >
                          Ladda ner
                        </Button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p>Inga dokument hittades.</p>
        )}
      </MaxWidthWrapper>
    </main>
  );
}