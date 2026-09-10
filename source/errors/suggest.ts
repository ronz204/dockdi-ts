import type { Binding } from "@core/binding";
import type { Token } from "@core/token";

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previousRow: number[] = Array.from(
    { length: b.length + 1 },
    (_, column) => column,
  );

  for (let row = 1; row <= a.length; row++) {
    const currentRow: number[] = [row];

    for (let column = 1; column <= b.length; column++) {
      const substitutionCost = a[row - 1] === b[column - 1] ? 0 : 1;
      const insertion = (currentRow[column - 1] ?? 0) + 1;

      const deletion = (previousRow[column] ?? 0) + 1;
      const substitution = (previousRow[column - 1] ?? 0) + substitutionCost;
      currentRow.push(Math.min(insertion, deletion, substitution));
    }

    previousRow = currentRow;
  }

  return previousRow[b.length] ?? 0;
}

interface SuggestionCandidate {
  readonly description: string;
  readonly distance: number;
}

function suggestionThreshold(description: string): number {
  return Math.max(3, Math.floor(description.length / 2));
}

function registeredDescriptions(
  registry: Map<Token<unknown>, Binding<unknown>>,
  excluding: string,
): readonly string[] {
  const descriptions: string[] = [];

  for (const registeredToken of registry.keys()) {
    const description = registeredToken.description;
    if (description && description !== excluding) {
      descriptions.push(description);
    }
  }

  return descriptions;
}

export function findTokenSuggestions(
  missingToken: Token<unknown>,
  registry: Map<Token<unknown>, Binding<unknown>>,
): readonly string[] | undefined {
  const missingDescription = missingToken.description;
  if (!missingDescription) return undefined;

  const threshold = suggestionThreshold(missingDescription);

  const candidates: SuggestionCandidate[] = registeredDescriptions(
    registry,
    missingDescription,
  )
    .map((description) => ({
      description,
      distance: levenshteinDistance(
        missingDescription.toLowerCase(),
        description.toLowerCase(),
      ),
    }))
    .filter((candidate) => candidate.distance <= threshold)
    .sort((a, b) => a.distance - b.distance);

  return candidates.length > 0
    ? candidates.map((candidate) => candidate.description)
    : undefined;
}
