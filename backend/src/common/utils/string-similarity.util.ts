const COMBINING_DIACRITICS = /[̀-ͯ]/g;

/** Normaliza para comparação: minúsculas, sem acentos, espaços colapsados. */
export function normalizeForComparison(value: string): string {
  return value
    .normalize('NFD')
    .replace(COMBINING_DIACRITICS, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function levenshteinDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));

  for (let i = 0; i < rows; i++) matrix[i][0] = i;
  for (let j = 0; j < cols; j++) matrix[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }

  return matrix[rows - 1][cols - 1];
}

/** Semelhança entre 0 (nada em comum) e 1 (idêntico), baseada na distância de Levenshtein. */
export function similarity(a: string, b: string): number {
  const normA = normalizeForComparison(a);
  const normB = normalizeForComparison(b);
  const maxLength = Math.max(normA.length, normB.length);
  if (maxLength === 0) return 1;
  return 1 - levenshteinDistance(normA, normB) / maxLength;
}
