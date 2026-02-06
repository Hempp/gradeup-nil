import { useState } from 'react';
import type { SmartContract as SmartContractType, SmartContractTask } from '../types';
import { FileText, CheckCircle, Clock, AlertCircle, DollarSign, Calendar, Signature } from 'lucide-react';

interface SmartContractProps {
  contract: SmartContractType;
  userType: 'athlete' | 'brand';
  onSign?: () => void;
  onCompleteTask?: (taskId: string) => void;
}

export function SmartContractCard({ contract, userType, onSign, onCompleteTask }: SmartContractProps) {
  const completedTasks = contract.tasks.filter(t => t.status === 'completed' || t.status === 'verified').length;
  const progress = (completedTasks / contract.tasks.length) * 100;
  const earnedAmount = contract.tasks
    .filter(t => t.status === 'completed' || t.status === 'verified')
    .reduce((sum, t) => sum + t.payment, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400';
      case 'pending_signature': return 'bg-yellow-500/20 text-yellow-400';
      case 'completed': return 'bg-blue-500/20 text-blue-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getTaskStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'verified':
        return <CheckCircle size={16} className="text-green-400" />;
      case 'in_progress':
        return <Clock size={16} className="text-yellow-400" />;
      default:
        return <AlertCircle size={16} className="text-gray-400" />;
    }
  };

  return (
    <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-[#1e1e2e]">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <FileText size={24} className="text-[#007AFF]" />
              <h3 className="text-xl font-bold text-white">{contract.title}</h3>
            </div>
            <p className="text-[#a1a1aa] text-sm">{contract.description}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${getStatusColor(contract.status)}`}>
            {contract.status.replace('_', ' ')}
          </span>
        </div>

        {/* Parties */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-[#a1a1aa]">Athlete:</span>
            <span className="text-white font-medium">{contract.athleteName}</span>
            {contract.signatures.athlete && <CheckCircle size={14} className="text-green-400" />}
          </div>
          <div className="w-px h-4 bg-[#1e1e2e]" />
          <div className="flex items-center gap-2">
            <span className="text-[#a1a1aa]">Brand:</span>
            <span className="text-white font-medium">{contract.brandName}</span>
            {contract.signatures.brand && <CheckCircle size={14} className="text-green-400" />}
          </div>
        </div>
      </div>

      {/* Contract Value & Progress */}
      <div className="p-6 border-b border-[#1e1e2e] bg-[#0a0a0f]">
        <div className="grid grid-cols-3 gap-6 mb-4">
          <div>
            <p className="text-xs text-[#a1a1aa] uppercase mb-1">Total Value</p>
            <p className="text-2xl font-bold text-white">${contract.totalValue.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-[#a1a1aa] uppercase mb-1">Earned</p>
            <p className="text-2xl font-bold text-green-400">${earnedAmount.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-[#a1a1aa] uppercase mb-1">Progress</p>
            <p className="text-2xl font-bold text-[#007AFF]">{completedTasks}/{contract.tasks.length}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-[#1e1e2e] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#007AFF] to-[#5856D6] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Dates */}
        <div className="flex items-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2 text-[#a1a1aa]">
            <Calendar size={14} />
            <span>Start: {new Date(contract.startDate).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2 text-[#a1a1aa]">
            <Calendar size={14} />
            <span>End: {new Date(contract.endDate).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Tasks */}
      <div className="p-6">
        <h4 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Contract Tasks</h4>
        <div className="space-y-3">
          {contract.tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between p-4 bg-[#0a0a0f] rounded-xl border border-[#1e1e2e]"
            >
              <div className="flex items-center gap-3">
                {getTaskStatusIcon(task.status)}
                <div>
                  <p className="text-white text-sm font-medium">{task.description}</p>
                  <p className="text-xs text-[#a1a1aa]">Due: {new Date(task.deadline).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-green-400">
                  <DollarSign size={14} />
                  <span className="font-bold">{task.payment.toLocaleString()}</span>
                </div>
                {userType === 'athlete' && task.status === 'pending' && (
                  <button
                    onClick={() => onCompleteTask?.(task.id)}
                    className="px-3 py-1 bg-[#007AFF] text-white text-xs font-semibold rounded-lg hover:bg-[#0056CC] transition"
                  >
                    Start Task
                  </button>
                )}
                {userType === 'athlete' && task.status === 'in_progress' && (
                  <button
                    onClick={() => onCompleteTask?.(task.id)}
                    className="px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-lg hover:bg-green-600 transition"
                  >
                    Mark Complete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sign Button */}
      {contract.status === 'pending_signature' && (
        <div className="p-6 border-t border-[#1e1e2e]">
          {((userType === 'athlete' && !contract.signatures.athlete) ||
            (userType === 'brand' && !contract.signatures.brand)) && (
            <button
              onClick={onSign}
              className="w-full py-3 bg-gradient-to-r from-[#007AFF] to-[#5856D6] text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition"
            >
              <Signature size={20} />
              Sign Contract
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Create Contract Modal Component
interface CreateContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (contract: Partial<SmartContractType>) => void;
  athleteName?: string;
  brandName?: string;
}

export function CreateContractModal({ isOpen, onClose, onSubmit, athleteName, brandName }: CreateContractModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [totalValue, setTotalValue] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [tasks, setTasks] = useState<Partial<SmartContractTask>[]>([
    { description: '', deadline: '', payment: 0 }
  ]);

  if (!isOpen) return null;

  const addTask = () => {
    setTasks([...tasks, { description: '', deadline: '', payment: 0 }]);
  };

  const updateTask = (index: number, field: string, value: string | number) => {
    const updated = [...tasks];
    updated[index] = { ...updated[index], [field]: value };
    setTasks(updated);
  };

  const handleSubmit = () => {
    const contract: Partial<SmartContractType> = {
      title,
      description,
      totalValue: parseFloat(totalValue),
      startDate,
      endDate,
      athleteName,
      brandName,
      status: 'pending_signature',
      tasks: tasks.map((t, i) => ({
        id: `task-${i}`,
        description: t.description || '',
        deadline: t.deadline || '',
        payment: t.payment || 0,
        status: 'pending' as const
      })),
      signatures: { athlete: false, brand: true }
    };
    onSubmit(contract);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-[#1e1e2e]">
          <h2 className="text-2xl font-bold text-white">Create Smart Contract</h2>
          <p className="text-[#a1a1aa] text-sm mt-1">Define terms and tasks for the NIL partnership</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Contract Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Campus Ambassador Program"
                className="w-full px-4 py-3 bg-[#0a0a0f] border border-[#1e1e2e] rounded-xl text-white placeholder-[#a1a1aa] focus:border-[#007AFF] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the partnership terms..."
                rows={3}
                className="w-full px-4 py-3 bg-[#0a0a0f] border border-[#1e1e2e] rounded-xl text-white placeholder-[#a1a1aa] focus:border-[#007AFF] focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* Value & Dates */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Total Value ($)</label>
              <input
                type="number"
                value={totalValue}
                onChange={(e) => setTotalValue(e.target.value)}
                placeholder="25000"
                className="w-full px-4 py-3 bg-[#0a0a0f] border border-[#1e1e2e] rounded-xl text-white placeholder-[#a1a1aa] focus:border-[#007AFF] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 bg-[#0a0a0f] border border-[#1e1e2e] rounded-xl text-white focus:border-[#007AFF] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-3 bg-[#0a0a0f] border border-[#1e1e2e] rounded-xl text-white focus:border-[#007AFF] focus:outline-none"
              />
            </div>
          </div>

          {/* Tasks */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-white">Contract Tasks</label>
              <button
                onClick={addTask}
                className="text-[#007AFF] text-sm font-medium hover:underline"
              >
                + Add Task
              </button>
            </div>
            <div className="space-y-3">
              {tasks.map((task, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 p-4 bg-[#0a0a0f] rounded-xl border border-[#1e1e2e]">
                  <input
                    type="text"
                    value={task.description}
                    onChange={(e) => updateTask(index, 'description', e.target.value)}
                    placeholder="Task description..."
                    className="col-span-6 px-3 py-2 bg-transparent border border-[#1e1e2e] rounded-lg text-white placeholder-[#a1a1aa] text-sm focus:border-[#007AFF] focus:outline-none"
                  />
                  <input
                    type="date"
                    value={task.deadline}
                    onChange={(e) => updateTask(index, 'deadline', e.target.value)}
                    className="col-span-3 px-3 py-2 bg-transparent border border-[#1e1e2e] rounded-lg text-white text-sm focus:border-[#007AFF] focus:outline-none"
                  />
                  <input
                    type="number"
                    value={task.payment || ''}
                    onChange={(e) => updateTask(index, 'payment', parseFloat(e.target.value))}
                    placeholder="$"
                    className="col-span-3 px-3 py-2 bg-transparent border border-[#1e1e2e] rounded-lg text-white placeholder-[#a1a1aa] text-sm focus:border-[#007AFF] focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-[#1e1e2e] flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-[#1e1e2e] text-white font-semibold rounded-xl hover:bg-[#1e1e2e] transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-3 bg-gradient-to-r from-[#007AFF] to-[#5856D6] text-white font-semibold rounded-xl hover:opacity-90 transition"
          >
            Create Contract
          </button>
        </div>
      </div>
    </div>
  );
}
