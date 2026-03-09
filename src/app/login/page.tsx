"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const cred = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
      const idToken = await cred.user.getIdToken();

      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Login failed");
        setPassword("");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Invalid credentials");
      setPassword("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="font-mono text-sm font-bold tracking-tight">
              shelby.
            </CardTitle>
            <CardDescription>
              Sign in to your vehicle tracker
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}

              {resetSent && (
                <p className="text-xs text-positive">Password reset email sent</p>
              )}

              <Button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full"
              >
                {loading ? "Signing in..." : "Sign in"}
              </Button>

              <button
                type="button"
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={async () => {
                  if (!email) {
                    setError("Enter your email first");
                    return;
                  }
                  setError("");
                  setResetSent(false);
                  try {
                    await sendPasswordResetEmail(getFirebaseAuth(), email);
                    setResetSent(true);
                  } catch {
                    setError("Failed to send reset email");
                  }
                }}
              >
                Forgot password?
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
