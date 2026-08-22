import { currentUser, computeInitials, emitCampus, currentSettings } from "./campus";
import { fetchApi } from "@/common/lib/apiClient";

export async function syncClerkUser(clerkUser: any) {
  const fallbackName =
    clerkUser.fullName ||
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    clerkUser.username ||
    clerkUser.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "CampusOS User";

  const fallbackEmail =
    clerkUser.primaryEmailAddress?.emailAddress || `${clerkUser.id}@clerk.user`;

  const fallbackRole =
    (clerkUser.publicMetadata?.role as string) || "Operations Lead";

  const fallbackCampus =
    (clerkUser.publicMetadata?.campus as string) || currentSettings.campus;

  currentUser.name = fallbackName;
  currentUser.initials = computeInitials(fallbackName);
  currentUser.email = fallbackEmail;
  currentUser.role = fallbackRole;
  currentSettings.campus = fallbackCampus;

  emitCampus();

  // Fetch or provision persistent MongoDB record via backend API
  try {
    const res = await fetchApi<{ user: { id: string; name: string; email: string; role: string; campusId?: string } }>("/auth/me");
    if (res?.user) {
      if (res.user.name) {
        currentUser.name = res.user.name;
        currentUser.initials = computeInitials(res.user.name);
      }
      if (res.user.email) {
        currentUser.email = res.user.email;
      }
      if (res.user.role) {
        currentUser.role = res.user.role;
      }
      if (res.user.campusId) {
        currentSettings.campus = res.user.campusId;
      }
      emitCampus();
    }
  } catch (err) {
    console.warn("[Auth Sync] Could not reach backend MongoDB sync endpoint, using verified Clerk session data:", err);
  }
}

export function resetAuthUser() {
  currentUser.name = "";
  currentUser.initials = "??";
  currentUser.email = "";
  currentUser.role = "";
  emitCampus();
}
