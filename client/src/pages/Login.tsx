import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Loader2, Mail } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const [email, setEmail] = useState("");
  const [isLocal, setIsLocal] = useState(false);
  const params = new URLSearchParams(search);
  const redirect = params.get("redirect");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!redirect) {
      sessionStorage.removeItem("postLoginRedirect");
      return;
    }
    sessionStorage.setItem("postLoginRedirect", redirect);
  }, [redirect]);

  const sendMagicLinkMutation = trpc.auth.sendMagicLink.useMutation({
    onSuccess: () => {
      // Redirect to check-email page
      setLocation(`/check-email?email=${encodeURIComponent(email)}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send magic link. Please try again.");
    },
  });

  const handleGoogleSignIn = () => {
    if (!isLocal) {
      toast.error("Please confirm you're a local and not a kook");
      return;
    }
    window.location.href = "/api/auth/google";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double submission
    if (sendMagicLinkMutation.isPending) {
      return;
    }

    // Check local verification
    if (!isLocal) {
      toast.error("Please confirm you're a local and not a kook");
      return;
    }

    // Basic validation
    if (!email.trim()) {
      toast.error("Please enter your email");
      return;
    }
    if (!email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    sendMagicLinkMutation.mutate({
      email: email.trim().toLowerCase(),
      redirect: redirect ?? undefined,
    });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="border-b border-black">
        <div className="container py-1">
          <div className="flex items-center justify-between">
            <Logo
              logoSize="h-10 sm:h-12"
              textColor="text-black hover:text-gray-600"
              showLink={true}
            />
            <button
              onClick={() => setLocation("/")}
              className="text-black hover:text-gray-600 transition-colors text-sm uppercase tracking-wide"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="w-full max-w-md">
          {/* Login Card */}
          <div className="bg-white border-2 border-black p-6 sm:p-8 md:p-10">
            {/* Header */}
            <div className="mb-5 sm:mb-6">
              <h1
                className="text-3xl sm:text-4xl font-black text-black uppercase tracking-tight leading-[0.95] mb-3"
                style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
              >
                Access Verified Local Intel
              </h1>
              <div
                className="inline-flex items-center mt-3 px-2.5 py-1 border border-gray-300 text-[10px] uppercase tracking-wider text-gray-600"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                Founding Access • First 40+ NYC Locals
              </div>
            </div>

            {/* Local Verification Checkbox */}
            <div className="mb-5">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={isLocal}
                  onChange={(e) => setIsLocal(e.target.checked)}
                  className="w-5 h-5 border-2 border-black rounded-none cursor-pointer accent-black"
                />
                <span
                  className="text-sm text-gray-700 select-none group-hover:text-black transition-colors"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  I'm a local and I'm not a kook.
                </span>
              </label>
            </div>

            {/* Google Sign In */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={!isLocal}
              className={`w-full border-2 rounded-none py-4 text-sm sm:text-base transition-colors flex items-center justify-center gap-3 ${
                isLocal
                  ? "border-black bg-white hover:bg-gray-50 cursor-pointer"
                  : "border-gray-300 bg-gray-100 cursor-not-allowed opacity-60"
              }`}
              style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className={isLocal ? "text-gray-700 font-medium" : "text-gray-400 font-medium"}>Continue with Google</span>
            </button>

            {/* Or Divider */}
            <div className="relative my-3 sm:my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-wide">
                <span
                  className="bg-white px-4 text-gray-400"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  Or
                </span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-2.5 sm:space-y-3">
              {/* Email Input */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-bold uppercase tracking-wider text-black mb-1.5"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="border-2 border-black rounded-none focus:ring-2 focus:ring-black focus:ring-offset-0"
                  disabled={!isLocal || sendMagicLinkMutation.isPending}
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={!isLocal || sendMagicLinkMutation.isPending}
                className="w-full bg-black text-white hover:bg-gray-800 border-2 border-black rounded-none uppercase tracking-wide font-bold py-5 text-sm sm:text-base mt-2 sm:mt-3 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {sendMagicLinkMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending Link...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Mail className="h-4 w-4" />
                    Send Secure Link
                  </span>
                )}
              </Button>
            </form>

            {/* Info Text */}
            <div className="mt-2 sm:mt-3">
              <p
                className="text-xs text-gray-500 text-center"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                We'll email you a secure link to sign in. No password needed.
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
