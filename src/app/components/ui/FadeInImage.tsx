"use client";

import React, { useState } from "react";
import Image, { ImageProps } from "next/image";

interface FadeInImageProps extends Omit<ImageProps, "onLoad"> {
  duration?: number;
}

/**
 * Image component with fade-in animation on load
 * Uses opacity transition for smooth appearance
 */
export default function FadeInImage({
  className = "",
  duration = 300,
  alt,
  ...props
}: FadeInImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <Image
      {...props}
      alt={alt}
      className={`transition-opacity ${isLoaded ? "opacity-100" : "opacity-0"} ${className}`}
      style={{ transitionDuration: `${duration}ms`, ...props.style }}
      onLoad={() => setIsLoaded(true)}
    />
  );
}
