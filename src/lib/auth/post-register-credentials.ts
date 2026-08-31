export const POST_REGISTER_STORAGE_KEY = "ishmtt_post_register";

export type PostRegisterCredentials = {
  identifier: string;
  password: string;
  accountType: "company" | "owner";
};

export function savePostRegisterCredentials(credentials: PostRegisterCredentials) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(POST_REGISTER_STORAGE_KEY, JSON.stringify(credentials));
}

export function loadPostRegisterCredentials(): PostRegisterCredentials | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(POST_REGISTER_STORAGE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(POST_REGISTER_STORAGE_KEY);
    return JSON.parse(raw) as PostRegisterCredentials;
  } catch {
    sessionStorage.removeItem(POST_REGISTER_STORAGE_KEY);
    return null;
  }
}
