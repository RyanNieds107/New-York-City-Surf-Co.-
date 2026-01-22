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
              className="w-full border-2 border-black rounded-none uppercase tracking-wide font-bold py-6 text-sm sm:text-base hover:bg-black hover:text-white transition-colors"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              Sign In with Google
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
