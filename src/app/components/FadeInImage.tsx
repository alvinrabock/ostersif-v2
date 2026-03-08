interface FadeInImageProps {
  src: string;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
}

export default function FadeInImage({ src, alt, className = '', loading = 'lazy' }: FadeInImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
    />
  );
}
