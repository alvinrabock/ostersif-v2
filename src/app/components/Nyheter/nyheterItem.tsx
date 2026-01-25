'use client';

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Post } from "@/types";
import { Play } from "lucide-react";

// Reusable fade-in image component
function FadeImage({ src, alt, className, loading }: { src: string; alt: string; className: string; loading: 'lazy' | 'eager' }) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current?.naturalHeight > 0) {
      setLoaded(true);
    }
  }, []);

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      className={`${className} transition-opacity duration-500 ease-out ${loaded ? 'opacity-100' : 'opacity-0'}`}
      loading={loading}
      onLoad={() => setLoaded(true)}
      onError={() => setLoaded(true)}
    />
  );
}

interface NyheterItemProps {
  post: Post;
  priority?: boolean; // For above-the-fold images
}

const NyheterItem: React.FC<NyheterItemProps> = ({ post, priority = false }) => {
  const imageResource =
    post.heroImage && typeof post.heroImage !== "string" ? post.heroImage : null;

  // Get image URL from heroImage object
  const imageUrl = imageResource?.url;

  const youtubeLink = post?.youtubeLink || "";
  const youtubeId = youtubeLink ? youtubeLink.split("v=")[1]?.split("&")[0] : null;
  // Use medium quality thumbnail for faster loading
  const youtubeThumbnail = youtubeId
    ? `https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg`
    : null;

  const fallbackImage = "/oster-placeholder-image.jpg";

  const hasYoutube = !!youtubeLink;

  return (
    <Link href={`/nyhet/${post.slug}`} className="block group">
      <div className="relative w-full aspect-[16/9] mb-4 bg-gray-200 rounded-md overflow-hidden">
        {hasYoutube ? (
          <div className="relative w-full h-full">
            <FadeImage
              src={imageUrl || youtubeThumbnail || fallbackImage}
              alt={imageResource?.alt || "YouTube Thumbnail"}
              className="w-full h-full object-cover rounded-md"
              loading={priority ? "eager" : "lazy"}
            />
            <div className="absolute top-2 left-2 bg-black/50 rounded-full p-1">
              <Play className="h-4 w-4 text-white" />
            </div>
          </div>
        ) : imageUrl ? (
          <FadeImage
            src={imageUrl}
            alt={imageResource?.alt || post.title}
            className="w-full h-full object-cover"
            loading={priority ? "eager" : "lazy"}
          />
        ) : (
          <FadeImage
            src={fallbackImage}
            alt="Fallback Thumbnail"
            className="w-full h-full object-cover"
            loading={priority ? "eager" : "lazy"}
          />
        )}
      </div>

      {post.publishedAt && !isNaN(new Date(post.publishedAt).getTime()) && (
        <p className="text-sm text-gray-500 mb-2">
          {new Date(post.publishedAt).toLocaleDateString()}
        </p>
      )}

      <h2 className="text-lg font-bold group-hover:underline mb-4">
        {post.title}
      </h2>
    </Link>
  );
};

export default NyheterItem;