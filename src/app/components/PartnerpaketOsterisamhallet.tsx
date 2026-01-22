import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { fetchPosts } from '@/lib/frontspace/client';
import { fetchPartnersInOsterISamhallet } from '@/lib/frontspace/adapters/partners';
import ForetagsPaketItem from '@/app/components/Partners/ForetagsPaketItem';
import PersonalItem from '@/app/components/Personal/PersonalItem';
import { Foretagspaket, Personal, Partner } from '@/types';

export default async function PartnerpaketOsterisamhallet() {
  try {
    // Fetch partners with partner_till_oster_i_samhallet = true
    const partners: Partner[] = await fetchPartnersInOsterISamhallet();

    // Fetch the Samhällsengagemang category
    const { posts: allKategorier } = await fetchPosts('partnerpaket-kategorier', { limit: 100 });
    const samhallsengagemangKategori = allKategorier.find((kat: any) => kat.slug === 'samhallsengagemang');

    // Fetch all partner packages and filter by category
    const { posts: allPartnerpaket } = await fetchPosts('partnerpaket', { limit: 500 });

    let selectedPackages: any[] = [];
    if (samhallsengagemangKategori) {
      const kategori = samhallsengagemangKategori as any;
      selectedPackages = allPartnerpaket.filter((paket: any) => {
        let content = paket.content || {};
        if (typeof content === 'string') {
          try {
            content = JSON.parse(content);
          } catch {
            content = {};
          }
        }

        const paketKategori = content.foretagspaketkategori || content.kategori;

        // Check if package belongs to Samhällsengagemang category
        if (typeof paketKategori === 'string') {
          return paketKategori.toLowerCase() === kategori.slug.toLowerCase() || paketKategori === kategori.id;
        }
        if (typeof paketKategori === 'object' && paketKategori !== null) {
          return paketKategori.id === kategori.id || paketKategori.slug === kategori.slug;
        }
        return false;
      });
    }

    // Transform packages to Foretagspaket type
    const foretagspaket: Foretagspaket[] = selectedPackages.map((paket: any) => {
      let content = paket.content || {};
      if (typeof content === 'string') {
        try {
          content = JSON.parse(content);
        } catch {
          content = {};
        }
      }

      return {
        id: paket.id,
        title: paket.title,
        slug: paket.slug,
        heroImage: content.omslagsbild || content.heroImage,
        shortDescription: content.kort_beskrivning || content.kortbeskrivning,
        price: content.price || content.pris,
        enableLink: content.enableLink,
        link: content.link,
        Ingaripaketet: content.Ingaripaketet || [],
        updatedAt: paket.updated_at || paket.updatedAt,
        createdAt: paket.created_at || paket.createdAt,
      } as Foretagspaket;
    });

    // Fetch personnel from both departments
    const { posts: allPersonalAvdelningar } = await fetchPosts('personalavdelningar', { limit: 100 });
    const marketingDept = allPersonalAvdelningar.find((dept: any) => dept.slug === 'marknad-och-forsaljning');
    const osterISamhalletDept = allPersonalAvdelningar.find((dept: any) => dept.slug === 'oster-i-samhallet');

    let personnel: Personal[] = [];

    if (marketingDept || osterISamhalletDept) {
      const { posts: allPersonal } = await fetchPosts('personal', { limit: 500 });
      const marketing = marketingDept as any;
      const samhallet = osterISamhalletDept as any;

      // Filter personnel that belong to either department
      personnel = allPersonal
        .filter((person: any) => {
          let personContent = person.content || {};
          if (typeof personContent === 'string') {
            try {
              personContent = JSON.parse(personContent);
            } catch {
              personContent = {};
            }
          }

          const personDept = personContent.personalavdelningar || personContent.avdelning;

          // Check against both departments
          if (typeof personDept === 'string') {
            const deptLower = personDept.toLowerCase();
            return (
              (marketing && (deptLower === marketing.slug.toLowerCase() || personDept === marketing.id)) ||
              (samhallet && (deptLower === samhallet.slug.toLowerCase() || personDept === samhallet.id))
            );
          }
          if (typeof personDept === 'object' && personDept !== null) {
            return (
              (marketing && (personDept.id === marketing.id || personDept.slug === marketing.slug)) ||
              (samhallet && (personDept.id === samhallet.id || personDept.slug === samhallet.slug))
            );
          }
          return false;
        })
        .map((person: any) => {
          let personContent = person.content || {};
          if (typeof personContent === 'string') {
            try {
              personContent = JSON.parse(personContent);
            } catch {
              personContent = {};
            }
          }

          return {
            id: person.id,
            title: person.title,
            slug: person.slug,
            email: personContent.email || personContent.epost,
            phoneNumber: personContent.phone || personContent.telefon,
            jobTitle: personContent.role || personContent.roll || personContent.befattning,
            photo: personContent.image || personContent.bild || personContent.profilbild,
            updatedAt: person.updated_at || person.updatedAt,
            createdAt: person.created_at || person.createdAt,
          } as Personal;
        });
    }

    return (
      <div className="w-full space-y-12">
        {/* Samhällsengagemang Packages Grid - 4 columns */}
        {foretagspaket.length > 0 && (
          <div>
            <h2 className="text-3xl font-bold text-white mb-8">Öster i samhället</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {foretagspaket.map((paket) => (
                <ForetagsPaketItem key={paket.id} item={paket} />
              ))}
            </div>
          </div>
        )}

        {/* Partners in Öster i Samhället */}
        {partners.length > 0 && (
          <div>
            <h2 className="text-3xl font-bold text-white mb-8">Partners</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-10 w-full">
              {partners.map((partner) => {
                const logoUrl = typeof partner.logotyp === 'string'
                  ? partner.logotyp
                  : partner.logotyp?.url;

                const partnerLink = partner.link || partner.webbplats || '#';

                return (
                  <Link
                    key={partner.id}
                    href={partnerLink}
                    target={partnerLink !== '#' ? "_blank" : "_self"}
                    rel={partnerLink !== '#' ? "noopener noreferrer" : undefined}
                    className="flex items-center justify-center group transition-opacity hover:opacity-80"
                    aria-label={`Visit ${partner.title}'s website`}
                    prefetch={false}
                  >
                    {logoUrl ? (
                      <div className="relative w-32 aspect-[3/2] flex items-center justify-center">
                        <Image
                          src={logoUrl}
                          alt={`${partner.title} logo`}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                          className="object-contain"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <span className="text-white/80 font-bold text-sm text-left group-hover:text-white transition-colors">
                        {partner.title}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Personnel from both departments */}
        {personnel.length > 0 && (
          <div>
            <h2 className="text-3xl font-bold text-white mb-8">Kontakt</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {personnel.map((person) => (
                <PersonalItem key={person.id} person={person} />
              ))}
            </div>
          </div>
        )}

        {/* Show message if nothing is available */}
        {foretagspaket.length === 0 && partners.length === 0 && personnel.length === 0 && (
          <div className="text-center text-gray-400 py-12">
            <p>Information kommer snart</p>
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error('Error fetching Partnerpaket Öster i samhället:', error);
    return (
      <div className="text-center text-gray-500">
        Ett fel uppstod vid hämtning av information.
      </div>
    );
  }
}
