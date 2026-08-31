import Link from "next/link";
import type { ComponentProps } from "react";

/** True for routes that must not use Next.js client navigation (files, JSON APIs). */
export function isNonRscHref(href: string): boolean {
  return href.startsWith("/api/") || href.startsWith("http://") || href.startsWith("https://");
}

type AppLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
};

/**
 * Page links use Next.js `<Link>`; API/download URLs use a plain anchor so RSC navigation
 * does not receive a PDF/binary response ("unexpected response from the server").
 */
export function AppLink({ href, children, ...props }: AppLinkProps) {
  if (isNonRscHref(href)) {
    const { prefetch: _prefetch, replace: _replace, scroll: _scroll, ...anchorProps } = props;
    return (
      <a href={href} {...anchorProps}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} {...props}>
      {children}
    </Link>
  );
}
