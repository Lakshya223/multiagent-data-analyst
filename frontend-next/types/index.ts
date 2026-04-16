export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  agentType?: 'hypothesis' | 'sql' | 'eda' | 'fallback'
}

export interface Finding {
  title: string
  body: string
  confidence: 'High' | 'Medium' | 'Low'
  section?: 'hypothesis' | 'recommendation' | 'other'
}

export interface TableData {
  columns: string[]
  rows: Record<string, unknown>[]
}

export interface SqlResult {
  query: string
  tableData: TableData | null
}

export interface AnalysisResult {
  sessionId: string
  findings: Finding[]
  summary: string             // ## Summary section from hypothesis report
  chartUrls: string[]
  chartInferences: string[]   // parallel to chartUrls — one inference string per chart
  sqlQuery: string | null
  sqlQueries: string[]        // all SQL queries executed in the session
  sqlResults: SqlResult[]     // paired query + table data for each SQL call
  answer: string
  edaInferences: string[]     // all EDA round narratives
}

export type AppStatus =
  | { state: 'idle' }
  | { state: 'processing'; agent: string }

export const SUGGESTIONS = [
  "What are the top product categories by revenue?",
  "What is the return rate by purchase channel?",
  "Which store has the highest average order value?",
  "How do loyalty vs non-loyalty customers differ?",
  "Explain day wise add to cart and checkout behavior",
  "What are the top campaigns sent",
]

export const AGENT_LABELS: Record<string, string> = {
  sql_agent: "SQL Agent",
  eda_agent: "EDA Agent",
  hypothesis_agent: "Hypothesis Agent",
  fallback: "Fallback Agent",
  supervisor: "Supervisor",
}

export interface ResultEntry {
  id: string;
  result: AnalysisResult;
}

export type AppPhase = 'landing' | 'instructor_options' | 'tour' | 'app'

export interface TourStep {
  target: string
  title: string
  description: string
}

export const TOUR_STEPS: TourStep[] = [
  {
    target: 'status-bar',
    title: 'Live agent status',
    description: 'See which AI agent is currently thinking — SQL, EDA, or Hypothesis.',
  },
  {
    target: 'chat-panel',
    title: 'Ask in plain English',
    description: 'Type any question about your retail data. No SQL knowledge required.',
  },
  {
    target: 'chat-input',
    title: 'Fire a query',
    description: 'Type your question here or pick one of the suggestion chips above.',
  },
  {
    target: 'results-panel',
    title: 'Three views of your results',
    description: 'Results appear as AI Findings, Analysis charts, and raw Data — all in one place.',
  },
  {
    target: 'tab-bar',
    title: 'Switch between views',
    description: 'Toggle between Findings, Analysis, and Data tabs to explore results.',
  },
]
