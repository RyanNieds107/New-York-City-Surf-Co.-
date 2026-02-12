import { Link } from "wouter";
import { Instagram, Facebook, Compass, Share2, FileText } from "lucide-react";
import { Logo } from "./Logo";
import { useAuth } from "@/_core/hooks/useAuth";

export function Footer() {
  const { isAuthenticated } = useAuth();

  return (
    <footer className="bg-white border-t-2 border-black mt-auto">
      {/* Main Footer Content */}
      <div className="container py-4 md:py-6">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8">

          {/* Brand Column - Hidden on mobile */}
          <div className="hidden md:block">
            <div className="flex flex-col gap-4">
              <Logo
                logoSize="h-14"
                textSize="text-lg"
                textColor="text-black"
                showLink={false}
              />
              <p
                className="text-sm text-slate-600"
                style={{ 
                  fontFamily: "'Inter', 'Roboto', sans-serif",
                  margin: 0
                }}
              >
                Hyper-local surf forecasting for NYC surfers.
              </p>
            </div>
          </div>

          {/* Right-aligned columns */}
          <div className="flex flex-row gap-3 md:gap-12 w-full md:w-auto justify-between md:justify-start">
            {/* Quick Links */}
            <div>
              <div className="flex items-center gap-1 md:gap-2 mb-2 md:mb-4">
                <div className="w-5 h-5 md:w-6 md:h-6 bg-black flex items-center justify-center">
                  <Compass className="w-2.5 h-2.5 md:w-3 md:h-3 text-white" />
                </div>
                <span
                  className="text-[8px] md:text-[10px] font-medium tracking-widest text-gray-500 uppercase"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  Navigate
                </span>
              </div>
              <ul className="space-y-1 md:space-y-2">
                <li>
                  <Link
                    href="/Our Mission"
                    className="text-xs md:text-sm text-black hover:bg-black hover:text-white px-1 py-0.5 md:px-2 md:py-1 -ml-1 md:-ml-2 transition-colors inline-block font-medium"
                    style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
                  >
                     Our Mission
                  </Link>
                </li>
                {!isAuthenticated && (
                  <li>
                    <Link
                      href="/login"
                      className="text-xs md:text-sm text-black hover:bg-black hover:text-white px-1 py-0.5 md:px-2 md:py-1 -ml-1 md:-ml-2 transition-colors inline-block font-medium"
                      style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
                    >
                      Sign In
                    </Link>
                  </li>
                )}
              </ul>
            </div>

            {/* Social */}
            <div>
              <div className="flex items-center gap-1 md:gap-2 mb-2 md:mb-4">
                <div className="w-5 h-5 md:w-6 md:h-6 bg-black flex items-center justify-center">
                  <Share2 className="w-2.5 h-2.5 md:w-3 md:h-3 text-white" />
                </div>
                <span
                  className="text-[8px] md:text-[10px] font-medium tracking-widest text-gray-500 uppercase"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  Connect
                </span>
              </div>
              <ul className="space-y-1 md:space-y-2">
                <li>
                  <a
                    href="https://www.instagram.com/nycsurfco/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 md:gap-2 text-xs md:text-sm text-black hover:bg-black hover:text-white px-1 py-0.5 md:px-2 md:py-1 -ml-1 md:-ml-2 transition-colors font-medium"
                    style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
                  >
                    <Instagram className="h-3 w-3 md:h-4 md:w-4" />
                    Instagram
                  </a>
                </li>
                <li>
                  <a
                    href="https://facebook.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 md:gap-2 text-xs md:text-sm text-black hover:bg-black hover:text-white px-1 py-0.5 md:px-2 md:py-1 -ml-1 md:-ml-2 transition-colors font-medium"
                    style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
                  >
                    <Facebook className="h-3 w-3 md:h-4 md:w-4" />
                    Facebook
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <div className="flex items-center gap-1 md:gap-2 mb-2 md:mb-4">
                <div className="w-5 h-5 md:w-6 md:h-6 bg-black flex items-center justify-center">
                  <FileText className="w-2.5 h-2.5 md:w-3 md:h-3 text-white" />
                </div>
                <span
                  className="text-[8px] md:text-[10px] font-medium tracking-widest text-gray-500 uppercase"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  Legal
                </span>
              </div>
              <ul className="space-y-1 md:space-y-2">
                <li>
                  <Link
                    href="/terms"
                    className="text-xs md:text-sm text-black hover:bg-black hover:text-white px-1 py-0.5 md:px-2 md:py-1 -ml-1 md:-ml-2 transition-colors inline-block font-medium"
                    style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
                  >
                    Terms
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy"
                    className="text-xs md:text-sm text-black hover:bg-black hover:text-white px-1 py-0.5 md:px-2 md:py-1 -ml-1 md:-ml-2 transition-colors inline-block font-medium"
                    style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
                  >
                    Privacy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright Bar */}
      <div className="bg-white">
        <div className="container py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-2">
            <p
              className="text-[10px] tracking-widest text-gray-600 uppercase"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              © 2026 New York City Surf Co.
            </p>
            <p
              className="text-[10px] tracking-widest text-gray-600 uppercase"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              Made in NYC
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

