import type { StudyNode } from "../types/study";
import { findMaterialNodeByLinkTitle } from "../utils/internalLinks";
import { saveInternalLinkReturnTarget } from "../utils/internalNavigationHistory";

export type RichTextCommandType =
  | "paragraph"
  | "bold"
  | "italic"
  | "underline"
  | "strikeThrough"
  | "unorderedList"
  | "orderedList"
  | "listStyle"
  | "quote"
  | "clearFormat"
  | "link"
  | "unlink"
  | "internalLink"
  | "textColor"
  | "highlightColor"
  | "clearColor"
  | "alignLeft"
  | "alignCenter"
  | "alignRight"
  | "fontSize"
  | "clearFontSize";

export interface RichTextCommand {
  id: number;
  type: RichTextCommandType;
  value?: string;
  targetEditorId?: string | null;
}

export interface RichTextActiveMarks {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikeThrough: boolean;
  unorderedList: boolean;
  orderedList: boolean;
  quote: boolean;
  link: boolean;
  linkHref: string;
  listStyle: string;
  textColor?: string;
  backgroundColor?: string;
  textAlign?: string;
  fontSize?: string;
}

export const emptyRichTextMarks: RichTextActiveMarks = {
  bold: false,
  italic: false,
  underline: false,
  strikeThrough: false,
  unorderedList: false,
  orderedList: false,
  quote: false,
  link: false,
  linkHref: "",
  listStyle: "disc",
  textColor: "",
  backgroundColor: "",
  textAlign: "left",
  fontSize: "",
};

export function isProbablyHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function plainTextToHtml(value: string): string {
  if (!value.trim()) {
    return "";
  }

  return value
    .split(/\n{2,}/)
    .map((paragraph) => {
      const lines = paragraph
        .split("\n")
        .map((line) => escapeHtml(line))
        .join("<br>");

      return `<p>${lines}</p>`;
    })
    .join("");
}

export function toEditableHtml(value: string): string {
  if (!value) {
    return "";
  }

  return isProbablyHtml(value) ? value : plainTextToHtml(value);
}

export function normalizeUrl(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("tel:") ||
    trimmed.startsWith("#")
  ) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

export function sanitizeRichHtml(html: string): string {
  const template = document.createElement("template");
  template.innerHTML = html;

  const blockedTags = new Set([
    "SCRIPT",
    "STYLE",
    "IFRAME",
    "OBJECT",
    "EMBED",
    "META",
    "LINK",
  ]);

  function cleanElement(element: Element) {
    if (blockedTags.has(element.tagName)) {
      element.remove();
      return;
    }

    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.toLowerCase();

      if (name.startsWith("on")) {
        element.removeAttribute(attribute.name);
        return;
      }

      if ((name === "href" || name === "src") && value.startsWith("javascript:")) {
        element.removeAttribute(attribute.name);
        return;
      }

      if (element.tagName === "A") {
        const href = element.getAttribute("href") ?? "";

        if (href && !href.toLowerCase().startsWith("javascript:")) {
          element.setAttribute("target", "_blank");
          element.setAttribute("rel", "noreferrer");
        }
      }

      if (name === "class") {
        element.removeAttribute(attribute.name);
        return;
      }

      if (name === "style") {
        const allowedStyle = attribute.value
          .split(";")
          .map((part) => part.trim())
          .filter((part) => {
            const lower = part.toLowerCase();

            return (
              lower.startsWith("font-weight") ||
              lower.startsWith("font-style") ||
              lower.startsWith("font-size") ||
              lower.startsWith("text-decoration") ||
              lower.startsWith("list-style-type") ||
              lower.startsWith("text-align") ||
              lower.startsWith("color") ||
              lower.startsWith("background-color")
            );
          })
          .join("; ");

        if (allowedStyle) {
          element.setAttribute("style", allowedStyle);
        } else {
          element.removeAttribute(attribute.name);
        }
      }
    });

    Array.from(element.children).forEach(cleanElement);
  }

  Array.from(template.content.children).forEach(cleanElement);

  return template.innerHTML;
}

export function replaceTextNodesWithInternalLinks(
  root: HTMLElement,
  nodes: StudyNode[],
  onOpenNode: (nodeId: string) => void
) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];

  while (walker.nextNode()) {
    textNodes.push(walker.currentNode as Text);
  }

  textNodes.forEach((textNode) => {
    const parent = textNode.parentElement;

    if (parent?.closest("a, button")) {
      return;
    }

    const value = textNode.nodeValue ?? "";
    const regex = /\[\[([^\]]+)\]\]/g;

    if (!regex.test(value)) {
      return;
    }

    regex.lastIndex = 0;

    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(value)) !== null) {
      const before = value.slice(lastIndex, match.index);

      if (before) {
        fragment.appendChild(document.createTextNode(before));
      }

      const label = match[1].trim();
      const target = findMaterialNodeByLinkTitle(nodes, label);

      if (target) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = `[[${label}]]`;
        button.dataset.internalLinkNodeId = target.id;
        button.className = "mx-1 border border-black bg-black px-1 text-white";
        button.addEventListener("click", () => {
          saveInternalLinkReturnTarget(target.id);
          onOpenNode(target.id);
        });
        fragment.appendChild(button);
      } else {
        const span = document.createElement("span");
        span.textContent = `[[${label}]]`;
        span.className = "mx-1 border border-black bg-white px-1 text-black line-through";
        fragment.appendChild(span);
      }

      lastIndex = regex.lastIndex;
    }

    const after = value.slice(lastIndex);

    if (after) {
      fragment.appendChild(document.createTextNode(after));
    }

    textNode.replaceWith(fragment);
  });
}
