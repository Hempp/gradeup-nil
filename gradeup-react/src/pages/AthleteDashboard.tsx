import { useState } from 'react';
import { athletes, sampleContracts } from '../data/mockData';
import { SmartContractCard } from '../components/SmartContract';
import { ArrowLeft, Award, TrendingUp, DollarSign, BarChart3, ExternalLink, CheckCircle, Clock } from 'lucide-react';

interface AthleteDashboardProps {
  onBack: () => void;
}

export function AthleteDashboard({ onBack }: AthleteDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'contracts' | 'profile'>('overview');
  const athlete = athletes[0]; // Jordan Williams
  const myContracts = sampleContracts.filter(c => c.athleteId === athlete.id);

  const totalEarnings = myContracts
    .flatMap(c => c.tasks)
    .filter(t => t.status === 'completed' || t.status === 'verified')
    .reduce((sum, t) => sum + t.payment, 0);

  const pendingEarnings = myContracts
    .flatMap(c => c.tasks)
    .filter(t => t.status === 'pending' || t.status === 'in_progress')
    .reduce((sum, t) => sum + t.payment, 0);

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
            <img
              src={athlete.photo}
              alt={athlete.name}
              className="w-20 h-20 rounded-full border-2 border-[#007AFF]"
            />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white">{athlete.name}</h1>
                <span className="gpa-badge">
                  <Award size={14} />
                  {athlete.gpa.toFixed(2)} GPA
                </span>
                {athlete.verified && (
                  <span className="bg-[#007AFF] text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                    <CheckCircle size={12} /> Verified
                  </span>
                )}
              </div>
              <p className="text-[#a1a1aa]">{athlete.position} • {athlete.sport} • {athlete.university}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-6 mt-6">
            {(['overview', 'contracts', 'profile'] as const).map((tab) => (
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <DollarSign className="text-green-400" size={20} />
                  </div>
                  <span className="text-[#a1a1aa] text-sm">Total Earnings</span>
                </div>
                <p className="text-3xl font-bold text-white">${totalEarnings.toLocaleString()}</p>
              </div>

              <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                    <Clock className="text-yellow-400" size={20} />
                  </div>
                  <span className="text-[#a1a1aa] text-sm">Pending</span>
                </div>
                <p className="text-3xl font-bold text-white">${pendingEarnings.toLocaleString()}</p>
              </div>

              <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <BarChart3 className="text-blue-400" size={20} />
                  </div>
                  <span className="text-[#a1a1aa] text-sm">Active Deals</span>
                </div>
                <p className="text-3xl font-bold text-white">{myContracts.filter(c => c.status === 'active').length}</p>
              </div>

              <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                    <TrendingUp className="text-purple-400" size={20} />
                  </div>
                  <span className="text-[#a1a1aa] text-sm">NIL Value</span>
                </div>
                <p className="text-3xl font-bold text-white">${athlete.nilValue.toLocaleString()}</p>
              </div>
            </div>

            {/* StatsTaq Performance */}
            <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-white">Performance Stats</h2>
                  <span className="statstaq-badge">Powered by StatsTaq</span>
                </div>
                <a
                  href="https://statstaq.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#007AFF] text-sm flex items-center gap-1 hover:underline"
                >
                  View Full Profile <ExternalLink size={14} />
                </a>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                <div className="text-center p-4 bg-[#0a0a0f] rounded-xl">
                  <p className="text-3xl font-bold text-white">{athlete.statsTaq.pointsPerGame}</p>
                  <p className="text-sm text-[#a1a1aa]">Points/Game</p>
                </div>
                <div className="text-center p-4 bg-[#0a0a0f] rounded-xl">
                  <p className="text-3xl font-bold text-white">{athlete.statsTaq.assistsPerGame}</p>
                  <p className="text-sm text-[#a1a1aa]">Assists/Game</p>
                </div>
                <div className="text-center p-4 bg-[#0a0a0f] rounded-xl">
                  <p className="text-3xl font-bold text-white">{athlete.statsTaq.reboundsPerGame}</p>
                  <p className="text-sm text-[#a1a1aa]">Rebounds/Game</p>
                </div>
                <div className="text-center p-4 bg-[#0a0a0f] rounded-xl">
                  <p className="text-3xl font-bold text-white">{athlete.statsTaq.fieldGoalPercentage}%</p>
                  <p className="text-sm text-[#a1a1aa]">Field Goal %</p>
                </div>
                <div className="text-center p-4 bg-[#0a0a0f] rounded-xl">
                  <p className="text-3xl font-bold text-white">{athlete.statsTaq.playerEfficiencyRating}</p>
                  <p className="text-sm text-[#a1a1aa]">PER</p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-[#1e1e2e]">
                <div className="text-center">
                  <p className="text-lg font-bold text-white">{athlete.statsTaq.gamesPlayed}</p>
                  <p className="text-xs text-[#a1a1aa]">Games Played</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-white">{athlete.statsTaq.seasonHighPoints}</p>
                  <p className="text-xs text-[#a1a1aa]">Season High</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-white">{athlete.statsTaq.doubleDoubles}</p>
                  <p className="text-xs text-[#a1a1aa]">Double-Doubles</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-white">{athlete.statsTaq.minutesPerGame}</p>
                  <p className="text-xs text-[#a1a1aa]">Min/Game</p>
                </div>
              </div>
            </div>

            {/* Recent Contracts */}
            <div>
              <h2 className="text-xl font-bold text-white mb-4">Recent Contracts</h2>
              <div className="space-y-6">
                {myContracts.slice(0, 2).map((contract) => (
                  <SmartContractCard
                    key={contract.id}
                    contract={contract}
                    userType="athlete"
                    onSign={() => console.log('Sign contract')}
                    onCompleteTask={(taskId) => console.log('Complete task', taskId)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'contracts' && (
          <div className="space-y-6 animate-fadeIn">
            <h2 className="text-xl font-bold text-white">All Contracts</h2>
            {myContracts.map((contract) => (
              <SmartContractCard
                key={contract.id}
                contract={contract}
                userType="athlete"
                onSign={() => console.log('Sign contract')}
                onCompleteTask={(taskId) => console.log('Complete task', taskId)}
              />
            ))}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="max-w-2xl animate-fadeIn">
            <h2 className="text-xl font-bold text-white mb-6">Edit Profile</h2>
            <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Bio</label>
                <textarea
                  defaultValue={athlete.bio}
                  rows={4}
                  className="w-full px-4 py-3 bg-[#0a0a0f] border border-[#1e1e2e] rounded-xl text-white focus:border-[#007AFF] focus:outline-none resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Major</label>
                  <input
                    type="text"
                    defaultValue={athlete.major}
                    className="w-full px-4 py-3 bg-[#0a0a0f] border border-[#1e1e2e] rounded-xl text-white focus:border-[#007AFF] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Year</label>
                  <select
                    defaultValue={athlete.year}
                    className="w-full px-4 py-3 bg-[#0a0a0f] border border-[#1e1e2e] rounded-xl text-white focus:border-[#007AFF] focus:outline-none"
                  >
                    <option>Freshman</option>
                    <option>Sophomore</option>
                    <option>Junior</option>
                    <option>Senior</option>
                  </select>
                </div>
              </div>
              <button className="w-full py-3 bg-[#007AFF] text-white font-semibold rounded-xl hover:bg-[#0056CC] transition">
                Save Changes
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
