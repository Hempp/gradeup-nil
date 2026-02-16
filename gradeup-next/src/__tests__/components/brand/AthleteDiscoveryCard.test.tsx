import { render } from '@testing-library/react';
import { AthleteDiscoveryCard } from '@/components/brand/AthleteDiscoveryCard';

describe('AthleteDiscoveryCard', () => {
  const mockAthlete = {
    id: 'athlete-1',
    name: 'John Smith',
    school: 'State University',
    sport: 'Basketball',
    position: 'Point Guard',
    gpa: 3.75,
    instagramFollowers: 50000,
    tiktokFollowers: 25000,
    engagementRate: 4.5,
    nilValue: 15000,
    verified: true,
    saved: false,
  };

  it('renders without crashing', () => {
    render(
      <AthleteDiscoveryCard
        athlete={mockAthlete}
        onToggleSave={jest.fn()}
        onViewProfile={jest.fn()}
      />
    );
    expect(document.body.textContent).toBeTruthy();
  });
});
