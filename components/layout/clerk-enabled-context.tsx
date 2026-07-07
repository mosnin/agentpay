"use client";

import * as React from "react";

// Client components can only ever see NEXT_PUBLIC_* env vars, so they can't
// tell on their own whether CLERK_SECRET_KEY is also set — only the server
// (lib/auth.ts's isClerkEnabled()) knows that. This carries that one
// authoritative decision down, so a client component never renders Clerk
// hooks when the root layout didn't mount <ClerkProvider>.
const ClerkEnabledContext = React.createContext(false);

export function ClerkEnabledProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <ClerkEnabledContext.Provider value={enabled}>
      {children}
    </ClerkEnabledContext.Provider>
  );
}

export function useClerkEnabled() {
  return React.useContext(ClerkEnabledContext);
}
