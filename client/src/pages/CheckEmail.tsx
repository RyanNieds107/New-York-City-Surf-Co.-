import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Logo } from "@/components/Logo";
import { Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function CheckEmail() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const [isResending, setIsResending] = useState(false);

  // Extract email from URL
  const params = new URLSearchParams(search);
  const email = params.get("email") || "";

  const sendMagicLinkMutation = trpc.auth.sendMagicLink.useMutation({
    onSuccess: () => {
      toast.success("New magic link sent! Check your inbox.");
      setIsResending(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to resend. Please try again.");
      setIsResending(false);
    },
  });

  const handleResend = () => {
    if (!email || isResending) return;
    setIsResending(true);
    sendMagicLinkMutation.mutate({ email });
  };

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
            {/* Icon */}
            <div className="w-20 h-20 bg-black flex items-center justify-center mx-auto mb-6">
              <Mail className="h-10 w-10 text-white" />
            </div>

            {/* Title */}
            <h1
              className="text-3xl sm:text-4xl font-black text-black uppercase tracking-tight mb-3"
              style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
            >
              Check Your Email
            </h1>

            {/* Email Display */}
            {email && (
              <p
                className="text-sm text-gray-600 mb-4"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                We sent a login link to:
              </p>
            )}
            {email && (
              <p
                className="text-base font-bold text-black mb-6 break-all"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {email}
              </p>
            )}

            {/* Instructions */}
            <div className="bg-gray-50 border-2 border-gray-200 p-4 mb-6 text-left">
              <p
                className="text-xs text-gray-600 mb-2"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                1. Open the email from NYC Surf Co
              </p>
              <p
                className="text-xs text-gray-600 mb-2"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                2. Click the "Sign In to Members Portal" button
              </p>
              <p
                className="text-xs text-gray-600"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                3. You'll be automatically signed in
              </p>
            </div>

            {/* Expiration Notice */}
            <p
              className="text-xs text-gray-500 mb-6"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              Link expires in 24 hours. Check spam folder if not received.
            </p>

            {/* Resend Button */}
            {email && (
              <Button
                onClick={handleResend}
                disabled={isResending || sendMagicLinkMutation.isPending}
                variant="outline"
                className="border-2 border-black rounded-none uppercase tracking-wide font-bold py-4 px-6 text-sm hover:bg-black hover:text-white transition-colors"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {isResending || sendMagicLinkMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </span>
                ) : (
                  "Resend Link"
                )}
              </Button>
            )}

            {/* Back to Login */}
            <div className="mt-6">
              <button
                onClick={() => setLocation("/login")}
                className="text-sm text-gray-500 hover:text-black transition-colors underline"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                Use a different email
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
