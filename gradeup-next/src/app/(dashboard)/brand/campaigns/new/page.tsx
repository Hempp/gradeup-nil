'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Calendar,
  DollarSign,
  Target,
  Users,
  FileText,
  Rocket,
  Plus,
  Trash2,
  Search,
  Instagram,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { useToastActions } from '@/components/ui/toast';
import { formatCurrency, formatCompactNumber, formatDate } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface CampaignFormData {
  // Step 1: Campaign Details
  name: string;
  description: string;
  campaignType: string;
  budget: number;
  startDate: string;
  endDate: string;

  // Step 2: Target Athletes
  targetSports: string[];
  targetSchools: string[];
  minFollowers: number;
  minEngagement: number;
  minGPA: number;
  selectedAthletes: string[];

  // Step 3: Deliverables
  deliverables: Deliverable[];
}

interface Deliverable {
  id: string;
  platform: string;
  contentType: string;
  quantity: number;
  dueDate: string;
  notes: string;
}

interface Athlete {
  id: string;
  name: string;
  school: string;
  sport: string;
  followers: number;
  engagementRate: number;
  nilValue: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const campaignTypes = [
  { value: 'awareness', label: 'Brand Awareness', description: 'Increase visibility and reach' },
  { value: 'product', label: 'Product Launch', description: 'Promote a new product or service' },
  { value: 'event', label: 'Event Promotion', description: 'Drive attendance or engagement' },
  { value: 'engagement', label: 'Social Engagement', description: 'Boost social media interactions' },
  { value: 'content', label: 'Content Creation', description: 'Generate branded content assets' },
];

const platforms = ['Instagram', 'TikTok', 'Twitter/X', 'YouTube', 'In-Person'];

const contentTypes = [
  'Feed Post',
  'Story',
  'Reel/Short',
  'Live Stream',
  'Video',
  'Appearance',
  'Autograph Session',
  'Photo Shoot',
];

const sports = ['Basketball', 'Football', 'Soccer', 'Volleyball', 'Gymnastics', 'Swimming', 'Tennis', 'Track & Field'];

const schools = [
  'Duke University',
  'Stanford University',
  'Ohio State University',
  'UCLA',
  'University of Michigan',
  'USC',
  'University of Alabama',
  'University of Texas',
];

const mockAthletes: Athlete[] = [
  { id: '1', name: 'Marcus Johnson', school: 'Duke University', sport: 'Basketball', followers: 125000, engagementRate: 4.2, nilValue: 125000 },
  { id: '2', name: 'Sarah Williams', school: 'Stanford University', sport: 'Soccer', followers: 89000, engagementRate: 5.1, nilValue: 95000 },
  { id: '3', name: 'Jordan Davis', school: 'Ohio State University', sport: 'Football', followers: 210000, engagementRate: 3.8, nilValue: 250000 },
  { id: '4', name: 'Emma Chen', school: 'UCLA', sport: 'Gymnastics', followers: 150000, engagementRate: 6.3, nilValue: 180000 },
  { id: '5', name: 'Tyler Brooks', school: 'University of Michigan', sport: 'Basketball', followers: 95000, engagementRate: 4.8, nilValue: 110000 },
];

const STEPS = [
  { id: 1, title: 'Campaign Details', icon: FileText },
  { id: 2, title: 'Target Athletes', icon: Users },
  { id: 3, title: 'Deliverables', icon: Target },
  { id: 4, title: 'Review & Launch', icon: Rocket },
];

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between relative">
        {/* Progress line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-[var(--border-color)]" />
        <div
          className="absolute top-5 left-0 h-0.5 bg-[var(--color-primary)] transition-all duration-500"
          style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
        />

        {/* Steps */}
        {STEPS.map((step) => {
          const Icon = step.icon;
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;

          return (
            <div key={step.id} className="flex flex-col items-center relative z-10">
              <div
                className={`
                  h-10 w-10 rounded-full flex items-center justify-center
                  transition-all duration-300
                  ${isCompleted
                    ? 'bg-[var(--color-success)] text-white'
                    : isCurrent
                      ? 'bg-[var(--color-primary)] text-white ring-4 ring-[var(--color-primary-muted)]'
                      : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] border border-[var(--border-color)]'
                  }
                `}
              >
                {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>
              <span
                className={`
                  mt-2 text-xs font-medium whitespace-nowrap
                  ${isCurrent ? 'text-[var(--color-primary)]' : 'text-[var(--text-muted)]'}
                `}
              >
                {step.title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CampaignDetailsStep({
  data,
  onChange,
}: {
  data: CampaignFormData;
  onChange: (data: Partial<CampaignFormData>) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-1">Campaign Details</h2>
        <p className="text-sm text-[var(--text-muted)]">Define the basics of your campaign</p>
      </div>

      {/* Campaign Name */}
      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
          Campaign Name <span className="text-[var(--color-error)]">*</span>
        </label>
        <Input
          placeholder="e.g., Spring Collection Launch 2024"
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Description</label>
        <textarea
          placeholder="Describe the goals and objectives of this campaign..."
          value={data.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={4}
          className={`
            w-full rounded-[var(--radius-md)]
            bg-[var(--bg-secondary)] border border-[var(--border-color)]
            px-3 py-2 text-sm text-[var(--text-primary)]
            placeholder:text-[var(--text-muted)]
            transition-colors duration-[var(--transition-fast)]
            focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]
            resize-none
          `}
        />
      </div>

      {/* Campaign Type */}
      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
          Campaign Type <span className="text-[var(--color-error)]">*</span>
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {campaignTypes.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => onChange({ campaignType: type.value })}
              className={`
                p-4 rounded-[var(--radius-lg)] border text-left
                transition-all duration-200
                ${data.campaignType === type.value
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary-muted)] ring-2 ring-[var(--color-primary)]'
                  : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--border-color-hover)]'
                }
              `}
            >
              <div className="font-medium text-[var(--text-primary)]">{type.label}</div>
              <div className="text-xs text-[var(--text-muted)] mt-1">{type.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Budget */}
      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
          Total Budget <span className="text-[var(--color-error)]">*</span>
        </label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
          <Input
            type="number"
            placeholder="50000"
            value={data.budget || ''}
            onChange={(e) => onChange({ budget: Number(e.target.value) })}
            className="pl-10"
          />
        </div>
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Start Date <span className="text-[var(--color-error)]">*</span>
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
            <Input
              type="date"
              value={data.startDate}
              onChange={(e) => onChange({ startDate: e.target.value })}
              className="pl-10"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            End Date <span className="text-[var(--color-error)]">*</span>
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
            <Input
              type="date"
              value={data.endDate}
              onChange={(e) => onChange({ endDate: e.target.value })}
              className="pl-10"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function TargetAthletesStep({
  data,
  onChange,
}: {
  data: CampaignFormData;
  onChange: (data: Partial<CampaignFormData>) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAthletes = useMemo(() => {
    return mockAthletes.filter((athlete) => {
      const matchesSearch = searchQuery === '' ||
        athlete.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        athlete.school.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSport = data.targetSports.length === 0 || data.targetSports.includes(athlete.sport);
      const matchesFollowers = athlete.followers >= data.minFollowers;

      return matchesSearch && matchesSport && matchesFollowers;
    });
  }, [searchQuery, data.targetSports, data.minFollowers]);

  const toggleAthlete = (athleteId: string) => {
    const newSelected = data.selectedAthletes.includes(athleteId)
      ? data.selectedAthletes.filter((id) => id !== athleteId)
      : [...data.selectedAthletes, athleteId];
    onChange({ selectedAthletes: newSelected });
  };

  const toggleSport = (sport: string) => {
    const newSports = data.targetSports.includes(sport)
      ? data.targetSports.filter((s) => s !== sport)
      : [...data.targetSports, sport];
    onChange({ targetSports: newSports });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-1">Target Athletes</h2>
        <p className="text-sm text-[var(--text-muted)]">Define criteria and select athletes for your campaign</p>
      </div>

      {/* Filter Criteria */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="font-medium text-[var(--text-primary)] mb-4">Filter Criteria</h3>

          {/* Sports */}
          <div className="mb-4">
            <label className="block text-sm text-[var(--text-muted)] mb-2">Target Sports</label>
            <div className="flex flex-wrap gap-2">
              {sports.map((sport) => (
                <button
                  key={sport}
                  type="button"
                  onClick={() => toggleSport(sport)}
                  className={`
                    px-3 py-1.5 rounded-full text-sm font-medium
                    transition-all duration-200
                    ${data.targetSports.includes(sport)
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                    }
                  `}
                >
                  {sport}
                </button>
              ))}
            </div>
          </div>

          {/* Min Followers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-2">Min Followers</label>
              <Input
                type="number"
                placeholder="10000"
                value={data.minFollowers || ''}
                onChange={(e) => onChange({ minFollowers: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-2">Min Engagement Rate (%)</label>
              <Input
                type="number"
                placeholder="3.0"
                step="0.1"
                value={data.minEngagement || ''}
                onChange={(e) => onChange({ minEngagement: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-2">Min GPA</label>
              <Input
                type="number"
                placeholder="3.0"
                step="0.1"
                value={data.minGPA || ''}
                onChange={(e) => onChange({ minGPA: Number(e.target.value) })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search Athletes */}
      <div className="relative">
        <Input
          placeholder="Search athletes by name or school..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon={<Search className="h-4 w-4" />}
        />
      </div>

      {/* Selected Athletes Count */}
      {data.selectedAthletes.length > 0 && (
        <div className="flex items-center gap-2">
          <Badge variant="primary">
            {data.selectedAthletes.length} athlete{data.selectedAthletes.length > 1 ? 's' : ''} selected
          </Badge>
          <button
            type="button"
            onClick={() => onChange({ selectedAthletes: [] })}
            className="text-sm text-[var(--text-muted)] hover:text-[var(--color-error)]"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Athletes List */}
      <div className="space-y-3">
        {filteredAthletes.map((athlete) => {
          const isSelected = data.selectedAthletes.includes(athlete.id);
          return (
            <Card
              key={athlete.id}
              hover
              className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-[var(--color-primary)]' : ''}`}
              onClick={() => toggleAthlete(athlete.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className={`
                    h-5 w-5 rounded border-2 flex items-center justify-center
                    ${isSelected
                      ? 'bg-[var(--color-primary)] border-[var(--color-primary)]'
                      : 'border-[var(--border-color)]'
                    }
                  `}>
                    {isSelected && <Check className="h-3 w-3 text-white" />}
                  </div>

                  <Avatar fallback={athlete.name.split(' ').map(n => n[0]).join('')} size="md" />

                  <div className="flex-1">
                    <div className="font-medium text-[var(--text-primary)]">{athlete.name}</div>
                    <div className="text-sm text-[var(--text-muted)]">{athlete.school} - {athlete.sport}</div>
                  </div>

                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <div className="font-medium text-[var(--text-primary)]">{formatCompactNumber(athlete.followers)}</div>
                      <div className="text-xs text-[var(--text-muted)]">Followers</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-[var(--color-success)]">{athlete.engagementRate}%</div>
                      <div className="text-xs text-[var(--text-muted)]">Engagement</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-[var(--color-primary)]">{formatCurrency(athlete.nilValue)}</div>
                      <div className="text-xs text-[var(--text-muted)]">NIL Value</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function DeliverablesStep({
  data,
  onChange,
}: {
  data: CampaignFormData;
  onChange: (data: Partial<CampaignFormData>) => void;
}) {
  const addDeliverable = () => {
    const newDeliverable: Deliverable = {
      id: `del-${Date.now()}`,
      platform: '',
      contentType: '',
      quantity: 1,
      dueDate: '',
      notes: '',
    };
    onChange({ deliverables: [...data.deliverables, newDeliverable] });
  };

  const updateDeliverable = (id: string, updates: Partial<Deliverable>) => {
    onChange({
      deliverables: data.deliverables.map((d) =>
        d.id === id ? { ...d, ...updates } : d
      ),
    });
  };

  const removeDeliverable = (id: string) => {
    onChange({
      deliverables: data.deliverables.filter((d) => d.id !== id),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-1">Deliverables</h2>
          <p className="text-sm text-[var(--text-muted)]">Define what athletes will deliver for this campaign</p>
        </div>
        <Button variant="outline" onClick={addDeliverable}>
          <Plus className="h-4 w-4 mr-2" />
          Add Deliverable
        </Button>
      </div>

      {data.deliverables.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="h-12 w-12 mx-auto text-[var(--text-muted)] mb-4" />
            <h3 className="font-medium text-[var(--text-primary)] mb-2">No deliverables yet</h3>
            <p className="text-sm text-[var(--text-muted)] mb-4">Add deliverables to specify what athletes should create</p>
            <Button variant="primary" onClick={addDeliverable}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Deliverable
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.deliverables.map((deliverable, index) => (
            <Card key={deliverable.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-[var(--text-primary)]">Deliverable {index + 1}</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDeliverable(deliverable.id)}
                    className="text-[var(--color-error)] hover:bg-[var(--color-error-muted)]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Platform */}
                  <div>
                    <label className="block text-sm text-[var(--text-muted)] mb-2">Platform</label>
                    <select
                      value={deliverable.platform}
                      onChange={(e) => updateDeliverable(deliverable.id, { platform: e.target.value })}
                      className={`
                        w-full h-10 px-3 rounded-[var(--radius-md)]
                        bg-[var(--bg-secondary)] border border-[var(--border-color)]
                        text-sm text-[var(--text-primary)]
                        focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]
                      `}
                    >
                      <option value="">Select platform</option>
                      {platforms.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  {/* Content Type */}
                  <div>
                    <label className="block text-sm text-[var(--text-muted)] mb-2">Content Type</label>
                    <select
                      value={deliverable.contentType}
                      onChange={(e) => updateDeliverable(deliverable.id, { contentType: e.target.value })}
                      className={`
                        w-full h-10 px-3 rounded-[var(--radius-md)]
                        bg-[var(--bg-secondary)] border border-[var(--border-color)]
                        text-sm text-[var(--text-primary)]
                        focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]
                      `}
                    >
                      <option value="">Select type</option>
                      {contentTypes.map((ct) => (
                        <option key={ct} value={ct}>{ct}</option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="block text-sm text-[var(--text-muted)] mb-2">Quantity</label>
                    <Input
                      type="number"
                      min={1}
                      value={deliverable.quantity}
                      onChange={(e) => updateDeliverable(deliverable.id, { quantity: Number(e.target.value) })}
                    />
                  </div>

                  {/* Due Date */}
                  <div>
                    <label className="block text-sm text-[var(--text-muted)] mb-2">Due Date</label>
                    <Input
                      type="date"
                      value={deliverable.dueDate}
                      onChange={(e) => updateDeliverable(deliverable.id, { dueDate: e.target.value })}
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="mt-4">
                  <label className="block text-sm text-[var(--text-muted)] mb-2">Notes (optional)</label>
                  <Input
                    placeholder="Additional instructions or requirements..."
                    value={deliverable.notes}
                    onChange={(e) => updateDeliverable(deliverable.id, { notes: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewStep({ data }: { data: CampaignFormData }) {
  const selectedAthleteDetails = mockAthletes.filter((a) => data.selectedAthletes.includes(a.id));
  const totalDeliverables = data.deliverables.reduce((sum, d) => sum + d.quantity, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-1">Review & Launch</h2>
        <p className="text-sm text-[var(--text-muted)]">Review your campaign details before launching</p>
      </div>

      {/* Campaign Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Campaign Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-[var(--text-muted)]">Campaign Name</dt>
              <dd className="font-medium text-[var(--text-primary)]">{data.name || 'Not specified'}</dd>
            </div>
            <div>
              <dt className="text-sm text-[var(--text-muted)]">Campaign Type</dt>
              <dd className="font-medium text-[var(--text-primary)]">
                {campaignTypes.find((t) => t.value === data.campaignType)?.label || 'Not specified'}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-[var(--text-muted)]">Budget</dt>
              <dd className="font-medium text-[var(--color-primary)]">{formatCurrency(data.budget)}</dd>
            </div>
            <div>
              <dt className="text-sm text-[var(--text-muted)]">Duration</dt>
              <dd className="font-medium text-[var(--text-primary)]">
                {data.startDate && data.endDate
                  ? `${formatDate(data.startDate)} - ${formatDate(data.endDate)}`
                  : 'Not specified'
                }
              </dd>
            </div>
          </dl>
          {data.description && (
            <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
              <dt className="text-sm text-[var(--text-muted)] mb-1">Description</dt>
              <dd className="text-[var(--text-secondary)]">{data.description}</dd>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Athletes Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Selected Athletes ({selectedAthleteDetails.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {selectedAthleteDetails.length > 0 ? (
            <div className="space-y-3">
              {selectedAthleteDetails.map((athlete) => (
                <div key={athlete.id} className="flex items-center gap-3 p-3 bg-[var(--bg-tertiary)] rounded-[var(--radius-md)]">
                  <Avatar fallback={athlete.name.split(' ').map(n => n[0]).join('')} size="sm" />
                  <div className="flex-1">
                    <div className="font-medium text-[var(--text-primary)]">{athlete.name}</div>
                    <div className="text-sm text-[var(--text-muted)]">{athlete.school}</div>
                  </div>
                  <Badge variant="outline">{athlete.sport}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[var(--text-muted)]">No athletes selected</p>
          )}
        </CardContent>
      </Card>

      {/* Deliverables Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Deliverables ({totalDeliverables} total)</CardTitle>
        </CardHeader>
        <CardContent>
          {data.deliverables.length > 0 ? (
            <div className="space-y-2">
              {data.deliverables.map((deliverable, index) => (
                <div key={deliverable.id} className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] rounded-[var(--radius-md)]">
                  <div className="flex items-center gap-3">
                    <span className="h-6 w-6 rounded-full bg-[var(--color-primary-muted)] text-[var(--color-primary)] text-xs font-medium flex items-center justify-center">
                      {deliverable.quantity}
                    </span>
                    <div>
                      <span className="font-medium text-[var(--text-primary)]">{deliverable.contentType}</span>
                      <span className="text-[var(--text-muted)]"> on </span>
                      <span className="text-[var(--text-primary)]">{deliverable.platform}</span>
                    </div>
                  </div>
                  {deliverable.dueDate && (
                    <Badge variant="outline">Due: {formatDate(deliverable.dueDate)}</Badge>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[var(--text-muted)]">No deliverables defined</p>
          )}
        </CardContent>
      </Card>

      {/* Estimated Cost */}
      <Card variant="glow">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[var(--text-muted)]">Estimated Campaign Cost</p>
              <p className="text-3xl font-bold text-[var(--color-primary)]">
                {formatCurrency(selectedAthleteDetails.reduce((sum, a) => sum + (a.nilValue * 0.1), 0))}
              </p>
              <p className="text-sm text-[var(--text-muted)]">
                Based on athlete NIL values and deliverables
              </p>
            </div>
            <div className="text-right">
              <p className="text-[var(--text-muted)]">Budget Remaining</p>
              <p className="text-2xl font-bold text-[var(--color-success)]">
                {formatCurrency(data.budget - selectedAthleteDetails.reduce((sum, a) => sum + (a.nilValue * 0.1), 0))}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function NewCampaignPage() {
  const router = useRouter();
  const toast = useToastActions();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<CampaignFormData>({
    name: '',
    description: '',
    campaignType: '',
    budget: 0,
    startDate: '',
    endDate: '',
    targetSports: [],
    targetSchools: [],
    minFollowers: 0,
    minEngagement: 0,
    minGPA: 0,
    selectedAthletes: [],
    deliverables: [],
  });

  const updateFormData = (updates: Partial<CampaignFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const getStepValidationErrors = (): string[] => {
    const errors: string[] = [];
    switch (currentStep) {
      case 1:
        if (!formData.name) errors.push('Campaign name is required');
        if (!formData.campaignType) errors.push('Campaign type is required');
        if (formData.budget <= 0) errors.push('Budget must be greater than 0');
        if (!formData.startDate) errors.push('Start date is required');
        if (!formData.endDate) errors.push('End date is required');
        if (formData.startDate && formData.endDate && new Date(formData.startDate) >= new Date(formData.endDate)) {
          errors.push('End date must be after start date');
        }
        break;
      case 2:
        if (formData.selectedAthletes.length === 0) errors.push('Please select at least one athlete');
        break;
      case 3:
        if (formData.deliverables.length === 0) errors.push('Please add at least one deliverable');
        formData.deliverables.forEach((d, i) => {
          if (!d.platform) errors.push(`Deliverable ${i + 1}: Platform is required`);
          if (!d.contentType) errors.push(`Deliverable ${i + 1}: Content type is required`);
        });
        break;
    }
    return errors;
  };

  const canProceed = (): boolean => {
    return getStepValidationErrors().length === 0;
  };

  const handleNext = () => {
    const errors = getStepValidationErrors();
    if (errors.length > 0) {
      toast.error('Validation Error', errors[0]);
      return;
    }
    if (currentStep < STEPS.length) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSaveDraft = async () => {
    setIsSubmitting(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.info('Draft Saved', 'Your campaign has been saved as a draft. You can continue editing anytime.');
      router.push('/brand/campaigns');
    } catch (error) {
      toast.error('Save Failed', 'Unable to save draft. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLaunch = async () => {
    setIsSubmitting(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));
      toast.success('Campaign Launched', 'Your campaign is now live. Athletes will be notified shortly.');
      router.push('/brand/campaigns');
    } catch (error) {
      toast.error('Launch Failed', 'Unable to launch campaign. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Create New Campaign</h1>
          <p className="text-[var(--text-muted)]">Step {currentStep} of {STEPS.length}</p>
        </div>
      </div>

      {/* Step Indicator */}
      <StepIndicator currentStep={currentStep} />

      {/* Step Content */}
      <div className="mb-8">
        {currentStep === 1 && (
          <CampaignDetailsStep data={formData} onChange={updateFormData} />
        )}
        {currentStep === 2 && (
          <TargetAthletesStep data={formData} onChange={updateFormData} />
        )}
        {currentStep === 3 && (
          <DeliverablesStep data={formData} onChange={updateFormData} />
        )}
        {currentStep === 4 && (
          <ReviewStep data={formData} />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-6 border-t border-[var(--border-color)]">
        <Button variant="outline" onClick={handleBack} disabled={currentStep === 1}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="flex items-center gap-3">
          {currentStep === STEPS.length ? (
            <>
              <Button variant="outline" onClick={handleSaveDraft} isLoading={isSubmitting}>
                Save as Draft
              </Button>
              <Button variant="primary" onClick={handleLaunch} isLoading={isSubmitting}>
                <Rocket className="h-4 w-4 mr-2" />
                Launch Campaign
              </Button>
            </>
          ) : (
            <Button variant="primary" onClick={handleNext} disabled={!canProceed()}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
