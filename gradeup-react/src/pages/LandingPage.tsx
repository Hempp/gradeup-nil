import { athletes } from '../data/mockData';
import { AthleteCard } from '../components/AthleteCard';
import { Award, Shield, Zap, TrendingUp, BarChart3, FileText, CheckCircle, ArrowRight } from 'lucide-react';

interface LandingPageProps {
  onNavigate: (section: string) => void;
  onDashboard: (type: 'director' | 'athlete' | 'brand') => void;
}

export function LandingPage({ onNavigate, onDashboard }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#007AFF]/10 via-transparent to-transparent" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#007AFF]/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-[#5856D6]/20 rounded-full blur-3xl" />

        <div className="max-w-7xl mx-auto relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#12121a] border border-[#1e1e2e] rounded-full mb-8">
              <Award className="text-yellow-400" size={16} />
              <span className="text-sm text-[#a1a1aa]">Where Academic Excellence Meets NIL Opportunity</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Empowering
              <span className="bg-gradient-to-r from-[#007AFF] to-[#5856D6] bg-clip-text text-transparent"> Student-Athletes </span>
              Through NIL
            </h1>

            <p className="text-xl text-[#a1a1aa] mb-8 max-w-2xl mx-auto">
              GradeUp NIL connects high-achieving student-athletes with brands that value both athletic performance and academic excellence. Powered by StatsTaq for real-time performance data.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => onDashboard('athlete')}
                className="px-8 py-4 bg-gradient-to-r from-[#007AFF] to-[#5856D6] text-white font-semibold rounded-xl hover:opacity-90 transition flex items-center justify-center gap-2"
              >
                I'm an Athlete
                <ArrowRight size={20} />
              </button>
              <button
                onClick={() => onDashboard('brand')}
                className="px-8 py-4 bg-[#12121a] border border-[#1e1e2e] text-white font-semibold rounded-xl hover:bg-[#1e1e2e] transition flex items-center justify-center gap-2"
              >
                I'm a Brand / Donor
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Banner */}
      <section className="py-12 px-6 bg-[#12121a] border-y border-[#1e1e2e]">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: '2,500+', label: 'Athletes' },
            { value: '$15M+', label: 'NIL Deals Facilitated' },
            { value: '3.4', label: 'Average GPA' },
            { value: '500+', label: 'Brand Partners' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-white">{stat.value}</p>
              <p className="text-[#a1a1aa]">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Athletes Section */}
      <section id="athletes" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Featured Athletes</h2>
            <p className="text-[#a1a1aa] max-w-2xl mx-auto">
              Discover top-performing student-athletes with verified GPAs and real-time stats from StatsTaq.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {athletes.slice(0, 6).map((athlete) => (
              <AthleteCard key={athlete.id} athlete={athlete} />
            ))}
          </div>

          <div className="text-center mt-12">
            <button
              onClick={() => onDashboard('brand')}
              className="px-8 py-4 bg-[#007AFF] text-white font-semibold rounded-xl hover:bg-[#0056CC] transition"
            >
              Browse All Athletes
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-[#12121a]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Why GradeUp NIL?</h2>
            <p className="text-[#a1a1aa] max-w-2xl mx-auto">
              A complete platform for managing NIL opportunities with academic integrity at its core.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Award,
                title: 'GPA-First Approach',
                description: 'We prominently display and verify academic performance, ensuring brands partner with student-athletes who excel in the classroom.',
              },
              {
                icon: BarChart3,
                title: 'StatsTaq Integration',
                description: 'Real-time athletic performance data powered by StatsTaq gives brands accurate insights into athlete capabilities.',
              },
              {
                icon: FileText,
                title: 'Smart Contracts',
                description: 'Create transparent, task-based contracts between athletes and brands with milestone payments and performance tracking.',
              },
              {
                icon: Shield,
                title: 'NCAA Compliant',
                description: 'Built-in compliance tools help athletic directors and athletes navigate NIL regulations with confidence.',
              },
              {
                icon: Zap,
                title: 'Instant Payments',
                description: 'Athletes receive payments automatically when contract tasks are verified and completed.',
              },
              {
                icon: TrendingUp,
                title: 'NIL Valuation',
                description: 'Data-driven NIL valuations based on social reach, athletic performance, and academic standing.',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="bg-[#0a0a0f] border border-[#1e1e2e] rounded-2xl p-6 hover:border-[#007AFF] transition"
              >
                <div className="w-12 h-12 bg-[#007AFF]/20 rounded-xl flex items-center justify-center mb-4">
                  <feature.icon className="text-[#007AFF]" size={24} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-[#a1a1aa]">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">How It Works</h2>
            <p className="text-[#a1a1aa] max-w-2xl mx-auto">
              Simple steps to connect athletes with meaningful NIL opportunities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: '1', title: 'Create Profile', desc: 'Athletes build profiles with GPA verification and StatsTaq stats' },
              { step: '2', title: 'Get Discovered', desc: 'Brands search and filter athletes by sport, GPA, and performance' },
              { step: '3', title: 'Sign Contracts', desc: 'Create transparent smart contracts with task-based milestones' },
              { step: '4', title: 'Get Paid', desc: 'Complete tasks and receive instant, verified payments' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-[#007AFF] to-[#5856D6] rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-white">{item.step}</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-[#a1a1aa]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6 bg-[#12121a]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Simple Pricing</h2>
            <p className="text-[#a1a1aa] max-w-2xl mx-auto">
              Choose the plan that fits your needs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                name: 'Athlete',
                price: 'Free',
                desc: 'For student-athletes',
                features: ['Create verified profile', 'StatsTaq integration', 'Unlimited contract offers', 'Payment processing'],
              },
              {
                name: 'Brand',
                price: '$99',
                period: '/mo',
                desc: 'For brands and donors',
                features: ['Search all athletes', 'Create unlimited contracts', 'Analytics dashboard', 'Priority support'],
                popular: true,
              },
              {
                name: 'Institution',
                price: 'Custom',
                desc: 'For athletic departments',
                features: ['Director dashboard', 'Compliance tools', 'Bulk athlete management', 'Custom integrations'],
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`bg-[#0a0a0f] border rounded-2xl p-6 relative ${
                  plan.popular ? 'border-[#007AFF]' : 'border-[#1e1e2e]'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#007AFF] text-white text-xs font-semibold rounded-full">
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                <p className="text-[#a1a1aa] text-sm mb-4">{plan.desc}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  {plan.period && <span className="text-[#a1a1aa]">{plan.period}</span>}
                </div>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-[#a1a1aa]">
                      <CheckCircle size={16} className="text-green-400" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  className={`w-full py-3 rounded-xl font-semibold transition ${
                    plan.popular
                      ? 'bg-[#007AFF] text-white hover:bg-[#0056CC]'
                      : 'bg-[#1e1e2e] text-white hover:bg-[#2e2e3e]'
                  }`}
                >
                  Get Started
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Transform Your NIL Journey?
          </h2>
          <p className="text-[#a1a1aa] mb-8">
            Join thousands of student-athletes and brands already using GradeUp NIL.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => onDashboard('athlete')}
              className="px-8 py-4 bg-gradient-to-r from-[#007AFF] to-[#5856D6] text-white font-semibold rounded-xl hover:opacity-90 transition"
            >
              Start as Athlete
            </button>
            <button
              onClick={() => onDashboard('brand')}
              className="px-8 py-4 bg-[#12121a] border border-[#1e1e2e] text-white font-semibold rounded-xl hover:bg-[#1e1e2e] transition"
            >
              Start as Brand
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-[#12121a] border-t border-[#1e1e2e]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-2xl font-bold">
              <span className="text-white">GRADEUP</span>
              <span className="text-[#007AFF]"> NIL</span>
            </div>
            <div className="flex gap-8 text-[#a1a1aa]">
              <button onClick={() => onNavigate('features')} className="hover:text-white transition">Features</button>
              <button onClick={() => onNavigate('athletes')} className="hover:text-white transition">Athletes</button>
              <button onClick={() => onNavigate('pricing')} className="hover:text-white transition">Pricing</button>
              <a href="https://statstaq.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">StatsTaq</a>
            </div>
            <p className="text-[#a1a1aa] text-sm">© 2025 GradeUp NIL. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
