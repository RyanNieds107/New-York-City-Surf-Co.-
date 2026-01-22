import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Loader2, Mail } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");

  const sendMagicLinkMutation = trpc.auth.sendMagicLink.useMutation({
    onSuccess: () => {
      // Redirect to check-email page
      setLocation(`/check-email?email=${encodeURIComponent(email)}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send magic link. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (sendMagicLinkMutation.isPending) {
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
    });
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
            <div className="mb-6 sm:mb-8">
              <h1
                className="text-3xl sm:text-4xl md:text-5xl font-black text-black uppercase tracking-tight mb-2"
                style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
              >
                Members Portal
              </h1>
              <p
                className="text-sm text-gray-600"
                style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
              >
                Enter your email to receive a secure login link
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
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
                  disabled={sendMagicLinkMutation.isPending}
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={sendMagicLinkMutation.isPending}
                className="w-full bg-black text-white hover:bg-gray-800 border-2 border-black rounded-none uppercase tracking-wide font-bold py-6 text-sm sm:text-base mt-6 sm:mt-8"
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
                    Send Magic Link
                  </span>
                )}
              </Button>
            </form>

            {/* Info Text */}
            <div className="mt-6 sm:mt-8">
              <p
                className="text-xs text-gray-500 text-center"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                We'll email you a secure link to sign in. No password needed.
              </p>
            </div>

            {/* Or Divider */}
            <div className="relative my-6 sm:my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-gray-200"></div>
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

            {/* Google Sign In */}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                window.location.href = "/api/auth/google";
              }}
              className="w-full border-2 border-black rounded-none py-6 text-sm sm:text-base hover:bg-gray-50 transition-colors flex items-center justify-center gap-3"
              style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="text-gray-700 font-medium">Continue with Google</span>
            </Button>

            {/* Divider */}
            <div className="relative my-6 sm:my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-wide">
                <span
                  className="bg-white px-4 text-gray-400"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  New here?
                </span>
              </div>
            </div>

            {/* Sign Up Note */}
            <div className="text-center">
              <p
                className="text-sm text-gray-600"
                style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
              >
                Just enter your email above. If you don't have an account, we'll create one for you automatically.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
