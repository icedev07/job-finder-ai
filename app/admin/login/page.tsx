import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="grid min-h-svh place-items-center bg-muted/40 px-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
