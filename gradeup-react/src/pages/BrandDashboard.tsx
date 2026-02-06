import { useState } from 'react';
import { athletes, brands, sampleContracts } from '../data/mockData';
import { AthleteCard } from '../components/AthleteCard';
import { SmartContractCard, CreateContractModal } from '../components/SmartContract';
import { ArrowLeft, Search, DollarSign, Users, TrendingUp, FileText, Plus } from 'lucide-react';
import type { Athlete, SmartContract } from '../types';

interface BrandDashboardProps {
  onBack: () => void;
}

export function BrandDashboard({ onBack }: BrandDashboardProps) {
  const [activeTab, setActiveTab] = useState<'discover' | 'contracts' | 'analytics'>('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState('All');
  const [minGPA, setMinGPA] = useState(0);
  const [showContractModal, setShowContractModal] = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const [contracts, setContracts] = useState(sampleContracts);

  const brand = brands[0]; // Nike

  const filteredAthletes = athletes.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          a.university.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSport = selectedSport === 'All' || a.sport === selectedSport;
    const matchesGPA = a.gpa >= minGPA;
    return matchesSearch && matchesSport && matchesGPA;
  });

  const myContracts = contracts.filter(c => c.brandId === brand.id);
  const totalSpend = myContracts
    .flatMap(c => c.tasks)
    .filter(t => t.status === 'completed' || t.status === 'verified')
    .reduce((sum, t) => sum + t.payment, 0);

  const handleCreateContract = (athleteId: string) => {
    const athlete = athletes.find(a => a.id === athleteId);
    if (athlete) {
      setSelectedAthlete(athlete);
      setShowContractModal(true);
    }
  };

  const handleSubmitContract = (contractData: Partial<SmartContract>) => {
    const newContract: SmartContract = {
      id: `sc-${Date.now()}`,
      athleteId: selectedAthlete?.id || '',
      brandId: brand.id,
      athleteName: selectedAthlete?.name || '',
      brandName: brand.name,
      title: contractData.title || '',
      description: contractData.description || '',
      totalValue: contractData.totalValue || 0,
      tasks: contractData.tasks || [],
      status: 'pending_signature',
      createdAt: new Date().toISOString(),
      startDate: contractData.startDate || '',
      endDate: contractData.endDate || '',
      signatures: { athlete: false, brand: true }
    };
    setContracts([...contracts, newContract]);
    setShowContractModal(false);
    setSelectedAthlete(null);
  };

  const sports = ['All', ...new Set(athletes.map(a => a.sport))];

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
            <div className="w-16 h-16 bg-[#1e1e2e] rounded-2xl flex items-center justify-center text-4xl">
              {brand.logo}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{brand.name}</h1>
              <p className="text-[#a1a1aa]">{brand.industry} • {brand.activeDeals} Active Partnerships</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-6 mt-6">
            {(['discover', 'contracts', 'analytics'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-2 text-sm font-medium capitalize transition ${
                  activeTab === tab
                    ? 'text-white border-b-2 border-[#007AFF]'
                    : 'text-[#a1a1aa] hover:text-white'
                }`}
              >
                {tab === 'discover' ? 'Discover Athletes' : tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'discover' && (
          <div className="animate-fadeIn">
            {/* Search & Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#a1a1aa]" size={20} />
                <input
                  type="text"
                  placeholder="Search athletes by name or university..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-[#12121a] border border-[#1e1e2e] rounded-xl text-white placeholder-[#a1a1aa] focus:border-[#007AFF] focus:outline-none"
                />
              </div>

              <div className="flex gap-4">
                <select
                  value={selectedSport}
                  onChange={(e) => setSelectedSport(e.target.value)}
                  className="px-4 py-3 bg-[#12121a] border border-[#1e1e2e] rounded-xl text-white focus:border-[#007AFF] focus:outline-none"
                >
                  {sports.map(sport => (
                    <option key={sport} value={sport}>{sport}</option>
                  ))}
                </select>

                <div className="flex items-center gap-2 px-4 py-3 bg-[#12121a] border border-[#1e1e2e] rounded-xl">
                  <span className="text-[#a1a1aa] text-sm">Min GPA:</span>
                  <input
                    type="number"
                    min="0"
                    max="4"
                    step="0.1"
                    value={minGPA}
                    onChange={(e) => setMinGPA(parseFloat(e.target.value) || 0)}
                    className="w-16 bg-transparent text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Athletes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAthletes.map((athlete) => (
                <div key={athlete.id} className="relative">
                  <AthleteCard athlete={athlete} />
                  <button
                    onClick={() => handleCreateContract(athlete.id)}
                    className="absolute bottom-4 left-4 right-4 py-3 bg-[#007AFF] text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-[#0056CC] transition"
                  >
                    <Plus size={18} />
                    Create Contract
                  </button>
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

        {activeTab === 'contracts' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">My Contracts</h2>
              <button
                onClick={() => setShowContractModal(true)}
                className="px-4 py-2 bg-[#007AFF] text-white rounded-xl flex items-center gap-2 hover:bg-[#0056CC] transition"
              >
                <Plus size={18} />
                New Contract
              </button>
            </div>

            {myContracts.length > 0 ? (
              myContracts.map((contract) => (
                <SmartContractCard
                  key={contract.id}
                  contract={contract}
                  userType="brand"
                />
              ))
            ) : (
              <div className="text-center py-12 bg-[#12121a] border border-[#1e1e2e] rounded-2xl">
                <FileText size={48} className="mx-auto text-[#a1a1aa] mb-4" />
                <p className="text-[#a1a1aa]">No contracts yet. Discover athletes to create your first partnership!</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="animate-fadeIn">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <DollarSign className="text-green-400" size={20} />
                  </div>
                  <span className="text-[#a1a1aa] text-sm">Total Spend</span>
                </div>
                <p className="text-3xl font-bold text-white">${totalSpend.toLocaleString()}</p>
              </div>

              <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <Users className="text-blue-400" size={20} />
                  </div>
                  <span className="text-[#a1a1aa] text-sm">Active Partners</span>
                </div>
                <p className="text-3xl font-bold text-white">{myContracts.filter(c => c.status === 'active').length}</p>
              </div>

              <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                    <FileText className="text-purple-400" size={20} />
                  </div>
                  <span className="text-[#a1a1aa] text-sm">Total Contracts</span>
                </div>
                <p className="text-3xl font-bold text-white">{myContracts.length}</p>
              </div>

              <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                    <TrendingUp className="text-yellow-400" size={20} />
                  </div>
                  <span className="text-[#a1a1aa] text-sm">Avg GPA</span>
                </div>
                <p className="text-3xl font-bold text-white">3.72</p>
              </div>
            </div>

            {/* Budget Overview */}
            <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Budget Overview</h3>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-[#a1a1aa]">Spent</span>
                    <span className="text-white">${totalSpend.toLocaleString()} / ${brand.budget.toLocaleString()}</span>
                  </div>
                  <div className="h-3 bg-[#1e1e2e] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#007AFF] to-[#5856D6]"
                      style={{ width: `${(totalSpend / brand.budget) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              <p className="text-sm text-[#a1a1aa]">
                ${(brand.budget - totalSpend).toLocaleString()} remaining in your NIL budget
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Create Contract Modal */}
      <CreateContractModal
        isOpen={showContractModal}
        onClose={() => { setShowContractModal(false); setSelectedAthlete(null); }}
        onSubmit={handleSubmitContract}
        athleteName={selectedAthlete?.name}
        brandName={brand.name}
      />
    </div>
  );
}
