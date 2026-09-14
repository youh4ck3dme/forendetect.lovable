// Pathless layout route that gates every child under `src/routes/_authenticated/`
// behind a signed-in Supabase user. The subtree is client-rendered (`ssr: false`)
// because Supabase stores the session in `localStorage`, which the server cannot read.
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ActiveCaseProvider } from "@/hooks/useActiveCase";
import { DEV_MOCK_USER, isDevFreeEntryActive } from "@/lib/dev-auth";

const SIGN_IN_ROUTE = "/auth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      if (isDevFreeEntryActive()) {
        return {
          user: DEV_MOCK_USER as unknown as NonNullable<typeof data.user>,
        };
      }
      try {
        const destination = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        if (destination.startsWith("/") && !destination.startsWith("//")) {
          window.sessionStorage.setItem("forendo:after-login", destination);
        }
      } catch {
        /* Storage may be unavailable in privacy-restricted browsers. */
      }
      throw redirect({ to: SIGN_IN_ROUTE });
    }
    return { user: data.user };
  },
  component: () => (
    <ActiveCaseProvider>
      <Outlet />
    </ActiveCaseProvider>
  ),
});
