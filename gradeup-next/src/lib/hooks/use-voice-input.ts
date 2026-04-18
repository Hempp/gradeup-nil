'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

/* ═══════════════════════════════════════════════════════════════════════════
   WEB SPEECH API TYPE DECLARATIONS
   These types are not in standard TypeScript libs
   ═══════════════════════════════════════════════════════════════════════════ */

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: SpeechRecognitionErrorCode;
  message?: string;
}

type SpeechRecognitionErrorCode =
  | 'no-speech'
  | 'aborted'
  | 'audio-capture'
  | 'network'
  | 'not-allowed'
  | 'service-not-allowed'
  | 'bad-grammar'
  | 'language-not-supported';

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

/* ═══════════════════════════════════════════════════════════════════════════
   VOICE INPUT TYPES
   ═══════════════════════════════════════════════════════════════════════════ */

export type VoiceInputStatus =
  | 'idle'
  | 'requesting-permission'
  | 'listening'
  | 'processing'
  | 'error';

export interface VoiceInputResult {
  /** Final transcript text */
  transcript: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Whether this is a final result */
  isFinal: boolean;
}

export interface VoiceCommand {
  /** Pattern to match (regex or string) */
  pattern: RegExp | string;
  /** Handler when matched */
  handler: (match: RegExpMatchArray | null, transcript: string) => void;
  /** Description for help/accessibility */
  description: string;
}

export interface UseVoiceInputOptions {
  /** Language for recognition (default: 'en-US') */
  language?: string;
  /** Enable continuous listening (default: false) */
  continuous?: boolean;
  /** Enable interim results (default: true) */
  interimResults?: boolean;
  /** Maximum alternatives to return (default: 1) */
  maxAlternatives?: number;
  /** Callback when final result received */
  onResult?: (result: VoiceInputResult) => void;
  /** Callback for interim results */
  onInterimResult?: (transcript: string) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Callback when listening starts */
  onStart?: () => void;
  /** Callback when listening stops */
  onEnd?: () => void;
  /** Voice commands to recognize */
  commands?: VoiceCommand[];
  /** Auto-stop after silence (ms) */
  silenceTimeout?: number;
}

export interface UseVoiceInputResult {
  /** Current status */
  status: VoiceInputStatus;
  /** Whether currently listening */
  isListening: boolean;
  /** Whether speech recognition is supported */
  isSupported: boolean;
  /** Current transcript (final or interim) */
  transcript: string;
  /** Final transcript after processing */
  finalTranscript: string;
  /** Interim transcript while speaking */
  interimTranscript: string;
  /** Confidence of last result */
  confidence: number;
  /** Error if any */
  error: Error | null;
  /** Start listening */
  startListening: () => Promise<void>;
  /** Stop listening */
  stopListening: () => void;
  /** Toggle listening */
  toggleListening: () => Promise<void>;
  /** Clear transcript */
  clearTranscript: () => void;
}

/* ═══════════════════════════════════════════════════════════════════════════
   SPEECH RECOGNITION SETUP
   ═══════════════════════════════════════════════════════════════════════════ */

// Get the SpeechRecognition constructor (handle browser prefixes)
function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;

  return (
    (window as Window & { SpeechRecognition?: SpeechRecognitionConstructor }).SpeechRecognition ||
    (window as Window & { webkitSpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition ||
    null
  );
}

// Check if speech recognition is supported
export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognition() !== null;
}

/* ═══════════════════════════════════════════════════════════════════════════
   USE VOICE INPUT HOOK
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Hook for voice input using the Web Speech API.
 *
 * Enables voice-to-text for search, commands, and data entry.
 *
 * @example
 * // Basic usage
 * const { isListening, transcript, startListening, stopListening } = useVoiceInput({
 *   onResult: (result) => {
 *     setSearchQuery(result.transcript);
 *   },
 * });
 *
 * return (
 *   <>
 *     <Input value={transcript} placeholder="Speak to search..." />
 *     <Button onClick={toggleListening}>
 *       {isListening ? <MicOff /> : <Mic />}
 *     </Button>
 *   </>
 * );
 *
 * @example
 * // With voice commands
 * const { startListening } = useVoiceInput({
 *   commands: [
 *     {
 *       pattern: /show me (\w+) players/i,
 *       handler: (match) => setSportFilter(match?.[1] || ''),
 *       description: 'Filter by sport',
 *     },
 *     {
 *       pattern: /gpa (above|over) (\d+\.?\d*)/i,
 *       handler: (match) => setMinGpa(parseFloat(match?.[2] || '0')),
 *       description: 'Filter by minimum GPA',
 *     },
 *   ],
 * });
 */
