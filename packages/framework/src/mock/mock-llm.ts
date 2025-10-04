export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
}

export interface ThemeGenerationResult extends TokenUsage {
  themes: string[];
}

export interface ThemeEvaluationResult extends TokenUsage {
  theme: string;
  score: number;
  rationale: string;
}

export interface SynthesisResult extends TokenUsage {
  candidates: string[];
}

const ADJECTIVES = [
  'Velvet',
  'Solar',
  'Aurora',
  'Harbor',
  'Cinder',
  'Verdant',
  'Nimbus',
  'Juniper',
  'Golden',
  'Rustic'
];

const NOUNS = [
  'Blend',
  'Roastery',
  'Collective',
  'Parlor',
  'Lab',
  'Atelier',
  'Vault',
  'Folio',
  'House',
  'Haven'
];

function computeTokenEstimate(text: string): number {
  if (!text) return 1;
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words * 1.2));
}

function seededIndex(seed: string, index: number, modulo: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i) + index) >>> 0;
  }
  return hash % modulo;
}

export function generateThemes(
  prompt: string,
  branches: number
): ThemeGenerationResult {
  const themes: string[] = [];
  for (let i = 0; i < branches; i += 1) {
    const adjective = ADJECTIVES[seededIndex(prompt, i, ADJECTIVES.length)];
    const noun = NOUNS[seededIndex(prompt, i + 7, NOUNS.length)];
    themes.push(`${adjective} ${noun}`);
  }

  const promptTokens = computeTokenEstimate(prompt);
  const completionTokens = themes.reduce(
    (acc, theme) => acc + computeTokenEstimate(theme),
    0
  );

  return {
    themes,
    promptTokens,
    completionTokens,
  };
}

export function evaluateTheme(theme: string): ThemeEvaluationResult {
  const baseScore = 0.6 + (seededIndex(theme, theme.length, 100) / 100) * 0.4;
  const score = Number(baseScore.toFixed(2));
  const rationale = `Theme "${theme}" blends sensory imagery with a welcoming mood suitable for specialty coffee.`;
  const promptTokens = computeTokenEstimate(`Evaluate the theme ${theme}`);
  const completionTokens = computeTokenEstimate(rationale);

  return {
    theme,
    score,
    rationale,
    promptTokens,
    completionTokens,
  };
}

export function synthesizeNames(
  prompt: string,
  themes: string[],
  finalists: number
): SynthesisResult {
  const candidates: string[] = [];
  for (let i = 0; i < finalists; i += 1) {
    const theme = themes[i % themes.length];
    const suffix = ['Cafe', 'Roasters', 'Bar', 'Works'][i % 4];
    candidates.push(`${theme} ${suffix}`);
  }
  const promptTokens = computeTokenEstimate(`${prompt}${themes.join(' ')}`);
  const completionTokens = candidates.reduce(
    (acc, name) => acc + computeTokenEstimate(name),
    0
  );

  return {
    candidates,
    promptTokens,
    completionTokens,
  };
}
