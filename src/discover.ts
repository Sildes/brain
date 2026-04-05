import type { BrainData, Route, Command, Topic } from "./types.js";
import { TopicStatus } from "./types.js";

const GENERIC_TERMS = new Set([
  'service', 'controller', 'repository', 'entity', 'model', 'manager', 'handler',
  'factory', 'builder', 'provider', 'helper', 'util', 'utils', 'wrapper', 'adapter',
  'app', 'src', 'lib', 'bundle', 'component', 'module', 'interface', 'abstract', 'base',
  'api', 'http', 'request', 'response', 'json', 'xml', 'config', 'test', 'tests', 'spec',
  'index', 'main', 'default', 'types', 'type', 'class', 'const', 'enum',
  'get', 'set', 'add', 'remove', 'delete', 'update', 'create', 'edit', 'save', 'load',
  'list', 'show', 'new', 'old', 'name', 'value', 'data', 'result', 'output', 'input',
  'file', 'path', 'dir', 'folder', 'public', 'private', 'protected', 'static', 'final',
  'true', 'false', 'null', 'undefined', 'void', 'return', 'function', 'var', 'let',
  'error', 'exception', 'log', 'debug', 'info', 'warn', 'notice', 'critical', 'alert',
  'bin', 'env', 'prod', 'dev', 'local', 'cache', 'tmp', 'temp', 'build', 'dist',
  'composer', 'npm', 'yarn', 'node', 'vendor', 'node_modules',
  'css', 'js', 'ts', 'php', 'html', 'sql', 'yaml', 'yml', 'md',
  'symfony', 'laravel', 'doctrine', 'twig', 'monolog', 'maker',
  'ee', 'et', 'cs', 'se', 'si', 'me', 'te', 'ce', 'de', 'le', 'la', 'les',
  'fr', 'en', 'es', 'de', 'it', 'pt', 'ru', 'ja', 'zh', 'ko', 'ar',
  'up', 'down', 'on', 'off', 'in', 'out', 'to', 'from', 'with', 'without',
  'core', 'common', 'general', 'misc', 'other', 'extra',
  'install', 'uninstall', 'setup', 'init', 'run', 'start', 'stop', 'restart',

  'style', 'doc', 'docs', 'quick', 'validate', 'simple', 'hidden', 'confirm', 'read',
  'generate', 'preview', 'configuration', 'guide', 'clear', 'frame', 'inline', 'link',
  'unit', 'initial', 'featured', 'fixture', 'example', 'complete', 'smart', 'filter',
  'batch', 'export', 'secure', 'send', 'verify', 'change', 'upload', 'search', 'count',
  'action', 'match', 'route', 'page', 'web', 'part', 'content', 'setting', 'icon',
  'layer', 'marker', 'subscriber', 'event', 'listener', 'bug', 'correction', 'topic',
  'prompt', 'brain', 'readme', 'functional', 'summary', 'rule', 'project', 'command',
  'notification', 'card', 'conversation', 'score', 'archive', 'template', 'term',
  'magic', 'form', 'token', 'email', 'reset', 'password', 'check', 'dashboard',
  'linking', 'connexion', 'impersonate', 'broadcast', 'package', 'secure',
  'success', 'thread', 'accordion', 'animated', 'expandable', 'field', 'item',
  'connection', 'connect', 'hide', 'profil', 'extension', 'extension', 'as', 'ft',
  'no', 'not', 'story', 'storie', 'fixture', 'script', 'deployment', 'plan',
  'generator', 'post', 'landing', 'promo', 'newsletter', 'phone', 'chat',
  'modal', 'calendar', 'tailwind', 'gif', 'editor', 'review',
  'sonata', 'crud', 'fixture', 'subscriber', 'subscriber',

  'id', 'uid', 'guid', 'uuid', 'fk', 'pk',
  'tab', 'table', 'row', 'column', 'grid', 'cell', 'header', 'footer', 'nav',
  'btn', 'button', 'input', 'select', 'checkbox', 'radio', 'toggle', 'dropdown',
  'label', 'placeholder', 'tooltip', 'badge', 'alert', 'toast', 'popup', 'overlay',
  'sidebar', 'navbar', 'toolbar', 'menu', 'breadcrumb', 'pagination',
  'wrapper', 'container', 'layout', 'section', 'block', 'slot', 'panel', 'widget',
  'red', 'blue', 'green', 'white', 'black', 'gray', 'dark', 'light',
  'sm', 'md', 'lg', 'xl', 'xs', 'xxl',
  'left', 'right', 'top', 'bottom', 'center', 'middle',
  'width', 'height', 'size', 'margin', 'padding', 'border', 'radius',
  'desktop', 'mobile', 'tablet', 'responsive',
  'frontend', 'backend', 'server', 'client', 'proxy', 'middleware',
  'database', 'migration', 'schema', 'seed', 'collection', 'association',
  'encode', 'decode', 'parse', 'serialize', 'transform', 'convert', 'format',
  'enabled', 'disabled', 'active', 'inactive', 'visible', 'invisible',
  'status', 'state', 'flag', 'option', 'param', 'argument', 'attribute',
  'callback', 'hook', 'event', 'signal', 'dispatch', 'emit',
  'apply', 'execute', 'process', 'handle', 'resolve', 'reject', 'fulfill',
  'copy', 'paste', 'drag', 'drop', 'scroll', 'zoom', 'click', 'hover', 'focus', 'blur',
  'async', 'await', 'promise', 'observable', 'stream', 'buffer',
  'version', 'release', 'changelog', 'commit', 'branch', 'merge', 'tag',
]);

