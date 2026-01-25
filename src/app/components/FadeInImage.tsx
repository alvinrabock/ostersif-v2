'use client';

import { useState, useRef, useEffect } from 'react';

interface FadeInImageProps {
  src: string;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
}

export default function FadeInImage({ src, alt, className = '', loading = 'lazy' }: FadeInImageProps) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Check if image is already loaded (cached) on mount
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
      className={`transition-opacity duration-500 ease-out ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
      loading={loading}
      onLoad={() => setLoaded(true)}
      onError={() => setLoaded(true)}
    />
  );
}
