import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";

export { authOptions };

export function getAuthSession() {
  return getServerSession(authOptions);
}
