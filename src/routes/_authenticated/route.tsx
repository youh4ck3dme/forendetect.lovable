// Pathless layout route that gates every child under `src/routes/_authenticated/`
// behind a signed-in Supabase user. The subtree is client-rendered (`ssr: false`)
// because Supabase stores the session in `localStorage`, which the server cannot read.
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ActiveCaseProvider } from "@/hooks/useActiveCase";
import { DEV_MOCK_USER, isDevFreeEntryActive } from "@/lib/dev-auth";
import {
  clearExpiredSessionArtifacts,
  isAuthSessionError,
  SESSION_EXPIRED_MESSAGE,
} from "@/lib/session-error";

const SIGN_IN_ROUTE = "/auth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ context }) => {
    if (isDevFreeEntryActive()) {
      return {
        user: DEV_MOCK_USER as unknown as NonNullable<
          Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"]
        >,
      };
    }
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      if (isAuthSessionError(error)) {
        toast.error(SESSION_EXPIRED_MESSAGE);
        clearExpiredSessionArtifacts(() => context.queryClient.clear());
      }
      throw redirect({ to: SIGN_IN_ROUTE });
    }
    if (!data.user) {
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
