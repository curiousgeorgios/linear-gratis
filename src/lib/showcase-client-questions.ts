export function clientQuestions(description: string | null | undefined): string[] {
  if (!description) return [];
  const lines = description.split(/\r?\n/);
  const headingIndex = lines.findIndex((line) => /^#{1,3}\s+Questions for client\s*$/i.test(line));
  if (headingIndex >= 0) {
    const sectionLines = lines.slice(headingIndex + 1);
    const nextHeading = sectionLines.findIndex((line) => /^#{1,3}\s+/.test(line));
    const section = (nextHeading >= 0 ? sectionLines.slice(0, nextHeading) : sectionLines).join('\n');
    return [...section.matchAll(/^\s*(?:[-*+]\s+|\d+[.)]\s+)(.+)$/gm)]
      .map((match) => match[1].trim())
      .filter(Boolean).slice(0, 10);
  }
  const remaining = description.match(/\*\*Remaining question:\*\*\s*([^\n]+(?:\n(?!\n|\*\*|#)[^\n]+)*)/i)?.[1]?.trim();
  return remaining ? [remaining] : [];
}