export function useVoiceInput(options: UseVoiceInputOptions = {}): UseVoiceInputResult {
  const {
    language = 'en-US',
    continuous = false,
    interimResults = true,
    maxAlternatives = 1,
    onResult,
    onInterimResult,
    onError,
    onStart,
    onEnd,
    commands = [],
    silenceTimeout = 3000,
  } = options;

  const [status, setStatus] = useState<VoiceInputStatus>('idle');
  const [transcript, setTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isListeningRef = useRef(false);

  const isSupported = isSpeechRecognitionSupported();
  const isListening = status === 'listening';

  // Process voice commands
  const processCommands = useCallback((text: string) => {
    for (const command of commands) {
      const pattern = typeof command.pattern === 'string'
        ? new RegExp(command.pattern, 'i')
        : command.pattern;

      const match = text.match(pattern);
      if (match) {
        command.handler(match, text);
        return true;
      }
    }
    return false;
  }, [commands]);

  // Initialize recognition
  const initRecognition = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.maxAlternatives = maxAlternatives;

    recognition.onstart = () => {
      setStatus('listening');
      setError(null);
      isListeningRef.current = true;
      onStart?.();
    };

    recognition.onend = () => {
      setStatus('idle');
      isListeningRef.current = false;
      onEnd?.();

      // Clear silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const errorMessage = getErrorMessage(event.error);
      const err = new Error(errorMessage);
      setError(err);
      setStatus('error');
      isListeningRef.current = false;
      onError?.(err);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Reset silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }

      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;

        if (result.isFinal) {
          final += text;
          setConfidence(result[0].confidence);
        } else {
          interim += text;
        }
      }

      if (final) {
        setFinalTranscript((prev) => prev + final);
        setTranscript((prev) => prev + final);
        setInterimTranscript('');

        const voiceResult: VoiceInputResult = {
          transcript: final,
          confidence: event.results[event.results.length - 1][0].confidence,
          isFinal: true,
        };

        // Process commands
        processCommands(final);

        onResult?.(voiceResult);
      }

      if (interim) {
        setInterimTranscript(interim);
        setTranscript(finalTranscript + interim);
        onInterimResult?.(interim);
      }

      // Set silence timer for auto-stop
      if (silenceTimeout > 0 && !continuous) {
        silenceTimerRef.current = setTimeout(() => {
          if (isListeningRef.current) {
            recognition.stop();
          }
        }, silenceTimeout);
      }
    };

    return recognition;
  }, [
    language,
    continuous,
    interimResults,
    maxAlternatives,
    silenceTimeout,
    finalTranscript,
    onStart,
    onEnd,
    onError,
    onResult,
    onInterimResult,
    processCommands,
  ]);

  // Start listening
  const startListening = useCallback(async () => {
    if (!isSupported) {
      const err = new Error('Speech recognition is not supported in this browser');
      setError(err);
      setStatus('error');
      onError?.(err);
      return;
    }

    if (isListeningRef.current) return;

    // Request microphone permission
    setStatus('requesting-permission');

    try {
      // Check/request permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop()); // Stop immediately, we just needed permission

      // Initialize and start recognition
      recognitionRef.current = initRecognition();
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Microphone permission denied');
      setError(error);
      setStatus('error');
      onError?.(error);
    }
  }, [isSupported, initRecognition, onError]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListeningRef.current) {
      recognitionRef.current.stop();
    }

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  // Toggle listening
  const toggleListening = useCallback(async () => {
    if (isListening) {
      stopListening();
    } else {
      await startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Clear transcript
  const clearTranscript = useCallback(() => {
    setTranscript('');
    setFinalTranscript('');
    setInterimTranscript('');
    setConfidence(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, []);

  return {
    status,
    isListening,
    isSupported,
    transcript,
    finalTranscript,
    interimTranscript,
    confidence,
    error,
    startListening,
    stopListening,
    toggleListening,
    clearTranscript,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   ERROR MESSAGE HELPER
   ═══════════════════════════════════════════════════════════════════════════ */

function getErrorMessage(error: SpeechRecognitionErrorCode): string {
  const errorMessages: Record<string, string> = {
    'no-speech': 'No speech was detected. Please try again.',
    'aborted': 'Speech recognition was aborted.',
    'audio-capture': 'No microphone was found or microphone is not working.',
    'network': 'Network error occurred. Please check your connection.',
    'not-allowed': 'Microphone permission was denied. Please allow microphone access.',
    'service-not-allowed': 'Speech recognition service is not allowed.',
    'bad-grammar': 'Speech recognition grammar error.',
    'language-not-supported': 'The language is not supported.',
  };

  return errorMessages[error] || `Speech recognition error: ${error}`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   VOICE SEARCH HOOK
   Specialized hook for voice-activated search
   ═══════════════════════════════════════════════════════════════════════════ */

export interface UseVoiceSearchOptions {
  /** Callback when search query is ready */
  onSearch: (query: string) => void;
  /** Delay before triggering search after final result (ms) */
  searchDelay?: number;
  /** Minimum query length to trigger search */
  minQueryLength?: number;
  /** Voice input options */
  voiceOptions?: Omit<UseVoiceInputOptions, 'onResult'>;
}

export interface UseVoiceSearchResult extends Omit<UseVoiceInputResult, 'onResult'> {
  /** Trigger search with current transcript */
  search: () => void;
}

/**
 * Specialized hook for voice-activated search.
 *
 * @example
 * const { isListening, transcript, toggleListening, search } = useVoiceSearch({
 *   onSearch: (query) => {
 *     router.push(`/search?q=${encodeURIComponent(query)}`);
 *   },
 * });
 *
 * return (
 *   <div className="flex gap-2">
 *     <Input value={transcript} readOnly placeholder="Speak to search..." />
 *     <Button onClick={toggleListening}>
 *       {isListening ? 'Stop' : 'Start'} Voice Search
 *     </Button>
 *   </div>
 * );
 */
export function useVoiceSearch(options: UseVoiceSearchOptions): UseVoiceSearchResult {
  const {
    onSearch,
    searchDelay = 500,
    minQueryLength = 2,
    voiceOptions = {},
  } = options;

  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const voiceInput = useVoiceInput({
    ...voiceOptions,
    onResult: (result) => {
      // Clear any pending search
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }

      // Schedule search after delay
      if (result.transcript.trim().length >= minQueryLength) {
        searchTimerRef.current = setTimeout(() => {
          onSearch(result.transcript.trim());
        }, searchDelay);
      }
    },
  });

  // Manual search trigger
  const search = useCallback(() => {
    if (voiceInput.transcript.trim().length >= minQueryLength) {
      onSearch(voiceInput.transcript.trim());
    }
  }, [voiceInput.transcript, minQueryLength, onSearch]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, []);

  return {
    ...voiceInput,
    search,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   ATHLETE SEARCH VOICE COMMANDS
   Pre-defined commands for athlete search
   ═══════════════════════════════════════════════════════════════════════════ */

export interface AthleteSearchFilters {
  sport?: string;
  minGpa?: number;
  maxGpa?: number;
  school?: string;
  verified?: boolean;
  minFollowers?: number;
  year?: string;
}

/**
 * Create voice commands for athlete search.
 *
 * @example
 * const { commands, filters, setFilters } = useAthleteVoiceCommands();
 *
 * const voiceInput = useVoiceInput({
 *   commands,
 *   onResult: (result) => {
 *     // Commands automatically update filters
 *     applyFilters(filters);
 *   },
 * });
 */
export function createAthleteVoiceCommands(
  setFilters: (updater: (prev: AthleteSearchFilters) => AthleteSearchFilters) => void
): VoiceCommand[] {
  return [
    {
      pattern: /show me (\w+) players/i,
      handler: (match) => {
        const sport = match?.[1];
        if (sport) {
          setFilters((prev) => ({ ...prev, sport: capitalizeFirst(sport) }));
        }
      },
      description: 'Filter by sport (e.g., "show me basketball players")',
    },
    {
      pattern: /gpa (above|over|at least|minimum) (\d+\.?\d*)/i,
      handler: (match) => {
        const gpa = parseFloat(match?.[2] || '0');
        if (gpa > 0 && gpa <= 4.0) {
          setFilters((prev) => ({ ...prev, minGpa: gpa }));
        }
      },
      description: 'Set minimum GPA (e.g., "GPA above 3.5")',
    },
    {
      pattern: /gpa (below|under|maximum|max) (\d+\.?\d*)/i,
      handler: (match) => {
        const gpa = parseFloat(match?.[2] || '4.0');
        if (gpa > 0 && gpa <= 4.0) {
          setFilters((prev) => ({ ...prev, maxGpa: gpa }));
        }
      },
      description: 'Set maximum GPA (e.g., "GPA below 3.0")',
    },
    {
      pattern: /from (\w+(?:\s+\w+)*) (?:university|college|school)/i,
      handler: (match) => {
        const school = match?.[1];
        if (school) {
          setFilters((prev) => ({ ...prev, school: capitalizeWords(school) }));
        }
      },
      description: 'Filter by school (e.g., "from Ohio State university")',
    },
    {
      pattern: /verified (only|athletes)/i,
      handler: () => {
        setFilters((prev) => ({ ...prev, verified: true }));
      },
      description: 'Show only verified athletes',
    },
    {
      pattern: /(\d+)k?\+?\s*followers/i,
      handler: (match) => {
        let followers = parseInt(match?.[1] || '0', 10);
        if (match?.[0]?.toLowerCase().includes('k')) {
          followers *= 1000;
        }
        setFilters((prev) => ({ ...prev, minFollowers: followers }));
      },
      description: 'Set minimum followers (e.g., "10k followers")',
    },
    {
      pattern: /(freshman|sophomore|junior|senior|graduate)/i,
      handler: (match) => {
        const year = match?.[1];
        if (year) {
          setFilters((prev) => ({ ...prev, year: capitalizeFirst(year) }));
        }
      },
      description: 'Filter by year (e.g., "junior")',
    },
    {
      pattern: /clear (?:all )?filters/i,
      handler: () => {
        setFilters(() => ({}));
      },
      description: 'Clear all filters',
    },
    {
      pattern: /reset/i,
      handler: () => {
        setFilters(() => ({}));
      },
      description: 'Reset search',
    },
  ];
}

// Helper functions
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function capitalizeWords(str: string): string {
  return str.split(' ').map(capitalizeFirst).join(' ');
}