const EXPANSIONS: Record<string, string> = {
  'auth': 'authentication',
  'authz': 'authorization',
  'pay': 'payments',
  'usr': 'users',
  'notif': 'notifications',
  'msg': 'messaging',
  'inv': 'inventory',
  'rpt': 'reporting',
};

const MAX_CLUSTER_SIZE = 15;
const MAX_TOPIC_COVERAGE = 0.25;
const MAX_KEYWORD_COVERAGE = 0.35;

interface TermInfo {
  term: string;
  source: string;
  weight: number;
  files: Set<string>;
  totalScore: number;
}

function splitTerms(input: string): string[] {
  if (typeof input !== 'string') return [];
  return input
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_\-./\\::{}()\[\]]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function normalizeTerm(term: string): string {
  let t = term.toLowerCase();
  if (t.endsWith('ies') && t.length > 4) {
    t = t.slice(0, -3) + 'y';
  } else if (/(?:sh|ch|ss|x|z)es$/.test(t)) {
    t = t.slice(0, -2);
  } else if (/(?:ss|us|is)$/.test(t)) {
    // already singular — don't strip
  } else if (t.endsWith('s') && t.length > 2) {
    t = t.slice(0, -1);
  }
  return t;
}

function isNoiseTerm(term: string): boolean {
  if (/^\d+$/.test(term)) return true;
  if (/^\d+x\d+$/.test(term)) return true;
  if (/^\d+x$/.test(term)) return true;
  if (/^user\d+$/.test(term)) return true;
  if (term.length <= 2) return true;
  return false;
}

function isBlacklisted(term: string): boolean {
  return GENERIC_TERMS.has(term) || isNoiseTerm(term);
}

function extractTermsFromPath(filePath: string): string[] {
  const parts = filePath.replace(/\.[^.]+$/, '').split(/[/\\]/);
  const terms: string[] = [];
  for (const part of parts) {
    const split = splitTerms(part);
    for (const raw of split) {
      const normalized = normalizeTerm(raw);
      if (normalized.length > 1 && !isBlacklisted(normalized)) {
        terms.push(normalized);
      }
    }
  }
  return terms;
}

function extractTermsFromName(name: string): string[] {
  const terms: string[] = [];
  const split = splitTerms(name);
  for (const raw of split) {
    const normalized = normalizeTerm(raw);
    if (normalized.length > 1 && !isBlacklisted(normalized)) {
      terms.push(normalized);
    }
  }
  return terms;
}

