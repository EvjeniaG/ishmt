"use client";

import { useMemo, useState } from "react";

interface QrImageProps {
  initialSrc: string;
  fallbackSrc?: string | null;
  alt: string;
  width: number;
  height: number;
  className?: string;
}

export function QrImage({ initialSrc, fallbackSrc, alt, width, height, className }: QrImageProps) {
  const [src, setSrc] = useState(initialSrc);
  const fallback = useMemo(() => fallbackSrc || null, [fallbackSrc]);

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading="eager"
      decoding="sync"
      className={className}
      onError={() => {
        if (fallback && src !== fallback) {
          setSrc(fallback);
        }
      }}
    />
  );
}
