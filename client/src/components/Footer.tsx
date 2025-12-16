import { Link } from "wouter";
import { Waves, Instagram, Twitter } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-gray-50 border-t-2 border-black mt-auto">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Waves className="h-6 w-6 text-black" />
              <h3 className="text-xl font-bold text-black" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                New York City Surf Co.
              </h3>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
              Hyper-local surf forecasting for NYC surfers
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-4" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
              Quick Links
            </h4>
            <ul className="space-y-3">
              <li>
                <Link 
                  href="/dashboard"
                  className="text-sm text-black hover:text-gray-700 transition-colors" 
                  style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
                >
                  Dashboard
                </Link>
              </li>
              <li>
                <Link 
                  href="/about"
                  className="text-sm text-black hover:text-gray-700 transition-colors" 
                  style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
                >
                  About
                </Link>
              </li>
              <li>
                <Link 
                  href="/contact"
                  className="text-sm text-black hover:text-gray-700 transition-colors" 
                  style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Social & Legal */}
          <div>
            <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-4" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
              Social & Legal
            </h4>
            <ul className="space-y-3">
              <li>
                <a 
                  href="https://instagram.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-black hover:text-gray-700 transition-colors"
                  style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
                >
                  <Instagram className="h-4 w-4" />
                  Instagram
                </a>
              </li>
              <li>
                <a 
                  href="https://twitter.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-black hover:text-gray-700 transition-colors"
                  style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
                >
                  <Twitter className="h-4 w-4" />
                  Twitter/X
                </a>
              </li>
              <li>
                <Link 
                  href="/terms"
                  className="text-sm text-black hover:text-gray-700 transition-colors" 
                  style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
                >
                  Terms
                </Link>
              </li>
              <li>
                <Link 
                  href="/privacy"
                  className="text-sm text-black hover:text-gray-700 transition-colors" 
                  style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
                >
                  Privacy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="pt-8 border-t border-gray-300">
          <p className="text-xs text-gray-600" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
            © 2025 New York City Surf Co.
          </p>
        </div>
      </div>
    </footer>
  );
}