function addTerms(
  terms: string[],
  source: string,
  weight: number,
  file: string,
  occurrences: Map<string, TermInfo>,
): void {
  for (const term of terms) {
    if (!occurrences.has(term)) {
      occurrences.set(term, {
        term,
        source,
        weight,
        files: new Set(),
        totalScore: 0,
      });
    }
    const info = occurrences.get(term)!;
    info.files.add(file);
    info.totalScore += weight;
  }
}

function filterTerms(
  occurrences: Map<string, TermInfo>,
  allFiles: string[],
  minOccurrences: number,
  maxCoverage: number,
): Map<string, TermInfo> {
  const totalFileCount = allFiles.length || 1;
  const filtered = new Map<string, TermInfo>();
  for (const [term, info] of occurrences) {
    if (info.files.size < minOccurrences) continue;
    const coverage = info.files.size / totalFileCount;
    if (coverage > maxCoverage) continue;
    if (isNoiseTerm(term)) continue;
    filtered.set(term, info);
  }
  return filtered;
}

function buildCooccurrenceMatrix(
  terms: Map<string, TermInfo>,
  allFiles: string[],
): Map<string, Map<string, number>> {
  const fileTerms = new Map<string, Set<string>>();
  for (const [term, info] of terms) {
    for (const file of info.files) {
      if (!fileTerms.has(file)) {
        fileTerms.set(file, new Set());
      }
      fileTerms.get(file)!.add(term);
    }
  }

  const matrix = new Map<string, Map<string, number>>();
  for (const [, termSet] of fileTerms) {
    const termList = [...termSet];
    for (let i = 0; i < termList.length; i++) {
      for (let j = i + 1; j < termList.length; j++) {
        const a = termList[i];
        const b = termList[j];
        if (!matrix.has(a)) matrix.set(a, new Map());
        if (!matrix.has(b)) matrix.set(b, new Map());
        matrix.get(a)!.set(b, (matrix.get(a)!.get(b) || 0) + 1);
        matrix.get(b)!.set(a, (matrix.get(b)!.get(a) || 0) + 1);
      }
    }
  }
  return matrix;
}

function findConnectedComponents(
  matrix: Map<string, Map<string, number>>,
  threshold: number,
): string[][] {
  const visited = new Set<string>();
  const components: string[][] = [];

  for (const node of matrix.keys()) {
    if (visited.has(node)) continue;
    const component: string[] = [];
    const stack = [node];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);
      component.push(current);
      const neighbors = matrix.get(current);
      if (neighbors) {
        for (const [neighbor, count] of neighbors) {
          if (count >= threshold && !visited.has(neighbor)) {
            stack.push(neighbor);
          }
        }
      }
    }
    if (component.length > 0) {
      components.push(component);
    }
  }

  return components;
}

function splitOversizedClusters(
  clusters: string[][],
  matrix: Map<string, Map<string, number>>,
  maxSize: number,
): string[][] {
  const result: string[][] = [];
  for (const cluster of clusters) {
    if (cluster.length <= maxSize) {
      result.push(cluster);
      continue;
    }

    const clusterSet = new Set(cluster);
    const subMatrix = new Map<string, Map<string, number>>();
    for (const term of cluster) {
      const neighbors = matrix.get(term);
      if (!neighbors) continue;
      const subNeighbors = new Map<string, number>();
      for (const [neighbor, count] of neighbors) {
        if (clusterSet.has(neighbor)) {
          subNeighbors.set(neighbor, count);
        }
      }
      subMatrix.set(term, subNeighbors);
    }

    const sortedEdges: Array<{ a: string; b: string; count: number }> = [];
    for (const term of cluster) {
      const neighbors = subMatrix.get(term);
      if (!neighbors) continue;
      for (const [neighbor, count] of neighbors) {
        if (term < neighbor) {
          sortedEdges.push({ a: term, b: neighbor, count });
        }
      }
    }
    sortedEdges.sort((a, b) => b.count - a.count);
    const medianIdx = Math.floor(sortedEdges.length / 2);
    const medianCount = sortedEdges.length > 0 ? sortedEdges[medianIdx].count : 1;
    const higherThreshold = medianCount + 1;

    const subClusters = findConnectedComponents(subMatrix, Math.max(higherThreshold, 2));
    for (const sub of subClusters) {
      if (sub.length > 0) {
        result.push(sub);
      }
    }
  }
  return result;
}

