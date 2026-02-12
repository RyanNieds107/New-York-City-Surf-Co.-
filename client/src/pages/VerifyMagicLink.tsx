import { useEffect, useState, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Logo } from "@/components/Logo";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VerifyMagicLink() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const utils = trpc.useUtils();
  const [verificationState, setVerificationState] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const hasVerifiedRef = useRef(false); // Prevent multiple verification attempts

  // Extract token from URL
  const params = new URLSearchParams(search);
  const token = params.get("token");

  const verifyMutation = trpc.auth.verifyMagicLink.useMutation({
    onSuccess: async () => {
      setVerificationState("success");
      // Invalidate auth state to refresh user info
      await utils.auth.me.invalidate();
      const storedRedirect =
        typeof window === "undefined"
          ? null
          : sessionStorage.getItem("postLoginRedirect");

      if (typeof window !== "undefined") {
        sessionStorage.removeItem("postLoginRedirect");
      }

      // Redirect after a brief delay
      setTimeout(() => {
        setLocation(storedRedirect || "/members");
      }, 1500);
    },
    onError: (error) => {
      setVerificationState("error");
      // Provide more helpful error messages
      if (error.message.includes("expired")) {
        setErrorMessage("This magic link has expired. Please request a new one.");
      } else if (error.message.includes("Invalid") || error.message.includes("invalid")) {
        setErrorMessage("This magic link has already been used or is invalid. If you requested a new link, please use the most recent one.");
      } else {
        setErrorMessage(error.message || "Invalid or expired magic link. Please request a new one.");
      }
    },
  });

  useEffect(() => {
    if (!token) {
      setVerificationState("error");
      setErrorMessage("No verification token provided");
      return;
    }

    // Only verify once - prevent race conditions from double-loading
    if (!hasVerifiedRef.current && verificationState === "loading" && !verifyMutation.isPending && !verifyMutation.isSuccess) {
      hasVerifiedRef.current = true;
      verifyMutation.mutate({ token });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]); // Only depend on token to run once when component mounts

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="border-b-2 border-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-3">
          <div className="flex items-center justify-between">
            <Logo
              logoSize="h-10 sm:h-12 md:h-14"
              textSize="text-xl sm:text-2xl md:text-3xl lg:text-4xl"
              textColor="text-black hover:text-gray-600"
              showLink={true}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="w-full max-w-md">
          <div className="bg-white border-2 border-black p-8 sm:p-10 text-center">
            {verificationState === "loading" && (
              <>
                <div className="w-16 h-16 bg-black flex items-center justify-center mx-auto mb-6">
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                </div>
                <h1
                  className="text-2xl sm:text-3xl font-black text-black uppercase tracking-tight mb-3"
                  style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
                >
                  Verifying...
                </h1>
                <p
                  className="text-sm text-gray-600"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  Please wait while we verify your login link
                </p>
              </>
            )}

            {verificationState === "success" && (
              <>
                <div className="w-16 h-16 bg-green-600 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="h-8 w-8 text-white" />
                </div>
                <h1
                  className="text-2xl sm:text-3xl font-black text-black uppercase tracking-tight mb-3"
                  style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
                >
                  You're In!
                </h1>
                <p
                  className="text-sm text-gray-600"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  Redirecting...
                </p>
              </>
            )}

            {verificationState === "error" && (
              <>
                <div className="w-16 h-16 bg-red-600 flex items-center justify-center mx-auto mb-6">
                  <XCircle className="h-8 w-8 text-white" />
                </div>
                <h1
                  className="text-2xl sm:text-3xl font-black text-black uppercase tracking-tight mb-3"
                  style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
                >
                  Link Invalid
                </h1>
                <p
                  className="text-sm text-gray-600 mb-6"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {errorMessage}
                </p>
                <Button
                  onClick={() => setLocation("/login")}
                  className="bg-black text-white hover:bg-gray-800 border-2 border-black rounded-none uppercase tracking-wide font-bold py-4 px-8 text-sm"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  Request New Link
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
