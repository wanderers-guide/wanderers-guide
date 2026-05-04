export interface KpiResponse {
  humanVisitors: number;
  humanViews: number;
  humanAssistant: number;
  humanSearches: number;
  humanFeedback: number;
  agentVisitors: number;
  agentViews: number;
  agentMcpSearches: number;
}

export interface BucketSummary {
  id: string;
  questionSummary: string;
  size: number;
  status: string;
  lastAsked: string | null;
  lastOccurredAt: string | null;
  createdAt: string;
}

export interface BucketsResponse {
  data: BucketSummary[];
  pagination: { total: number };
}

export interface BucketThread {
  id: string;
  firstUserMessage: string | null;
  feedback: { up: number; down: number };
  resolutionStatus: string | null;
  length: number;
  createdAt: string;
  lastMessageAt: string | null;
}

export interface BucketThreadsResponse {
  data: BucketThread[];
  pagination: { total: number; hasMore: boolean; nextCursor: string | null };
}

export interface FeedbackItem {
  id: string;
  path: string;
  comment: string | null;
  createdAt: string | null;
  source: string;
  status: string;
  helpful?: boolean;
  contact?: string;
  code?: string;
  filename?: string;
  lang?: string;
}

export interface FeedbackResponse {
  feedback: FeedbackItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface FeedbackByPageItem {
  path: string;
  thumbsUp: number;
  thumbsDown: number;
  code: number;
  total: number;
}

export interface FeedbackByPageResponse {
  feedback: FeedbackByPageItem[];
  hasMore: boolean;
}

export interface ConversationSource {
  title: string;
  url: string;
}

export interface Conversation {
  id: string;
  timestamp: string;
  query: string;
  response: string;
  sources: ConversationSource[];
  queryCategory: string | null;
}

export interface ConversationResponse {
  conversations: Conversation[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface SearchRow {
  searchQuery: string;
  hits: number;
  ctr: number;
  topClickedPage: string | null;
  lastSearchedAt: string;
}

export interface SearchResponse {
  searches: SearchRow[];
  totalSearches: number;
  nextCursor: string | null;
}

export interface TrafficTotals {
  human: number;
  ai: number;
  total: number;
}

export interface TrafficRow {
  path: string;
  human: number;
  ai: number;
  total: number;
}

export interface ViewsResponse {
  totals: TrafficTotals;
  views: TrafficRow[];
  hasMore: boolean;
}

export interface VisitorsResponse {
  totals: TrafficTotals;
  visitors: TrafficRow[];
  hasMore: boolean;
}
