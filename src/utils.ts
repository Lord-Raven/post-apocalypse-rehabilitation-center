/**
 * Converts a numeric score (1-10) to a letter grade
 * @param score - The score to convert (will be clamped between 1 and 10)
 * @returns A letter grade string (F, D, C, C+, B-, B, B+, A-, A, A+)
 */
export function scoreToGrade(score: number): string {
    const scoreClamped = Math.max(1, Math.min(10, score));
    const scoreArray = ['F', 'D', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A', 'A+'];
    return scoreArray[scoreClamped - 1];
}
