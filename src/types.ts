// Core types for Brain

export interface Module {
  name: string;
  path: string;
  dependsOn: string[];
  confidence?: number;
}

export interface Route {
  name: string;
  path: string;
  methods?: string[];
  controller?: string;
  module?: string;
  file?: string;
}

export interface Command {
  name: string;
  class?: string;
  description?: string;
  safe: boolean;
}

export interface KeyFile {
  path: string;
  role: string;
  language?: string;
}

export interface NavigationCommand {
  description: string;
  command: string;
}

export interface Conventions {
  standards: string[];
  notes: string[];
  navigation: NavigationCommand[];
}

export interface QuickFindMapping {
  task: string;
  location: string;
}

export interface BrainData {
  framework: string;
  modules: Module[];
  routes: Route[];
  commands: Command[];
  conventions: Conventions;
  keyFiles: KeyFile[];
  quickFind: QuickFindMapping[];
  fileCount: number;
}

export interface AdapterMatch {
  supported: boolean;
  framework: string;
  confidence: number;
  reasons: string[];
}

export interface Adapter {
  name: string;
  priority: number;
  detect(dir: string): Promise<AdapterMatch>;
  extract(dir: string): Promise<BrainData>;
}

export enum TopicStatus {
  New = 'new',
  UpToDate = 'up_to_date',
  Stale = 'stale',
  Orphaned = 'orphaned',
}

export enum TopicStaleReason {
  FilesChanged = 'files_changed',
  ContentChanged = 'content_changed',
}

export interface Topic {
  name: string;
  keywords: string[];
  files: string[];
  routes: Route[];
  commands: Command[];
  status: TopicStatus;
  staleReason?: TopicStaleReason;
  staleDetails?: {
    added?: string[];
    removed?: string[];
    modified?: string[];
  };
}

export interface TopicQuality {
  lines: number;
  flows: number;
  gotchas: number;
  routes: number;
  commands: number;
  fileCoverage: number;
  score: number;
}

export interface TopicMeta {
  draft_generated: string;
  enriched_at: string | null;
  enriched_files: string[];
  file_hashes: Record<string, string>;
  status: TopicStatus;
  status_reason?: TopicStaleReason;
  status_details?: {
    added?: string[];
    removed?: string[];
    modified?: string[];
  };
  quality?: TopicQuality;
}

export interface TopicMetadata {
  topics: Record<string, TopicMeta>;
}

// === Topic Index ===
export interface TopicIndexEntry {
  name: string;
  keywords: string[];
  paths: string[];
  defaultSkill: string;
  dependsOn: string[];
  relatedTo: string[];
}

export interface TopicIndex {
  topics: Record<string, TopicIndexEntry>;
}

// === Freshness ===
export type FreshnessStatus = 'fresh' | 'stale' | 'dirty';

export interface FreshnessEntry {
  topic: string;
  status: FreshnessStatus;
  lastCheck: string;
  changedFiles?: string[];
}

export interface FreshnessData {
  entries: Record<string, FreshnessEntry>;
  brainMdStatus: FreshnessStatus;
  lastUpdated: string;
}

// === Skills ===
export interface SkillConfig {
  name: string;
  description: string;
  inputType: 'topic' | 'diff' | 'error' | 'query';
  requiredTopics: string[];
}

export interface SkillResult {
  goal: string;
  topic: string;
  files: string[];
  actions: string[];
  risks: string[];
  next: string;
  content?: string;
  outputFile?: string;
}

// === Router ===
export interface RouterEntry {
  keywords: string[];
  paths: string[];
  topic: string;
  skill: string;
  score: number;
}
