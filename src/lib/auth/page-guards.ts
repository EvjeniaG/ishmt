import { redirect } from "next/navigation";
import { AuthError, requireAuth, type AuthContext } from "@/lib/permissions/guards";

/**
 * Page-level auth guard for React Server Components.
 *
 * `requireAuth` throws an {@link AuthError} when the session is missing or
 * stale (e.g. the user/organization referenced by a still-valid JWT no longer
 * exists, which happens after a database re-seed or when a membership is
 * revoked). In a server component an uncaught throw surfaces as a 500. Pages
 * should instead bounce the user to the login screen to re-authenticate.
 *
 * Use this in RSC pages. Server actions and services must keep using
 * `requireAuth` directly so they can return structured errors.
 *
 * Redirects to `/auth/expired` (not `/auth/login`) on purpose: the JWT may
 * still be cryptographically valid, so the middleware would bounce
 * `/auth/login` straight back and create a redirect loop. `/auth/expired`
 * clears the session first, then sends the user to login.
 */
export async function requireAuthForPage(): Promise<AuthContext> {
  try {
    return await requireAuth();
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/auth/expired");
    }
    throw error;
  }
}
