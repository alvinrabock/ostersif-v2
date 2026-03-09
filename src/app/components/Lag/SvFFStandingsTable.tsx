'use client'

import { memo, useState, useMemo } from 'react'
import Image from 'next/image'
import type { SvFFTeamStandingsResponse, SvFFTeamEngagement, SvFFStandingTeam } from '@/lib/svff/fetchTeamStandings'

interface SvFFStandingsTableProps {
  standings: SvFFTeamStandingsResponse
  teamName?: string
}

/** Memoized row to avoid re-renders when sibling rows change */
const TeamRow = memo(function TeamRow({ team, isHighlighted }: { team: SvFFStandingTeam; isHighlighted: boolean }) {
  return (
    <tr
      className={`border-b border-white/10 even:bg-custom_dark_red/30 odd:bg-transparent transition-colors ${
        isHighlighted ? 'bg-red-50 border-l-4 border-red-400' : ''
      } ${team.promoted ? 'bg-green-900/20' : ''} ${team.relegated ? 'bg-red-900/20' : ''}`}
    >
      <td className="px-2 sm:px-4 py-2 font-semibold text-white">
        <span className="flex items-center gap-1.5">
          {team.promoted && <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />}
          {team.relegated && <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />}
          {team.position}
        </span>
      </td>
      <td className="px-2 sm:px-4 py-2">
        <div className="flex items-center gap-2">
          {team.teamImageUrl && (
            <Image
              src={team.teamImageUrl}
              alt=""
              width={24}
              height={24}
              className="w-5 h-5 sm:w-6 sm:h-6 object-contain flex-shrink-0"
              loading="lazy"
              unoptimized
            />
          )}
          <span className={`font-medium text-white truncate ${isHighlighted ? 'font-bold' : ''}`}>
            {team.teamName}
          </span>
        </div>
      </td>
      <td className="px-2 sm:px-4 py-2 text-center text-white">{team.games}</td>
      <td className="px-2 sm:px-4 py-2 text-center text-green-400">{team.wins}</td>
      <td className="px-2 sm:px-4 py-2 text-center text-gray-400">{team.draws}</td>
      <td className="px-2 sm:px-4 py-2 text-center text-red-400">{team.losses}</td>
      <td className="px-2 sm:px-4 py-2 text-center text-white">
        {team.goalsScored}-{team.goalsConceded}
      </td>
      <td className="px-2 sm:px-4 py-2 text-center font-semibold text-white">
        <span className={team.goalDifferential >= 0 ? 'text-green-400' : 'text-red-400'}>
          {team.goalDifferential > 0 ? '+' : ''}{team.goalDifferential}
        </span>
      </td>
      <td className="px-2 sm:px-4 py-2 text-center font-bold text-white">{team.points}</td>
    </tr>
  )
})

const CompetitionTable = memo(function CompetitionTable({ engagement, highlightSet }: {
  engagement: SvFFTeamEngagement
  highlightSet: Set<string>
}) {
  const teams = engagement.standingsExtended?.teamEngagements
  if (!teams || teams.length === 0) return null

  const title = [
    engagement.standingsExtended?.competitionName || engagement.competitionName,
    engagement.competition?.genderName,
  ].filter(Boolean).join(' · ')

  // Pre-compute legend flags once
  const hasPromoted = teams.some(t => t.promoted)
  const hasRelegated = teams.some(t => t.relegated)

  return (
    <div className="rounded-xl overflow-hidden shadow-md">
      <div className="bg-custom_dark_red p-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs sm:text-sm text-left border-collapse">
          <caption className="sr-only">{title}</caption>
          <thead className="text-white bg-custom_dark_red sticky top-0 z-10 border-b border-white/10">
            <tr>
              <th className="px-2 sm:px-4 py-2">#</th>
              <th className="px-2 sm:px-4 py-2 min-w-[160px]">Lag</th>
              <th className="px-2 sm:px-4 py-2 text-center">S</th>
              <th className="px-2 sm:px-4 py-2 text-center">V</th>
              <th className="px-2 sm:px-4 py-2 text-center">O</th>
              <th className="px-2 sm:px-4 py-2 text-center">F</th>
              <th className="px-2 sm:px-4 py-2 text-center">GM</th>
              <th className="px-2 sm:px-4 py-2 text-center">+/-</th>
              <th className="px-2 sm:px-4 py-2 text-center font-bold">P</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => (
              <TeamRow
                key={`${team.position}-${team.teamName}`}
                team={team}
                isHighlighted={highlightSet.has(team.teamName.toLowerCase())}
              />
            ))}
          </tbody>
        </table>
      </div>

      {(hasPromoted || hasRelegated) && (
        <div className="flex gap-4 px-4 py-3 text-xs text-gray-400">
          {hasPromoted && (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              Flyttas upp
            </span>
          )}
          {hasRelegated && (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              Flyttas ner
            </span>
          )}
        </div>
      )}
    </div>
  )
})

