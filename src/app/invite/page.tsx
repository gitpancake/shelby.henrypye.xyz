"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 flex items-center justify-center bg-background">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <InviteContent />
    </Suspense>
  );
}

function InviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No invite token provided.");
      return;
    }

    async function acceptInvite() {
      try {
        // Check if authenticated
        const authRes = await fetch("/api/auth");
        const authData = await authRes.json();

        if (!authData.authenticated) {
          router.replace(`/login?redirect=/invite?token=${token}`);
          return;
        }

        const res = await fetch("/api/invites/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (res.ok) {
          // Switch to the new team
          await fetch("/api/teams/switch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ teamId: data.teamId }),
          });
          setStatus("success");
          setMessage(`Joined ${data.teamName} as ${data.role}`);
          setTimeout(() => router.replace("/"), 2000);
        } else {
          setStatus("error");
          setMessage(data.error || "Failed to accept invite");
        }
      } catch {
        setStatus("error");
        setMessage("Something went wrong");
      }
    }

    acceptInvite();
  }, [token, router]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="text-center space-y-3">
        {status === "loading" && (
          <>
            <Loader2 className="size-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Accepting invite...</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle2 className="size-8 mx-auto text-green-500" />
            <p className="text-sm font-medium">{message}</p>
            <p className="text-xs text-muted-foreground">Redirecting...</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="size-8 mx-auto text-destructive" />
            <p className="text-sm font-medium">{message}</p>
            <button
              onClick={() => router.replace("/")}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
            >
              Go home
            </button>
          </>
        )}
      </div>
    </div>
  );
}
