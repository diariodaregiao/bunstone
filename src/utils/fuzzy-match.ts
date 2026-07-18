/**
 * Lightweight fuzzy-matching utilities used by the `bunstone run` CLI command
 * to produce "did you mean?" suggestions when an export name is not found.
 */

/**
 * Levenshtein edit distance between two strings (case-insensitive).
 */
export function editDistance(a: string, b: string): number {
	const s1 = a.toLowerCase();
	const s2 = b.toLowerCase();
	const m = s1.length;
	const n = s2.length;

	// Two-row rolling DP – avoids 2D-array index safety issues.
	let prev: number[] = Array.from({ length: n + 1 }, (_, j) => j);
	let curr: number[] = new Array<number>(n + 1).fill(0);

	for (let i = 1; i <= m; i++) {
		curr[0] = i;
		for (let j = 1; j <= n; j++) {
			const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
			curr[j] =
				cost === 0
					? (prev[j - 1] as number)
					: 1 +
						Math.min(
							prev[j] as number,
							curr[j - 1] as number,
							prev[j - 1] as number,
						);
		}
		[prev, curr] = [curr, prev];
	}

	return prev[n] as number;
}

/**
 * Returns up to `limit` closest matches for `name` from `candidates`,
 * ordered by edit distance (closest first).
 *
 * Only returns candidates whose distance is ≤ `maxDistance`.
 */
export function closestMatches(
	name: string,
	candidates: Iterable<string>,
	limit = 5,
	maxDistance = 4,
): string[] {
	const results: { name: string; dist: number }[] = [];

	for (const candidate of candidates) {
		const dist = editDistance(name, candidate);
		if (dist <= maxDistance) {
			results.push({ name: candidate, dist });
		}
	}

	results.sort((a, b) => a.dist - b.dist);
	return results.slice(0, limit).map((r) => r.name);
}
