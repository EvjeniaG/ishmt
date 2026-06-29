import Link from "next/link";
import { getAuthSession } from "@/lib/auth";
import { getRoleLabel } from "@/lib/constants/role-labels";
import { getDefaultRedirectForRole } from "@/lib/permissions/routes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function UnauthorizedPage() {
  const session = await getAuthSession();
  const redirect = session?.user?.roleCode
    ? getDefaultRedirectForRole(session.user.roleCode)
    : "/auth/login";

  const roleCode = session?.user?.roleCode;
  const roleLabel = roleCode ? getRoleLabel(roleCode) : null;

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>Akses i ndaluar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Nuk keni leje për të hyrë në këtë faqe me rolin tuaj aktual.
          </p>
          {session?.user && (
            <p className="text-sm text-muted-foreground">
              I identifikuar si: <strong>{roleLabel}</strong>
              {session.user.email ? ` (${session.user.email})` : ""}
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild variant="outline">
              <Link href="/api/auth/signout">Dil nga llogaria</Link>
            </Button>
            <Button asChild>
              <Link href={redirect}>Kthehu te paneli</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