/** Extract all year strings an engagement belongs to.
 *  Checks both seasonName and competitionName for multi-year patterns like "2025/26" */
function getSeasonYears(engagement: SvFFTeamEngagement): string[] {
  const years = new Set<string>()

  const sources = [
    engagement.standingsExtended?.seasonName,
    engagement.standingsExtended?.competitionName,
    engagement.competitionName,
  ].filter(Boolean) as string[]

  for (const source of sources) {
    const slashMatch = source.match(/(\d{4})\/(\d{2,4})/)
    if (slashMatch) {
      years.add(slashMatch[1])
      const secondRaw = slashMatch[2]
      const second = secondRaw.length === 2 ? slashMatch[1].slice(0, 2) + secondRaw : secondRaw
      years.add(second)
    }

    const yearMatches = source.match(/\d{4}/g)
    if (yearMatches) {
      for (const y of yearMatches) years.add(y)
    }
  }

  return years.size > 0 ? Array.from(years) : ['Okänd']
}

/** Check if a competition is finished based on status fields */
function isFinished(engagement: SvFFTeamEngagement): boolean {
  const status = (engagement.competitionStatus || engagement.competition?.statusName || '').toLowerCase()
  return status.includes('avslutad') || status.includes('finished') || status.includes('completed')
}

export default function SvFFStandingsTable({ standings, teamName }: SvFFStandingsTableProps) {
  const engagements = useMemo(() =>
    standings.team?.teamEngagementsWithStandings?.filter(
      e => e.standingsExtended?.teamEngagements && e.standingsExtended.teamEngagements.length > 0
    ) || [],
    [standings]
  )

  // Pre-compute a Set of lowercased team names to highlight — O(1) lookup per row
  const highlightSet = useMemo(() => {
    const set = new Set<string>()
    if (!teamName) return set

    const lowerName = teamName.toLowerCase()
    for (const e of engagements) {
      const teams = e.standingsExtended?.teamEngagements || []
      for (const t of teams) {
        const lowerTeamName = t.teamName.toLowerCase()
        if (
          lowerTeamName.includes(lowerName) ||
          lowerName.includes(lowerTeamName.replace(' ff', '').replace(' if', '')) ||
          lowerTeamName.includes('öster')
        ) {
          set.add(lowerTeamName)
        }
      }
    }
    return set
  }, [engagements, teamName])

  // Group engagements by year, sorted with latest first
  // An engagement like "2025/26" appears under both "2025" and "2026"
  // Within each year, active competitions are sorted before finished ones
  const seasons = useMemo(() => {
    const seasonMap = new Map<string, SvFFTeamEngagement[]>()
    for (const e of engagements) {
      for (const year of getSeasonYears(e)) {
        const list = seasonMap.get(year) || []
        list.push(e)
        seasonMap.set(year, list)
      }
    }
    for (const [, list] of seasonMap) {
      list.sort((a, b) => (isFinished(a) ? 1 : 0) - (isFinished(b) ? 1 : 0))
    }
    return Array.from(seasonMap.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [engagements])

  // Default to the latest year that has at least one active competition, otherwise latest year
  const [selectedSeason, setSelectedSeason] = useState<string>(() => {
    const activeYear = seasons.find(([, list]) => list.some(e => !isFinished(e)))
    return activeYear?.[0] || seasons[0]?.[0] || ''
  })

  const filteredEngagements = useMemo(() =>
    seasons.find(([s]) => s === selectedSeason)?.[1] || [],
    [seasons, selectedSeason]
  )

  if (engagements.length === 0) {
    return (
      <div className="text-center py-12 text-white">
        <p className="text-lg">Ingen tabelldata tillgänglig just nu.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {seasons.length > 1 && (
        <div>
          <label htmlFor="svff-season-selector" className="text-white/70 text-sm font-medium block mb-1">Säsong:</label>
          <select
            id="svff-season-selector"
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(e.target.value)}
            className="bg-custom_dark_red text-white border border-white/20 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/30 hover:border-white/40 transition-colors cursor-pointer"
          >
            {seasons.map(([season]) => (
              <option key={season} value={season}>{season}</option>
            ))}
          </select>
        </div>
      )}

      {filteredEngagements.map((engagement) => (
        <CompetitionTable
          key={engagement.teamEngagementId}
          engagement={engagement}
          highlightSet={highlightSet}
        />
      ))}
      <div className="text-xs text-gray-400">
        Källa: Svenska Fotbollförbundet (SvFF)
      </div>
    </div>
  )
}
