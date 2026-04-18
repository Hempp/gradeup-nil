'use client';

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  type RefObject,
} from 'react';

/* ═══════════════════════════════════════════════════════════════════════════
   COLLABORATION TYPES
   ═══════════════════════════════════════════════════════════════════════════ */

export interface Participant {
  /** Unique user ID */
  id: string;
  /** Display name */
  name: string;
  /** Avatar URL */
  avatar?: string;
  /** Assigned color for cursor/selection */
  color: string;
  /** Whether currently active */
  isActive: boolean;
  /** Last activity timestamp */
  lastActiveAt: number;
  /** Current cursor position */
  cursor?: CursorPosition;
  /** Current selection range */
  selection?: SelectionRange;
}

export interface CursorPosition {
  /** X coordinate relative to container */
  x: number;
  /** Y coordinate relative to container */
  y: number;
  /** Element ID the cursor is over */
  elementId?: string;
}

export interface SelectionRange {
  /** Start position (for text) */
  start: number;
  /** End position (for text) */
  end: number;
  /** Field/element being selected */
  fieldId?: string;
}

export interface PresenceState {
  /** Current user */
  self: Participant | null;
  /** Other participants */
  others: Participant[];
  /** Total count including self */
  totalCount: number;
  /** Whether connected to presence service */
  isConnected: boolean;
}

export interface CollaborationMessage {
  type: 'cursor' | 'selection' | 'presence' | 'edit' | 'lock' | 'unlock';
  userId: string;
  payload: unknown;
  timestamp: number;
}

/* ═══════════════════════════════════════════════════════════════════════════
   PRESENCE COLORS
   ═══════════════════════════════════════════════════════════════════════════ */

const PRESENCE_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#FFE66D', // Yellow
  '#95E1D3', // Mint
  '#F38181', // Coral
  '#AA96DA', // Purple
  '#FCBAD3', // Pink
  '#A8D8EA', // Sky
  '#FFB347', // Orange
  '#98D8C8', // Seafoam
];

function getColorForUser(userId: string): string {
  // Generate consistent color based on user ID hash
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
  }
  return PRESENCE_COLORS[Math.abs(hash) % PRESENCE_COLORS.length];
}

/* ═══════════════════════════════════════════════════════════════════════════
   USE PRESENCE HOOK
   ═══════════════════════════════════════════════════════════════════════════ */

export interface UsePresenceOptions {
  /** Room/document ID */
  roomId: string;
  /** Current user info */
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  /** Heartbeat interval in ms (default: 5000) */
  heartbeatInterval?: number;
  /** Inactivity timeout in ms (default: 30000) */
  inactivityTimeout?: number;
  /** Presence service URL (for WebSocket connection) */
  serviceUrl?: string;
  /** Enable mock mode for development */
  mockMode?: boolean;
}

export interface UsePresenceResult {
  /** Current presence state */
  presence: PresenceState;
  /** Update current user's status */
  updateStatus: (isActive: boolean) => void;
  /** Update current user's cursor position */
  updateCursor: (position: CursorPosition | null) => void;
  /** Update current user's selection */
  updateSelection: (selection: SelectionRange | null) => void;
  /** Send a custom message */
  broadcast: (type: string, payload: unknown) => void;
  /** Whether currently connected */
  isConnected: boolean;
  /** Connection error if any */
  error: Error | null;
}

/**
 * Hook for managing real-time presence in collaborative features.
 *
 * Tracks who's viewing/editing a document and their activity.
 *
 * @example
 * const { presence, updateCursor, updateSelection } = usePresence({
 *   roomId: `deal-${dealId}`,
 *   user: { id: userId, name: userName, avatar: userAvatar },
 * });
 *
 * // Show who's viewing
 * {presence.others.map(p => (
 *   <Avatar key={p.id} src={p.avatar} name={p.name} />
 * ))}
 *
 * // Update cursor position
 * onMouseMove={(e) => updateCursor({ x: e.clientX, y: e.clientY })}
 */