function nameCluster(cluster: string[], termScores: Map<string, TermInfo>): string {
  let bestTerm = cluster[0];
  let bestScore = 0;
  for (const term of cluster) {
    const info = termScores.get(term);
    const score = info ? info.totalScore : 0;
    if (score > bestScore) {
      bestScore = score;
      bestTerm = term;
    }
  }
  return EXPANSIONS[bestTerm] || bestTerm;
}

function assignFilesToTopics(
  allFiles: string[],
  topics: Topic[],
): void {
  for (const file of allFiles) {
    const fileTerms = extractTermsFromPath(file);
    const termSet = new Set(fileTerms);
    for (const topic of topics) {
      const matchCount = topic.keywords.filter((k) => termSet.has(k)).length;
      const minMatches = topic.keywords.length <= 5 ? 1 : topic.keywords.length <= 10 ? 2 : 3;
      if (matchCount >= minMatches) {
        topic.files.push(file);
      }
    }
  }
}

function assignRoutesToTopics(
  routes: Route[],
  topics: Topic[],
): void {
  for (const route of routes) {
    const routeTerms = [
      ...extractTermsFromPath(route.path),
      ...extractTermsFromName(route.name),
    ];
    const termSet = new Set(routeTerms);
    for (const topic of topics) {
      const matchCount = topic.keywords.filter((k) => termSet.has(k)).length;
      const minMatches = topic.keywords.length <= 5 ? 1 : topic.keywords.length <= 10 ? 2 : 3;
      if (matchCount >= minMatches) {
        topic.routes.push(route);
      }
    }
  }
}

function assignCommandsToTopics(
  commands: Command[],
  topics: Topic[],
): void {
  for (const command of commands) {
    const cmdTerms = extractTermsFromName(command.name);
    const termSet = new Set(cmdTerms);
    for (const topic of topics) {
      const matchCount = topic.keywords.filter((k) => termSet.has(k)).length;
      const minMatches = topic.keywords.length <= 5 ? 1 : topic.keywords.length <= 10 ? 2 : 3;
      if (matchCount >= minMatches) {
        topic.commands.push(command);
      }
    }
  }
}

function computeCooccurrenceThreshold(totalFiles: number): number {
  return Math.max(3, Math.ceil(Math.sqrt(totalFiles) * 0.25));
}

