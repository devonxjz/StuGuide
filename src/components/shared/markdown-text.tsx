import { Fragment } from "react";
import { parseMarkdown, type Block, type Inline, type Line } from "@/lib/markdown";
import { cn } from "@/lib/utils";

/**
 * Hiển thị câu trả lời markdown của AI (đậm, danh sách, xuống dòng…) mà không lộ ký hiệu ** hay #.
 * Thứ tự trong file đi từ phần nhỏ tới phần lớn: phần tử inline → dòng → khối → cả câu trả lời.
 */

function renderInline(node: Inline, key: number) {
  switch (node.type) {
    case "text":
      return <Fragment key={key}>{node.text}</Fragment>;
    case "strong":
      return (
        <strong key={key} className="font-semibold text-slate-900">
          {node.children.map(renderInline)}
        </strong>
      );
    case "em":
      return <em key={key}>{node.children.map(renderInline)}</em>;
    case "code":
      return (
        <code key={key} className="rounded bg-slate-200/70 px-1 py-0.5 text-[0.85em]">
          {node.text}
        </code>
      );
  }
}

const renderLine = (line: Line) => line.map(renderInline);

const renderLines = (lines: Line[]) =>
  lines.map((line, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {renderLine(line)}
    </Fragment>
  ));

function renderBlock(block: Block, key: number) {
  switch (block.type) {
    case "heading":
      return (
        <p key={key} className="font-semibold text-slate-900">
          {renderLine(block.line)}
        </p>
      );
    case "rule":
      return <hr key={key} className="border-slate-200" />;
    case "list": {
      const List = block.ordered ? "ol" : "ul";
      return (
        <List
          key={key}
          start={block.ordered && block.start !== 1 ? block.start : undefined}
          className={cn("space-y-2 pl-5 marker:text-slate-400", block.ordered ? "list-decimal" : "list-disc")}
        >
          {block.items.map((lines, i) => (
            <li key={i} className="pl-1">
              {renderLines(lines)}
            </li>
          ))}
        </List>
      );
    }
    case "paragraph":
      return <p key={key}>{renderLines(block.lines)}</p>;
  }
}

export function MarkdownText({ text, className }: { text: string; className?: string }) {
  return <div className={cn("space-y-3", className)}>{parseMarkdown(text).map(renderBlock)}</div>;
}
