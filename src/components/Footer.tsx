import { Link } from "react-router-dom";
import { Home, Facebook, Twitter, Instagram, Linkedin } from "lucide-react";

export function Footer() {
  const footerLinks = {
    company: [
      { label: "About", href: "/about" },
      { label: "How It Works", href: "/#how-it-works" },
      { label: "Blog", href: "/blog" },
      { label: "Contact", href: "/contact" }
    ],
    legal: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Safe Renting Policy", href: "/safe-renting" },
      { label: "FAQ", href: "/faq" }
    ],
    services: [
      { label: "List Property", href: "/list-property" },
      { label: "Find Rental", href: "/properties" },
      { label: "Pricing", href: "/pricing" },
      { label: "Maintenance", href: "/maintenance" }
    ]
  };

  const socialLinks = [
    { icon: Facebook, href: "https://facebook.com/swiftrent", label: "Facebook" },
    { icon: Twitter, href: "https://twitter.com/swiftrent", label: "Twitter" },
    { icon: Instagram, href: "https://instagram.com/swiftrent", label: "Instagram" },
    { icon: Linkedin, href: "https://linkedin.com/company/swiftrent", label: "LinkedIn" }
  ];

  return (
    <footer className="bg-gradient-to-br from-foreground to-muted-foreground text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center space-x-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-ocean-blue to-success-green rounded-lg flex items-center justify-center">
                <Home className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold">SwiftRent</span>
            </Link>
            <p className="text-white/80 mb-6 max-w-sm">
              Safe, Simple, Commission-Free Renting. Direct landlord-tenant connections with full verification and peace of mind.
            </p>
            <div className="flex space-x-4">
              {socialLinks.map((social, index) => (
                <a 
                  key={index}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors duration-300"
                  aria-label={social.label}
                >
                  <social.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Company</h3>
            <ul className="space-y-2">
              {footerLinks.company.map((link, index) => (
                <li key={index}>
                  <Link 
                    to={link.href}
                    className="text-white/80 hover:text-white transition-colors duration-300"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Services</h3>
            <ul className="space-y-2">
              {footerLinks.services.map((link, index) => (
                <li key={index}>
                  <Link 
                    to={link.href}
                    className="text-white/80 hover:text-white transition-colors duration-300"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              {footerLinks.legal.map((link, index) => (
                <li key={index}>
                  <Link 
                    to={link.href}
                    className="text-white/80 hover:text-white transition-colors duration-300"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-white/20 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-white/60 text-sm mb-4 md:mb-0">
            © 2024 SwiftRent.co.za. All rights reserved.
          </p>
          <p className="text-white/60 text-sm">
            Made with ❤️ in South Africa
          </p>
        </div>
      </div>
    </footer>
  );
}