"use client";

import { RotateCwIcon, TriangleAlertIcon } from "lucide-react";
import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

// An admin page that fails on the server lands here, inside the sidebar shell,
// instead of on Next's bare full-screen "This page couldn't load". Production
// builds only send the error id to the browser; the Vercel log line with the
// same id has the cause.
export default function AdminError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="mx-auto max-w-2xl py-6">
      <Alert variant="destructive">
        <TriangleAlertIcon />
        <AlertTitle>This page couldn&apos;t load</AlertTitle>
        <AlertDescription>
          <p>
            The server hit an error while building it, most often because the database did not answer. If the status bar
            above shows a database error, fix that first.
          </p>
          <p>
            If it keeps happening, open Vercel → your project → Logs and search for{" "}
            {error.digest ? <code className="font-mono">{error.digest}</code> : "the time of the error"}: that log line
            names the cause.
          </p>
          {process.env.NODE_ENV === "development" ? (
            <pre className="overflow-x-auto rounded bg-muted p-2 font-mono text-xs whitespace-pre-wrap text-foreground">
              {error.message}
            </pre>
          ) : null}
        </AlertDescription>
        {/* Outside the description, which underlines every link inside it. */}
        <div className="col-start-2 mt-2 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => retry()}>
            <RotateCwIcon />
            Try again
          </Button>
          <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/admin/setup" />}>
            Setup checklist
          </Button>
        </div>
      </Alert>
    </div>
  );
}
