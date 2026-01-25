'use client';

import { useState } from 'react';

interface FadeInImageProps {
  src: string;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
}

export default function FadeInImage({ src, alt, className = '', loading = 'lazy' }: FadeInImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <img
      src={src}
      alt={alt}
      className={`transition-opacity duration-500 ease-out ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
      loading={loading}
      onLoad={() => setLoaded(true)}
      onError={() => setLoaded(true)} // Show image on error too (browser shows broken image icon)
    />
  );
}