export function discoverTopics(data: BrainData, allFiles: string[]): Topic[] {
  const occurrences = new Map<string, TermInfo>();

  for (const route of data.routes) {
    const pathTerms = extractTermsFromPath(route.path);
    const nameTerms = extractTermsFromName(route.name);
    const controllerTerms = route.controller
      ? extractTermsFromName(route.controller)
      : [];

    const file = route.file || route.path;
    addTerms(pathTerms, 'route-path', 2.5, file, occurrences);
    addTerms(nameTerms, 'route-name', 2.0, file, occurrences);
    addTerms(controllerTerms, 'controller', 1.5, file, occurrences);
  }

  for (const command of data.commands) {
    const nameTerms = extractTermsFromName(command.name);
    addTerms(nameTerms, 'command', 2.0, command.name, occurrences);
  }

  for (const mod of data.modules) {
    const nameTerms = extractTermsFromName(mod.name);
    const pathTerms = extractTermsFromPath(mod.path);
    addTerms(nameTerms, 'module', 3.0, mod.path, occurrences);
    addTerms(pathTerms, 'module-path', 3.0, mod.path, occurrences);
  }

  for (const keyFile of data.keyFiles) {
    const fileTerms = extractTermsFromPath(keyFile.path);
    addTerms(fileTerms, 'keyfile', 1.0, keyFile.path, occurrences);
  }

  for (const file of allFiles) {
    const fileTerms = extractTermsFromPath(file);
    addTerms(fileTerms, 'file', 1.0, file, occurrences);
  }

  const minOccurrences = Math.max(3, Math.ceil(allFiles.length * 0.005));
  const significantTerms = filterTerms(occurrences, allFiles, minOccurrences, MAX_KEYWORD_COVERAGE);

  if (significantTerms.size === 0) {
    return [{
      name: 'general',
      keywords: [],
      files: [...allFiles],
      routes: [...data.routes],
      commands: [...data.commands],
      status: TopicStatus.New,
    }];
  }

  const cooccurrence = buildCooccurrenceMatrix(significantTerms, allFiles);
  const baseThreshold = computeCooccurrenceThreshold(allFiles.length);

  let clusters = findConnectedComponents(cooccurrence, baseThreshold);
  clusters = splitOversizedClusters(clusters, cooccurrence, MAX_CLUSTER_SIZE);

  const standaloneTerms: string[] = [];
  const significantKeys = new Set(significantTerms.keys());
  const clusteredTerms = new Set(clusters.flat());
  for (const term of significantKeys) {
    if (!clusteredTerms.has(term)) {
      standaloneTerms.push(term);
    }
  }
  for (const term of standaloneTerms) {
    clusters.push([term]);
  }

  const topics: Topic[] = clusters
    .map((cluster) => ({
      name: nameCluster(cluster, significantTerms),
      keywords: [...cluster],
      files: [] as string[],
      routes: [] as Route[],
      commands: [] as Command[],
      status: TopicStatus.New,
    }))
    .filter((topic) => topic.keywords.length > 0);

  assignFilesToTopics(allFiles, topics);
  assignRoutesToTopics(data.routes, topics);
  assignCommandsToTopics(data.commands, topics);

  const totalFiles = allFiles.length || 1;
  let finalTopics = topics.filter((t) => t.files.length > 0);

  finalTopics = finalTopics.filter((t) => {
    const coverage = t.files.length / totalFiles;
    return coverage <= MAX_TOPIC_COVERAGE;
  });

  if (finalTopics.length === 0 && allFiles.length > 0) {
    return [{
      name: 'general',
      keywords: [],
      files: [...allFiles],
      routes: [...data.routes],
      commands: [...data.commands],
      status: TopicStatus.New,
    }];
  }

  return finalTopics;
}

export function mergeOverlappingTopics(topics: Topic[], threshold: number = 0.6): Topic[] {
  if (topics.length <= 1) return topics;

  const merged: boolean[] = new Array(topics.length).fill(false);
  const result: Topic[] = [];

  for (let i = 0; i < topics.length; i++) {
    if (merged[i]) continue;

    const current = { ...topics[i] };
    current.files = [...topics[i].files];
    current.routes = [...topics[i].routes];
    current.commands = [...topics[i].commands];
    current.keywords = [...topics[i].keywords];

    for (let j = i + 1; j < topics.length; j++) {
      if (merged[j]) continue;

      const filesA = new Set(current.files);
      const filesB = new Set(topics[j].files);
      const intersection = [...filesA].filter((f) => filesB.has(f)).length;
      const union = new Set([...current.files, ...topics[j].files]).size;

      if (union > 0 && intersection / union >= threshold) {
        const newKeywords = new Set([...current.keywords, ...topics[j].keywords]);
        current.keywords = [...newKeywords];
        current.files = [...new Set([...current.files, ...topics[j].files])];
        current.routes = [...new Map([...current.routes, ...topics[j].routes].map((r) => [r.name, r])).values()];
        current.commands = [...new Map([...current.commands, ...topics[j].commands].map((c) => [c.name, c])).values()];
        merged[j] = true;
      }
    }

    result.push(current);
  }

  return result;
}
