import MaxWidthWrapper from '@/app/components/MaxWidthWrapper';
import { Media } from '@/app/components/Media/index';
import { fetchAllTeams } from '@/lib/apollo/fetchTeam/fetchAllTeamsAction';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Lag } from '@/types';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Våra Lag - Östers IF',
  description: 'Upptäck alla lag inom Östers IF, en av Sveriges mest traditionsrika fotbollsföreningar. Se våra A-lag och ungdomslag från Växjö.',
  keywords: 'Östers IF, fotboll, lag, Växjö, Sverige, fotbollslag, A-lag, ungdomslag, sport',
  openGraph: {
    title: 'Våra Lag - Östers IF',
    description: 'Upptäck alla lag inom Östers IF, en av Sveriges mest traditionsrika fotbollsföreningar.',
    type: 'website',
    locale: 'sv_SE',
    siteName: 'Östers IF',
  },
};

export default async function TeamsArchivePage() {
  const teams: Lag[] = await fetchAllTeams();

  const sortedTeams = [...teams].sort((a, b) => {
    if (a.aLag && !b.aLag) return -1;
    if (!a.aLag && b.aLag) return 1;

    // Then sort by publishedAt descending (newest first)
    const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return dateB - dateA;
  });

  return (
    <main className="py-40 bg-custom_dark_dark_red text-white">
      <MaxWidthWrapper>
        <h1 className="text-6xl font-bold mb-10 uppercase">Våra lag</h1>

        <ul className="grid grid-cols-2 gap-6">
          {sortedTeams.map((team) => {
            // Determine the link URL:
            const sportadminLinkValid =
              team.linkDirectToSportadmin && team.Sportadminlink && team.Sportadminlink.trim() !== '';

            // If checkbox is checked and link exists, use the external link with <a> and target _blank,
            // else use internal Link to `/lag/${team.slug}`
            if (sportadminLinkValid) {
              return (
                <li
                  key={team.id}
                  className={`
                    col-span-2 border border-white/20 rounded-lg p-6 shadow hover:shadow-lg transition relative overflow-hidden
                    ${team.aLag ? 'text-white min-h-[500px]' : 'text-white'}
                  `}
                >
                  <Link
                    href={team.Sportadminlink!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full h-full"
                  >
                    {team.banner && (
                      <div className="absolute inset-0 w-full h-full z-0 rounded-lg overflow-hidden">
                        <Media
                          resource={team.banner}
                          alt={team.title}
                          imgClassName="w-full h-full object-cover"
                          fill
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-custom_dark_blue via-transparent to-transparent z-10" />
                      </div>
                    )}

                    <div
                      className={`
                        z-20 p-6 text-center
                        ${team.aLag
                          ? 'absolute bottom-6 left-6 text-left'
                          : 'relative flex items-center justify-start h-full'}
                      `}
                    >
                      <h2 className="text-5xl font-semibold uppercase flex items-center gap-2">
                        {team.title}
                        <ArrowRight className="w-5 h-5" />
                      </h2>
                    </div>
                  </Link>
                </li>
              );
            }

            // Default internal link
            return (
              <Link href={`/lag/${team.slug}`} key={team.id} className="col-span-2">
                <li
                  className={`
                    border border-white/20 rounded-lg p-6 shadow hover:shadow-lg transition relative overflow-hidden
                    ${team.aLag ? 'text-white min-h-[500px]' : 'text-white'}
                  `}
                >
                  {team.banner && (
                    <div className="absolute inset-0 w-full h-full z-0 rounded-lg overflow-hidden">
                      <Media
                        resource={team.banner}
                        alt={team.title}
                        imgClassName="w-full h-full object-cover"
                        fill
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-custom_dark_blue via-transparent to-transparent z-10" />
                    </div>
                  )}

                  <div
                    className={`
                      z-20 p-6 text-center
                      ${team.aLag
                        ? 'absolute bottom-6 left-6 text-left'
                        : 'relative flex items-center justify-start h-full'}
                    `}
                  >
                    <h2 className="text-5xl font-semibold uppercase flex items-center gap-2">
                      {team.title}
                      <ArrowRight className="w-5 h-5" />
                    </h2>
                  </div>
                </li>
              </Link>
            );
          })}
        </ul>
      </MaxWidthWrapper>
    </main>
  );
}