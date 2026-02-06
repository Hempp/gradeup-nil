import { useState } from 'react';
import { athletes, sampleContracts } from '../data/mockData';
import { AthleteCard } from '../components/AthleteCard';
import { ArrowLeft, Search, AlertTriangle, CheckCircle, Users, DollarSign, GraduationCap, BarChart3 } from 'lucide-react';

interface DirectorDashboardProps {
  onBack: () => void;
}

export function DirectorDashboard({ onBack }: DirectorDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'athletes' | 'compliance' | 'reports'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [gpaFilter, setGpaFilter] = useState<'all' | 'at-risk' | 'excellent'>('all');

  // Filter athletes based on search and GPA filter
  const filteredAthletes = athletes.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          a.sport.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGPA = gpaFilter === 'all' ||
                       (gpaFilter === 'at-risk' && a.gpa < 2.5) ||
                       (gpaFilter === 'excellent' && a.gpa >= 3.5);
    return matchesSearch && matchesGPA;
  });

  // Calculate statistics
  const averageGPA = athletes.reduce((sum, a) => sum + a.gpa, 0) / athletes.length;
  const atRiskCount = athletes.filter(a => a.gpa < 2.5).length;
  const totalNILValue = athletes.reduce((sum, a) => sum + a.nilValue, 0);
  const activeContracts = sampleContracts.filter(c => c.status === 'active').length;
  const totalContractValue = sampleContracts.reduce((sum, c) => sum + c.totalValue, 0);

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <div className="bg-[#12121a] border-b border-[#1e1e2e]">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[#a1a1aa] hover:text-white transition mb-4"
          >
            <ArrowLeft size={20} />
            Back to Home
          </button>

          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-gradient-to-br from-[#007AFF] to-[#5856D6] rounded-2xl flex items-center justify-center">
              <GraduationCap size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Athletic Director Dashboard</h1>
              <p className="text-[#a1a1aa]">GradeUp NIL Program Management</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-6 mt-6">
            {(['overview', 'athletes', 'compliance', 'reports'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-2 text-sm font-medium capitalize transition ${
                  activeTab === tab
                    ? 'text-white border-b-2 border-[#007AFF]'
                    : 'text-[#a1a1aa] hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <Users className="text-blue-400" size={20} />
                  </div>
                  <span className="text-[#a1a1aa] text-sm">Total Athletes</span>
                </div>
                <p className="text-3xl font-bold text-white">{athletes.length}</p>
              </div>

              <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <GraduationCap className="text-green-400" size={20} />
                  </div>
                  <span className="text-[#a1a1aa] text-sm">Average GPA</span>
                </div>
                <p className="text-3xl font-bold text-white">{averageGPA.toFixed(2)}</p>
              </div>

              <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                    <AlertTriangle className="text-yellow-400" size={20} />
                  </div>
                  <span className="text-[#a1a1aa] text-sm">At-Risk (GPA &lt; 2.5)</span>
                </div>
                <p className="text-3xl font-bold text-white">{atRiskCount}</p>
              </div>

              <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                    <DollarSign className="text-purple-400" size={20} />
                  </div>
                  <span className="text-[#a1a1aa] text-sm">Total NIL Value</span>
                </div>
                <p className="text-3xl font-bold text-white">${(totalNILValue / 1000000).toFixed(1)}M</p>
              </div>
            </div>

            {/* GPA Distribution */}
            <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-6">GPA Distribution</h3>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { range: '3.5 - 4.0', count: athletes.filter(a => a.gpa >= 3.5).length, color: 'bg-green-500' },
                  { range: '3.0 - 3.49', count: athletes.filter(a => a.gpa >= 3.0 && a.gpa < 3.5).length, color: 'bg-blue-500' },
                  { range: '2.5 - 2.99', count: athletes.filter(a => a.gpa >= 2.5 && a.gpa < 3.0).length, color: 'bg-yellow-500' },
                  { range: 'Below 2.5', count: athletes.filter(a => a.gpa < 2.5).length, color: 'bg-red-500' },
                ].map((item) => (
                  <div key={item.range} className="text-center">
                    <div className="h-32 bg-[#0a0a0f] rounded-xl flex items-end justify-center p-4">
                      <div
                        className={`w-full ${item.color} rounded-lg transition-all`}
                        style={{ height: `${(item.count / athletes.length) * 100}%`, minHeight: item.count > 0 ? '20px' : '0' }}
                      />
                    </div>
                    <p className="text-white font-bold mt-2">{item.count}</p>
                    <p className="text-xs text-[#a1a1aa]">{item.range}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* NIL Activity Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Active Contracts</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[#a1a1aa]">Total Active</span>
                    <span className="text-white font-bold">{activeContracts}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#a1a1aa]">Total Value</span>
                    <span className="text-green-400 font-bold">${totalContractValue.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#a1a1aa]">Pending Approval</span>
                    <span className="text-yellow-400 font-bold">{sampleContracts.filter(c => c.status === 'pending_signature').length}</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Top Performers</h3>
                <div className="space-y-3">
                  {athletes
                    .sort((a, b) => b.gpa - a.gpa)
                    .slice(0, 3)
                    .map((athlete, i) => (
                      <div key={athlete.id} className="flex items-center gap-3">
                        <span className="w-6 h-6 bg-[#007AFF] rounded-full flex items-center justify-center text-xs text-white font-bold">
                          {i + 1}
                        </span>
                        <img src={athlete.photo} alt={athlete.name} className="w-8 h-8 rounded-full" />
                        <div className="flex-1">
                          <p className="text-white text-sm font-medium">{athlete.name}</p>
                          <p className="text-[#a1a1aa] text-xs">{athlete.sport}</p>
                        </div>
                        <span className="gpa-badge text-xs">
                          {athlete.gpa.toFixed(2)} GPA
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'athletes' && (
          <div className="animate-fadeIn">
            {/* Search & Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#a1a1aa]" size={20} />
                <input
                  type="text"
                  placeholder="Search athletes by name or sport..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-[#12121a] border border-[#1e1e2e] rounded-xl text-white placeholder-[#a1a1aa] focus:border-[#007AFF] focus:outline-none"
                />
              </div>

              <div className="flex gap-2">
                {(['all', 'at-risk', 'excellent'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setGpaFilter(filter)}
                    className={`px-4 py-3 rounded-xl text-sm font-medium transition ${
                      gpaFilter === filter
                        ? 'bg-[#007AFF] text-white'
                        : 'bg-[#12121a] border border-[#1e1e2e] text-[#a1a1aa] hover:text-white'
                    }`}
                  >
                    {filter === 'all' ? 'All Athletes' : filter === 'at-risk' ? 'At-Risk' : 'Excellent GPA'}
                  </button>
                ))}
              </div>
            </div>

            {/* Athletes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAthletes.map((athlete) => (
                <div key={athlete.id} className="relative">
                  <AthleteCard athlete={athlete} />
                  {athlete.gpa < 2.5 && (
                    <div className="absolute top-12 right-3 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                      <AlertTriangle size={12} />
                      At-Risk
                    </div>
                  )}
                </div>
              ))}
            </div>

            {filteredAthletes.length === 0 && (
              <div className="text-center py-12">
                <p className="text-[#a1a1aa]">No athletes match your criteria</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'compliance' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-6">NCAA Compliance Status</h3>
              <div className="space-y-4">
                {[
                  { label: 'Disclosure Requirements', status: 'compliant', desc: 'All NIL activities properly disclosed' },
                  { label: 'Academic Eligibility', status: 'warning', desc: '2 athletes below minimum GPA requirement' },
                  { label: 'Contract Review', status: 'compliant', desc: 'All contracts reviewed within 72 hours' },
                  { label: 'Tax Documentation', status: 'compliant', desc: 'All athletes have completed W-9 forms' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between p-4 bg-[#0a0a0f] rounded-xl">
                    <div className="flex items-center gap-3">
                      {item.status === 'compliant' ? (
                        <CheckCircle className="text-green-400" size={24} />
                      ) : (
                        <AlertTriangle className="text-yellow-400" size={24} />
                      )}
                      <div>
                        <p className="text-white font-medium">{item.label}</p>
                        <p className="text-sm text-[#a1a1aa]">{item.desc}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${
                      item.status === 'compliant'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Athletes Requiring Attention</h3>
              <div className="space-y-3">
                {athletes
                  .filter(a => a.gpa < 2.5)
                  .map((athlete) => (
                    <div key={athlete.id} className="flex items-center justify-between p-4 bg-[#0a0a0f] rounded-xl border border-yellow-500/30">
                      <div className="flex items-center gap-3">
                        <img src={athlete.photo} alt={athlete.name} className="w-10 h-10 rounded-full" />
                        <div>
                          <p className="text-white font-medium">{athlete.name}</p>
                          <p className="text-sm text-[#a1a1aa]">{athlete.sport} • {athlete.university}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-red-400 font-bold">{athlete.gpa.toFixed(2)} GPA</span>
                        <p className="text-xs text-[#a1a1aa]">Below 2.5 minimum</p>
                      </div>
                    </div>
                  ))}
                {athletes.filter(a => a.gpa < 2.5).length === 0 && (
                  <p className="text-center text-[#a1a1aa] py-4">All athletes are in good academic standing!</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { title: 'Monthly NIL Report', desc: 'Complete NIL activity summary for January 2025', icon: BarChart3 },
                { title: 'Academic Performance', desc: 'GPA trends and academic standing report', icon: GraduationCap },
                { title: 'Compliance Audit', desc: 'NCAA compliance verification report', icon: CheckCircle },
              ].map((report) => (
                <button
                  key={report.title}
                  className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-6 text-left hover:border-[#007AFF] transition"
                >
                  <report.icon size={32} className="text-[#007AFF] mb-4" />
                  <h3 className="text-white font-bold mb-2">{report.title}</h3>
                  <p className="text-sm text-[#a1a1aa]">{report.desc}</p>
                </button>
              ))}
            </div>

            <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Quick Stats Export</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button className="py-3 px-4 bg-[#0a0a0f] rounded-xl text-[#a1a1aa] hover:text-white transition text-sm">
                  Export Athlete List
                </button>
                <button className="py-3 px-4 bg-[#0a0a0f] rounded-xl text-[#a1a1aa] hover:text-white transition text-sm">
                  Export Contracts
                </button>
                <button className="py-3 px-4 bg-[#0a0a0f] rounded-xl text-[#a1a1aa] hover:text-white transition text-sm">
                  Export GPA Report
                </button>
                <button className="py-3 px-4 bg-[#0a0a0f] rounded-xl text-[#a1a1aa] hover:text-white transition text-sm">
                  Export NIL Summary
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
