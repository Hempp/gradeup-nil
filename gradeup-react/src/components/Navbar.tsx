import { Menu, X } from 'lucide-react';
import { useState } from 'react';

interface NavbarProps {
  onNavigate: (section: string) => void;
  onDashboard: (type: 'director' | 'athlete' | 'brand') => void;
}

export function Navbar({ onNavigate, onDashboard }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/90 backdrop-blur-lg border-b border-[#1e1e2e]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div
            className="text-2xl font-bold cursor-pointer"
            onClick={() => onNavigate('home')}
          >
            <span className="text-white">GRADEUP</span>
            <span className="text-[#007AFF]"> NIL</span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => onNavigate('athletes')} className="text-[#a1a1aa] hover:text-white transition">
              Athletes
            </button>
            <button onClick={() => onNavigate('features')} className="text-[#a1a1aa] hover:text-white transition">
              Features
            </button>
            <button onClick={() => onNavigate('pricing')} className="text-[#a1a1aa] hover:text-white transition">
              Pricing
            </button>

            {/* Dashboard Dropdown */}
            <div className="relative group">
              <button className="text-[#a1a1aa] hover:text-white transition flex items-center gap-1">
                Dashboards
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="absolute top-full right-0 mt-2 w-56 bg-[#12121a] border border-[#1e1e2e] rounded-xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <button
                  onClick={() => onDashboard('director')}
                  className="w-full px-4 py-3 text-left text-[#a1a1aa] hover:text-white hover:bg-[#1e1e2e] transition"
                >
                  🎓 Athletic Director
                </button>
                <button
                  onClick={() => onDashboard('athlete')}
                  className="w-full px-4 py-3 text-left text-[#a1a1aa] hover:text-white hover:bg-[#1e1e2e] transition"
                >
                  🏆 Athlete Portal
                </button>
                <button
                  onClick={() => onDashboard('brand')}
                  className="w-full px-4 py-3 text-left text-[#a1a1aa] hover:text-white hover:bg-[#1e1e2e] transition"
                >
                  🏢 Brand / Donor
                </button>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <button className="px-4 py-2 text-white border border-[#1e1e2e] rounded-xl hover:bg-[#1e1e2e] transition">
              Log In
            </button>
            <button className="px-4 py-2 bg-[#007AFF] text-white rounded-xl hover:bg-[#0056CC] transition">
              Get Started
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#12121a] border-t border-[#1e1e2e]">
          <div className="px-6 py-4 space-y-4">
            <button onClick={() => { onNavigate('athletes'); setMobileMenuOpen(false); }} className="block w-full text-left text-white py-2">
              Athletes
            </button>
            <button onClick={() => { onNavigate('features'); setMobileMenuOpen(false); }} className="block w-full text-left text-white py-2">
              Features
            </button>
            <button onClick={() => { onNavigate('pricing'); setMobileMenuOpen(false); }} className="block w-full text-left text-white py-2">
              Pricing
            </button>
            <div className="border-t border-[#1e1e2e] pt-4">
              <p className="text-xs text-[#a1a1aa] uppercase mb-2">Dashboards</p>
              <button onClick={() => { onDashboard('director'); setMobileMenuOpen(false); }} className="block w-full text-left text-white py-2">
                🎓 Athletic Director
              </button>
              <button onClick={() => { onDashboard('athlete'); setMobileMenuOpen(false); }} className="block w-full text-left text-white py-2">
                🏆 Athlete Portal
              </button>
              <button onClick={() => { onDashboard('brand'); setMobileMenuOpen(false); }} className="block w-full text-left text-white py-2">
                🏢 Brand / Donor
              </button>
            </div>
            <div className="border-t border-[#1e1e2e] pt-4 flex gap-4">
              <button className="flex-1 py-2 text-white border border-[#1e1e2e] rounded-xl">
                Log In
              </button>
              <button className="flex-1 py-2 bg-[#007AFF] text-white rounded-xl">
                Get Started
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
