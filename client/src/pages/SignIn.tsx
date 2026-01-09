import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Loader2 } from "lucide-react";
import { getLoginUrl } from "@/const";

export default function SignIn() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const signUpMutation = trpc.auth.signUp.useMutation({
    onSuccess: async () => {
      toast.success("Account created successfully!");
      // Invalidate auth state to refresh user info
      await utils.auth.me.invalidate();
      // Redirect to welcome page after successful sign-up
      setLocation("/welcome");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create account. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (signUpMutation.isPending) {
      return;
    }
    
    // Basic validation
    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!email.trim()) {
      toast.error("Please enter your email");
      return;
    }
    if (!email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (!phone.trim()) {
      toast.error("Please enter your phone number");
      return;
    }

    // Basic phone validation (remove non-digits and check length)
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 10) {
      toast.error("Please enter a valid phone number");
      return;
    }

    signUpMutation.mutate({
      name: name.trim(),
      email: email.trim(),
      phone: phoneDigits,
    });
  };

  const formatPhoneInput = (value: string) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, "");
    
    // Format as (XXX) XXX-XXXX
    if (digits.length <= 3) {
      return digits;
    } else if (digits.length <= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneInput(e.target.value);
    setPhone(formatted);
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
          {/* Sign In Card */}
          <div className="bg-white border-2 border-black p-6 sm:p-8 md:p-10">
            {/* Header */}
            <div className="mb-6 sm:mb-8">
              <h1
                className="text-3xl sm:text-4xl md:text-5xl font-black text-black uppercase tracking-tight mb-2"
                style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
              >
                Sign Up
              </h1>
              <p
                className="text-sm text-gray-600"
                style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
              >
                Create an account to get swell alerts and track your sessions
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              {/* Name Input */}
              <div>
                <label
                  htmlFor="name"
                  className="block text-xs font-bold uppercase tracking-wider text-black mb-1.5"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  Name
                </label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  required
                  className="border-2 border-black rounded-none focus:ring-2 focus:ring-black focus:ring-offset-0"
                  disabled={signUpMutation.isPending}
                />
              </div>

              {/* Email Input */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-bold uppercase tracking-wider text-black mb-1.5"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  required
                  className="border-2 border-black rounded-none focus:ring-2 focus:ring-black focus:ring-offset-0"
                  disabled={signUpMutation.isPending}
                />
              </div>

              {/* Phone Input */}
              <div>
                <label
                  htmlFor="phone"
                  className="block text-xs font-bold uppercase tracking-wider text-black mb-1.5"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  Phone Number
                </label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="(555) 123-4567"
                  required
                  maxLength={14}
                  className="border-2 border-black rounded-none focus:ring-2 focus:ring-black focus:ring-offset-0"
                  disabled={signUpMutation.isPending}
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={signUpMutation.isPending}
                className="w-full bg-black text-white hover:bg-gray-800 border-2 border-black rounded-none uppercase tracking-wide font-bold py-6 text-sm sm:text-base mt-6 sm:mt-8"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {signUpMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating Account...
                  </span>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6 sm:my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-black"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-wide">
                <span
                  className="bg-white px-4 text-gray-600"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  Or
                </span>
              </div>
            </div>

            {/* OAuth Option */}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                window.location.href = getLoginUrl();
              }}
              className="w-full border-2 border-black rounded-none uppercase tracking-wide font-bold py-6 text-sm sm:text-base hover:bg-black hover:text-white transition-colors"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              Sign In with OAuth
            </Button>
          </div>

          {/* Footer Text */}
          <p
            className="mt-6 text-center text-xs text-gray-500"
            style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
          >
            By signing up, you agree to our{" "}
            <a
              href="/terms"
              className="underline hover:text-black transition-colors"
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              href="/privacy"
              className="underline hover:text-black transition-colors"
            >
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

