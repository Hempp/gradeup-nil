'use client';

import { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Trophy, GraduationCap, TrendingUp, Crown, Medal, Award } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
// ATHLETE LEADERBOARD — Retention & Gamification
// Shows weekly top performers by GradeUp Score, GPA, and deals.
// Creates healthy competition and gives athletes a reason to return daily.
// ═══════════════════════════════════════════════════════════════════════════

interface LeaderboardEntry {
  rank: number;
  name: string;
  school: string;
  sport: string;
  avatarUrl?: string;
  gpa: number;
  gradeUpScore: number;
  dealsCompleted: number;
  isCurrentUser?: boolean;
}

interface LeaderboardProps {
  currentUserName?: string;
  className?: string;
}

// Rank badge with medal icons
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="h-5 w-5 text-[var(--accent-gold)]" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-[var(--text-muted)]" />;
  if (rank === 3) return <Award className="h-5 w-5 text-[#CD7F32]" />;
  return (
    <span className="h-5 w-5 flex items-center justify-center text-xs font-bold text-[var(--text-muted)]">
      {rank}
    </span>
  );
}

// Mock leaderboard data — in production, fetched from API
const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, name: 'Jasmine Taylor', school: 'Stanford', sport: 'Basketball', gpa: 3.97, gradeUpScore: 94, dealsCompleted: 12 },
  { rank: 2, name: 'Marcus Johnson', school: 'Duke', sport: 'Basketball', gpa: 3.78, gradeUpScore: 89, dealsCompleted: 8, isCurrentUser: true },
  { rank: 3, name: 'Sophia Chen', school: 'MIT', sport: 'Tennis', gpa: 3.95, gradeUpScore: 87, dealsCompleted: 6 },
  { rank: 4, name: 'DeShawn Williams', school: 'Alabama', sport: 'Football', gpa: 3.52, gradeUpScore: 85, dealsCompleted: 15 },
  { rank: 5, name: 'Emily Rodriguez', school: 'UCLA', sport: 'Soccer', gpa: 3.88, gradeUpScore: 83, dealsCompleted: 5 },
  { rank: 6, name: 'Tyler Brooks', school: 'Oregon', sport: 'Track', gpa: 3.65, gradeUpScore: 80, dealsCompleted: 4 },
  { rank: 7, name: 'Aisha Patel', school: 'Michigan', sport: 'Swimming', gpa: 3.92, gradeUpScore: 78, dealsCompleted: 3 },
];

export function Leaderboard({ currentUserName, className }: LeaderboardProps) {
  const entries = useMemo(() => {
    return MOCK_LEADERBOARD.map(entry => ({
      ...entry,
      isCurrentUser: currentUserName
        ? entry.name.toLowerCase().includes(currentUserName.toLowerCase())
        : entry.isCurrentUser,
    }));
  }, [currentUserName]);

  return (
    <Card className={cn('overflow-hidden', className)}>
      {/* Gradient header */}
      <div className="h-1 bg-gradient-to-r from-[var(--accent-gold)] via-[var(--accent-primary)] to-[var(--marketing-lime)]" />

      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-5 w-5 text-[var(--accent-gold)]" />
            Weekly Leaderboard
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            <GraduationCap className="h-3 w-3 mr-1" />
            By GradeUp Score
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="divide-y divide-[var(--border-color)]">
          {entries.map((entry) => (
            <div
              key={entry.rank}
              className={cn(
                'flex items-center gap-3 px-4 sm:px-6 py-3 transition-colors',
                entry.isCurrentUser && 'bg-[var(--color-primary)]/5 border-l-2 border-l-[var(--color-primary)]',
                entry.rank <= 3 && !entry.isCurrentUser && 'bg-[var(--bg-tertiary)]/50'
              )}
            >
              {/* Rank */}
              <div className="w-8 flex items-center justify-center flex-shrink-0">
                <RankBadge rank={entry.rank} />
              </div>

              {/* Avatar */}
              <Avatar
                fallback={entry.name.split(' ').map(n => n[0]).join('')}
                src={entry.avatarUrl}
                size="sm"
                className={cn(
                  entry.isCurrentUser && 'ring-2 ring-[var(--color-primary)]'
                )}
              />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={cn(
                    'text-sm font-medium truncate',
                    entry.isCurrentUser ? 'text-[var(--color-primary)]' : 'text-[var(--text-primary)]'
                  )}>
                    {entry.name}
                    {entry.isCurrentUser && <span className="text-xs ml-1">(You)</span>}
                  </p>
                </div>
                <p className="text-xs text-[var(--text-muted)] truncate">
                  {entry.sport} · {entry.school}
                </p>
              </div>

              {/* Score + GPA */}
              <div className="text-right flex-shrink-0 hidden sm:block">
                <div className="flex items-center gap-1 justify-end">
                  <TrendingUp className="h-3 w-3 text-[var(--accent-primary)]" />
                  <span className="text-sm font-bold text-[var(--text-primary)]">{entry.gradeUpScore}</span>
                </div>
                <span className="text-[10px] text-[var(--text-muted)]">{entry.gpa.toFixed(2)} GPA</span>
              </div>

              {/* Mobile: just the score */}
              <div className="text-right flex-shrink-0 sm:hidden">
                <span className="text-sm font-bold text-[var(--text-primary)]">{entry.gradeUpScore}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
