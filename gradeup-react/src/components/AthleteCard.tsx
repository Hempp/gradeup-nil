import type { Athlete } from '../types';
import { Award, TrendingUp, Users, CheckCircle, ExternalLink } from 'lucide-react';

interface AthleteCardProps {
  athlete: Athlete;
  onClick?: () => void;
}

export function AthleteCard({ athlete, onClick }: AthleteCardProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
    return num.toString();
  };

  const totalFollowers = athlete.socialMedia.instagram + athlete.socialMedia.twitter + athlete.socialMedia.tiktok;

  return (
    <div
      className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl overflow-hidden card-hover cursor-pointer"
      onClick={onClick}
    >
      {/* Header with Photo */}
      <div className="relative">
        <img
          src={athlete.photo}
          alt={athlete.name}
          className="w-full h-48 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#12121a] to-transparent" />

        {/* Verified Badge */}
        {athlete.verified && (
          <div className="absolute top-3 right-3 bg-[#007AFF] text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
            <CheckCircle size={12} />
            Verified
          </div>
        )}

        {/* GPA Badge - Prominent */}
        <div className="absolute top-3 left-3 gpa-badge">
          <Award size={14} />
          {athlete.gpa.toFixed(2)} GPA
        </div>

        {/* StatsTaq Badge */}
        <a
          href="https://statstaq.com"
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-3 right-3 statstaq-badge flex items-center gap-1 hover:opacity-80"
          onClick={(e) => e.stopPropagation()}
        >
          StatsTaq <ExternalLink size={10} />
        </a>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Name & Info */}
        <h3 className="text-xl font-bold text-white mb-1">{athlete.name}</h3>
        <p className="text-[#a1a1aa] text-sm mb-1">
          {athlete.position} • {athlete.sport}
        </p>
        <p className="text-[#007AFF] text-sm font-medium mb-4">
          {athlete.university} • {athlete.year}
        </p>

        {/* StatsTaq Stats Grid */}
        <div className="bg-[#0a0a0f] rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-[#a1a1aa] uppercase tracking-wider">Performance Stats</span>
            <span className="statstaq-badge">via StatsTaq</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-xl font-bold text-white">{athlete.statsTaq.pointsPerGame}</p>
              <p className="text-[10px] text-[#a1a1aa] uppercase">PPG</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-white">{athlete.statsTaq.assistsPerGame}</p>
              <p className="text-[10px] text-[#a1a1aa] uppercase">APG</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-white">{athlete.statsTaq.fieldGoalPercentage}%</p>
              <p className="text-[10px] text-[#a1a1aa] uppercase">FG%</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-[#1e1e2e] flex justify-between text-xs">
            <span className="text-[#a1a1aa]">PER: <span className="text-white font-semibold">{athlete.statsTaq.playerEfficiencyRating}</span></span>
            <span className="text-[#a1a1aa]">Games: <span className="text-white font-semibold">{athlete.statsTaq.gamesPlayed}</span></span>
          </div>
        </div>

        {/* Social & NIL Value */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#a1a1aa]">
            <Users size={16} />
            <span className="text-sm">{formatNumber(totalFollowers)}</span>
          </div>
          <div className="flex items-center gap-2 text-[#34C759]">
            <TrendingUp size={16} />
            <span className="font-bold">${formatNumber(athlete.nilValue)}</span>
          </div>
        </div>

        {/* Achievements */}
        <div className="mt-4 flex flex-wrap gap-2">
          {athlete.achievements.slice(0, 2).map((achievement, i) => (
            <span
              key={i}
              className="text-xs bg-[#1e1e2e] text-[#a1a1aa] px-2 py-1 rounded-full"
            >
              {achievement}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