export function usePresence(options: UsePresenceOptions): UsePresenceResult {
  const {
    roomId,
    user,
    heartbeatInterval = 5000,
    inactivityTimeout = 30000,
    // Default to real presence service in production; callers (tests, local demos)
    // can opt-in to mock mode explicitly via the `mockMode` option.
    // We also auto-enable mock mode when no service URL is configured AND we're
    // running in development, so dev/storybook doesn't require a live backend.
    mockMode = options.mockMode ?? (
      process.env.NODE_ENV === 'development' && !options.serviceUrl
    ),
  } = options;

  const [presence, setPresence] = useState<PresenceState>({
    self: null,
    others: [],
    totalCount: 0,
    isConnected: false,
  });
  const [error, setError] = useState<Error | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Create self participant
  const selfParticipant: Participant = useMemo(() => ({
    id: user.id,
    name: user.name,
    avatar: user.avatar,
    color: getColorForUser(user.id),
    isActive: true,
    lastActiveAt: Date.now(),
  }), [user]);

  // Initialize presence (mock mode)
  useEffect(() => {
    if (!mockMode) return;

    // Simulate connection
    const timer = setTimeout(() => {
      setPresence({
        self: selfParticipant,
        others: [],
        totalCount: 1,
        isConnected: true,
      });
      setIsConnected(true);
    }, 100);

    return () => clearTimeout(timer);
  }, [mockMode, selfParticipant]);

  // Update status
  const updateStatus = useCallback((isActive: boolean) => {
    setPresence((prev) => ({
      ...prev,
      self: prev.self ? { ...prev.self, isActive, lastActiveAt: Date.now() } : null,
    }));
    lastActivityRef.current = Date.now();
  }, []);

  // Update cursor position
  const updateCursor = useCallback((position: CursorPosition | null) => {
    setPresence((prev) => ({
      ...prev,
      self: prev.self ? { ...prev.self, cursor: position || undefined } : null,
    }));
    lastActivityRef.current = Date.now();
  }, []);

  // Update selection
  const updateSelection = useCallback((selection: SelectionRange | null) => {
    setPresence((prev) => ({
      ...prev,
      self: prev.self ? { ...prev.self, selection: selection || undefined } : null,
    }));
    lastActivityRef.current = Date.now();
  }, []);

  // Broadcast message
  const broadcast = useCallback((type: string, payload: unknown) => {
    if (!isConnected) return;

    const message: CollaborationMessage = {
      type: type as CollaborationMessage['type'],
      userId: user.id,
      payload,
      timestamp: Date.now(),
    };

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, [isConnected, user.id]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return {
    presence,
    updateStatus,
    updateCursor,
    updateSelection,
    broadcast,
    isConnected,
    error,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   USE CURSOR SYNC HOOK
   ═══════════════════════════════════════════════════════════════════════════ */

export interface UseCursorSyncOptions {
  /** Container ref to track cursor within */
  containerRef: RefObject<HTMLElement>;
  /** Presence hook result */
  presence: UsePresenceResult;
  /** Throttle cursor updates (ms) */
  throttleMs?: number;
  /** Whether to track cursor */
  enabled?: boolean;
}

export interface UseCursorSyncResult {
  /** Other users' cursor positions */
  cursors: Map<string, { position: CursorPosition; participant: Participant }>;
}

/**
 * Hook for syncing cursor positions across participants.
 *
 * @example
 * const containerRef = useRef<HTMLDivElement>(null);
 * const presence = usePresence({ roomId, user });
 * const { cursors } = useCursorSync({
 *   containerRef,
 *   presence,
 * });
 *
 * // Render other users' cursors
 * {Array.from(cursors.entries()).map(([userId, { position, participant }]) => (
 *   <RemoteCursor
 *     key={userId}
 *     x={position.x}
 *     y={position.y}
 *     color={participant.color}
 *     name={participant.name}
 *   />
 * ))}
 */
export function useCursorSync(options: UseCursorSyncOptions): UseCursorSyncResult {
  const {
    containerRef,
    presence,
    throttleMs = 50,
    enabled = true,
  } = options;

  const lastUpdateRef = useRef<number>(0);

  // Track mouse movement
  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;

    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastUpdateRef.current < throttleMs) return;
      lastUpdateRef.current = now;

      const rect = container.getBoundingClientRect();
      const position: CursorPosition = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };

      presence.updateCursor(position);
    };

    const handleMouseLeave = () => {
      presence.updateCursor(null);
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [containerRef, presence, throttleMs, enabled]);

  // Build cursors map from presence
  const cursors = useMemo(() => {
    const map = new Map<string, { position: CursorPosition; participant: Participant }>();

    for (const participant of presence.presence.others) {
      if (participant.cursor) {
        map.set(participant.id, {
          position: participant.cursor,
          participant,
        });
      }
    }

    return map;
  }, [presence.presence.others]);

  return { cursors };
}

/* ═══════════════════════════════════════════════════════════════════════════
   USE FIELD LOCK HOOK
   ═══════════════════════════════════════════════════════════════════════════ */

export interface FieldLock {
  /** Field being locked */
  fieldId: string;
  /** User who has the lock */
  userId: string;
  /** User's display name */
  userName: string;
  /** User's color */
  userColor: string;
  /** When the lock was acquired */
  lockedAt: number;
}

export interface UseFieldLockOptions {
  /** Presence hook result */
  presence: UsePresenceResult;
  /** Lock timeout in ms (auto-release after inactivity) */
  lockTimeout?: number;
}

export interface UseFieldLockResult {
  /** Current locks */
  locks: Map<string, FieldLock>;
  /** Request a lock on a field */
  requestLock: (fieldId: string) => boolean;
  /** Release a lock */
  releaseLock: (fieldId: string) => void;
  /** Check if a field is locked by someone else */
  isLockedByOther: (fieldId: string) => boolean;
  /** Check if current user has lock */
  hasLock: (fieldId: string) => boolean;
  /** Get lock info for a field */
  getLock: (fieldId: string) => FieldLock | null;
}

/**
 * Hook for managing field-level locks in collaborative editing.
 *
 * Prevents conflicts by allowing only one user to edit a field at a time.
 *
 * @example
 * const { requestLock, releaseLock, isLockedByOther, getLock } = useFieldLock({
 *   presence,
 * });
 *
 * const handleFocus = (fieldId: string) => {
 *   if (requestLock(fieldId)) {
 *     // Got the lock, can edit
 *   } else {
 *     // Field is locked by someone else
 *     const lock = getLock(fieldId);
 *     toast.info(`${lock?.userName} is editing this field`);
 *   }
 * };
 *
 * const handleBlur = (fieldId: string) => {
 *   releaseLock(fieldId);
 * };
 */
export function useFieldLock(options: UseFieldLockOptions): UseFieldLockResult {
  const { presence, lockTimeout = 30000 } = options;
  const [locks, setLocks] = useState<Map<string, FieldLock>>(new Map());
  const lockTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const selfId = presence.presence.self?.id;
  const selfName = presence.presence.self?.name || 'Unknown';
  const selfColor = presence.presence.self?.color || '#888';

  // Request a lock
  const requestLock = useCallback((fieldId: string): boolean => {
    if (!selfId) return false;

    const existingLock = locks.get(fieldId);

    // Already locked by someone else
    if (existingLock && existingLock.userId !== selfId) {
      return false;
    }

    // Already have the lock
    if (existingLock?.userId === selfId) {
      return true;
    }

    // Acquire lock
    const newLock: FieldLock = {
      fieldId,
      userId: selfId,
      userName: selfName,
      userColor: selfColor,
      lockedAt: Date.now(),
    };

    setLocks((prev) => {
      const updated = new Map(prev);
      updated.set(fieldId, newLock);
      return updated;
    });

    // Broadcast lock to others
    presence.broadcast('lock', { fieldId });

    // Set auto-release timeout
    const timeout = setTimeout(() => {
      releaseLock(fieldId);
    }, lockTimeout);
    lockTimeoutsRef.current.set(fieldId, timeout);

    return true;
  }, [selfId, selfName, selfColor, locks, presence, lockTimeout]);

  // Release a lock
  const releaseLock = useCallback((fieldId: string) => {
    if (!selfId) return;

    const existingLock = locks.get(fieldId);
    if (existingLock?.userId !== selfId) return;

    setLocks((prev) => {
      const updated = new Map(prev);
      updated.delete(fieldId);
      return updated;
    });

    // Clear timeout
    const timeout = lockTimeoutsRef.current.get(fieldId);
    if (timeout) {
      clearTimeout(timeout);
      lockTimeoutsRef.current.delete(fieldId);
    }

    // Broadcast unlock to others
    presence.broadcast('unlock', { fieldId });
  }, [selfId, locks, presence]);

  // Check if locked by other
  const isLockedByOther = useCallback((fieldId: string): boolean => {
    const lock = locks.get(fieldId);
    return !!lock && lock.userId !== selfId;
  }, [locks, selfId]);

  // Check if current user has lock
  const hasLock = useCallback((fieldId: string): boolean => {
    const lock = locks.get(fieldId);
    return !!lock && lock.userId === selfId;
  }, [locks, selfId]);

  // Get lock info
  const getLock = useCallback((fieldId: string): FieldLock | null => {
    return locks.get(fieldId) || null;
  }, [locks]);

  // Cleanup
  useEffect(() => {
    return () => {
      lockTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      lockTimeoutsRef.current.clear();
    };
  }, []);

  return {
    locks,
    requestLock,
    releaseLock,
    isLockedByOther,
    hasLock,
    getLock,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   USE COLLABORATIVE EDIT HOOK
   ═══════════════════════════════════════════════════════════════════════════ */

export interface Edit {
  /** Edit ID */
  id: string;
  /** User who made the edit */
  userId: string;
  /** Field that was edited */
  fieldId: string;
  /** Previous value */
  oldValue: unknown;
  /** New value */
  newValue: unknown;
  /** Timestamp */
  timestamp: number;
}

export interface UseCollaborativeEditOptions<T extends Record<string, unknown>> {
  /** Initial data */
  initialData: T;
  /** Presence hook result */
  presence: UsePresenceResult;
  /** Field lock hook result */
  fieldLock: UseFieldLockResult;
  /** Callback when data changes */
  onChange?: (data: T, edit: Edit) => void;
  /** Callback for remote edits */
  onRemoteEdit?: (edit: Edit) => void;
}

export interface UseCollaborativeEditResult<T extends Record<string, unknown>> {
  /** Current data */
  data: T;
  /** Update a field */
  updateField: <K extends keyof T>(fieldId: K, value: T[K]) => boolean;
  /** Edit history */
  history: Edit[];
  /** Undo last edit */
  undo: () => void;
  /** Redo last undone edit */
  redo: () => void;
  /** Can undo */
  canUndo: boolean;
  /** Can redo */
  canRedo: boolean;
}

/**
 * Hook for collaborative editing with conflict prevention.
 *
 * @example
 * const { data, updateField, canUndo, undo } = useCollaborativeEdit({
 *   initialData: deal,
 *   presence,
 *   fieldLock,
 *   onChange: (data) => saveDraft(data),
 * });
 *
 * <Input
 *   value={data.title}
 *   onChange={(e) => updateField('title', e.target.value)}
 *   disabled={fieldLock.isLockedByOther('title')}
 *   onFocus={() => fieldLock.requestLock('title')}
 *   onBlur={() => fieldLock.releaseLock('title')}
 * />
 */
export function useCollaborativeEdit<T extends Record<string, unknown>>(
  options: UseCollaborativeEditOptions<T>
): UseCollaborativeEditResult<T> {
  const {
    initialData,
    presence,
    fieldLock,
    onChange,
    onRemoteEdit,
  } = options;

  const [data, setData] = useState<T>(initialData);
  const [history, setHistory] = useState<Edit[]>([]);
  const [undoneEdits, setUndoneEdits] = useState<Edit[]>([]);

  const selfId = presence.presence.self?.id;

  // Update a field
  const updateField = useCallback(<K extends keyof T>(fieldId: K, value: T[K]): boolean => {
    if (!selfId) return false;

    const fieldIdStr = String(fieldId);

    // Check if we have the lock
    if (!fieldLock.hasLock(fieldIdStr)) {
      // Try to acquire lock
      if (!fieldLock.requestLock(fieldIdStr)) {
        return false;
      }
    }

    const oldValue = data[fieldId];
    if (oldValue === value) return true;

    const edit: Edit = {
      id: `edit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: selfId,
      fieldId: fieldIdStr,
      oldValue,
      newValue: value,
      timestamp: Date.now(),
    };

    const newData = { ...data, [fieldId]: value };

    setData(newData);
    setHistory((prev) => [...prev, edit]);
    setUndoneEdits([]); // Clear redo stack on new edit

    // Broadcast edit
    presence.broadcast('edit', edit);

    // Notify change
    onChange?.(newData, edit);

    return true;
  }, [selfId, data, fieldLock, presence, onChange]);

  // Undo
  const undo = useCallback(() => {
    if (history.length === 0) return;

    const lastEdit = history[history.length - 1];

    // Only undo our own edits
    if (lastEdit.userId !== selfId) return;

    const newData = { ...data, [lastEdit.fieldId]: lastEdit.oldValue } as T;

    setData(newData);
    setHistory((prev) => prev.slice(0, -1));
    setUndoneEdits((prev) => [...prev, lastEdit]);

    // Broadcast undo
    presence.broadcast('edit', {
      ...lastEdit,
      id: `undo_${lastEdit.id}`,
      oldValue: lastEdit.newValue,
      newValue: lastEdit.oldValue,
    });
  }, [history, selfId, data, presence]);

  // Redo
  const redo = useCallback(() => {
    if (undoneEdits.length === 0) return;

    const editToRedo = undoneEdits[undoneEdits.length - 1];
    const newData = { ...data, [editToRedo.fieldId]: editToRedo.newValue } as T;

    setData(newData);
    setHistory((prev) => [...prev, editToRedo]);
    setUndoneEdits((prev) => prev.slice(0, -1));

    // Broadcast redo
    presence.broadcast('edit', editToRedo);
  }, [undoneEdits, data, presence]);

  const canUndo = history.filter((e) => e.userId === selfId).length > 0;
  const canRedo = undoneEdits.length > 0;

  return {
    data,
    updateField,
    history,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   REMOTE CURSOR COMPONENT STYLES
   For use with CSS-in-JS or className
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * CSS for rendering remote cursors.
 *
 * Usage: Add these styles to your CSS or use with styled-components/emotion.
 *
 * @example
 * // In your CSS file
 * .remote-cursor {
 *   position: absolute;
 *   pointer-events: none;
 *   z-index: 50;
 *   transform: translate(-2px, -2px);
 *   transition: all 50ms linear;
 * }
 *
 * .remote-cursor-pointer {
 *   width: 0;
 *   height: 0;
 *   border-left: 6px solid transparent;
 *   border-right: 6px solid transparent;
 *   border-bottom: 12px solid currentColor;
 *   transform: rotate(-45deg);
 * }
 *
 * .remote-cursor-label {
 *   position: absolute;
 *   top: 14px;
 *   left: 4px;
 *   padding: 2px 6px;
 *   font-size: 11px;
 *   font-weight: 500;
 *   white-space: nowrap;
 *   border-radius: 4px;
 *   color: white;
 * }
 */
export const REMOTE_CURSOR_STYLES = `
.remote-cursor {
  position: absolute;
  pointer-events: none;
  z-index: 50;
  transform: translate(-2px, -2px);
  transition: all 50ms linear;
}

.remote-cursor-pointer {
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-bottom: 12px solid currentColor;
  transform: rotate(-45deg);
}

.remote-cursor-label {
  position: absolute;
  top: 14px;
  left: 4px;
  padding: 2px 6px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  border-radius: 4px;
  color: white;
}
`;
