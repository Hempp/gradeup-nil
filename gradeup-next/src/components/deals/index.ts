// Deal Components
export { DealHeader } from './DealHeader';
export { DealTimeline } from './DealTimeline';
export { ContractSection } from './ContractSection';
export { MessagesPanel } from './MessagesPanel';
export { DeliverablesList } from './DeliverablesList';
export { CounterOfferModal, type AthleteInfo } from './CounterOfferModal';
export {
  LoadingState,
  ErrorState,
  NotFoundState,
  DealStatusBanner,
} from './DealStates';

// Types
export type {
  BrandInfo,
  TimelineItem,
  DeliverableStatus,
  Deliverable,
  DealMessage,
  DealDetail,
  CounterOfferFormData,
  CounterOfferFormErrors,
  Tab,
} from './types';

// Helper Functions
export {
  isDealExpired,
  getDaysUntilExpiration,
  validateCounterOffer,
} from './types';
