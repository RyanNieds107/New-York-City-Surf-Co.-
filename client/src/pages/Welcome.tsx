import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";
import { CheckCircle2, Users, Bell, MessageSquare, ArrowRight } from "lucide-react";

export default function Welcome() {
  const [, setLocation] = useLocation();

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
      <div className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 w-full">
        {/* Welcome Header */}
        <div className="text-center mb-12 sm:mb-16">
          <div className="flex justify-center mb-6">
            <CheckCircle2 className="h-16 w-16 sm:h-20 sm:w-20 text-green-600" />
          </div>
          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-black text-black uppercase tracking-tight mb-4"
            style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
          >
            Welcome to the Community
          </h1>
          <p
            className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto"
            style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
          >
            You're all set! Get real-time alerts, share conditions, and connect with fellow NYC surfers.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-12">
          {/* Alerts */}
          <div className="bg-white border-2 border-black p-6 sm:p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-black rounded-none">
                <Bell className="h-6 w-6 text-white" />
              </div>
              <h2
                className="text-2xl sm:text-3xl font-bold uppercase"
                style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
              >
                Alerts
              </h2>
            </div>
            <p
              className="text-gray-700 mb-4"
              style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
            >
              Don't miss a session. Sign up for swell notifications and get alerted when conditions are right.
            </p>
          </div>

          {/* Crowd Intel */}
          <div className="bg-white border-2 border-black p-6 sm:p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-black rounded-none">
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
              <h2
                className="text-2xl sm:text-3xl font-bold uppercase"
                style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
              >
                Crowd Intel
              </h2>
            </div>
            <p
              className="text-gray-700 mb-4"
              style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
            >
              Real-time lineup reports. Know before you go. Share and see what's happening at each spot.
            </p>
          </div>

          {/* Community */}
          <div className="bg-white border-2 border-black p-6 sm:p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-black rounded-none">
                <Users className="h-6 w-6 text-white" />
              </div>
              <h2
                className="text-2xl sm:text-3xl font-bold uppercase"
                style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
              >
                Community
              </h2>
            </div>
            <p
              className="text-gray-700 mb-4"
              style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
            >
              The scene, centralized. Post waves, compare notes, and see what's working.
            </p>
          </div>

          {/* Session Logs */}
          <div className="bg-white border-2 border-black p-6 sm:p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-black rounded-none">
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
              <h2
                className="text-2xl sm:text-3xl font-bold uppercase"
                style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
              >
                Session Logs
              </h2>
            </div>
            <p
              className="text-gray-700 mb-4"
              style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
            >
              Post waves, compare notes, see what's working. Track your sessions and learn from the community.
            </p>
          </div>
        </div>

        {/* CTA Button */}
        <div className="text-center">
          <Button
            onClick={() => setLocation("/members")}
            className="bg-black text-white hover:bg-gray-800 border-2 border-black rounded-none uppercase tracking-wide font-bold py-6 px-12 text-base sm:text-lg"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            Go to Members Portal
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>

      <Footer />
    </div>
  );
}

