'use client'

interface YouTubeEmbedProps {
  videoId: string
  className?: string
}

/**
 * YouTube embed component
 */
export function YouTubeEmbed({ videoId, className }: YouTubeEmbedProps) {
  if (!videoId) return null

  return (
    <div className={`relative pb-[56.25%] w-full mb-6 ${className || ''}`}>
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        title="YouTube video"
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute top-0 left-0 w-full h-full rounded-lg"
      />
    </div>
  )
}

export default YouTubeEmbed
