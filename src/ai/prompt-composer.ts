import { formatFeedback, type Finding } from "./quality/rubric";

/** Ghép các khối prompt theo thứ tự (danh tính → luật → nhiệm vụ → bối cảnh → tri thức → tiêu chí → yêu cầu sửa). */
export type PromptSection = readonly [title: string | null, body: string | false | null | undefined];

export interface Revision<T> {
  previous: T;
  findings: Finding[];
}

export function composePrompt(sections: PromptSection[]): string {
  return sections
    .filter(([, body]) => Boolean(body && String(body).trim()))
    .map(([title, body]) => (title ? `## ${title}\n${String(body).trim()}` : String(body).trim()))
    .join("\n\n");
}

/** Khối "YÊU CẦU SỬA" cho vòng tự sửa theo tiêu chí (rỗng ở lần sinh đầu). */
export const revisionSection = <T,>(revision?: Revision<T>): PromptSection => ["YÊU CẦU SỬA", revision ? formatFeedback(revision.previous, revision.findings) : null];
