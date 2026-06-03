import type { CSSProperties } from "react";
import type { HeadingStyle, StudyBlock } from "../types/study";

export function getHeadingPreset(style: HeadingStyle | undefined): CSSProperties {
  if (style === "h3") {
    return {
      fontSize: "22px",
      lineHeight: "1.25",
      fontWeight: 700,
      letterSpacing: "0.01em",
    };
  }

  if (style === "h2") {
    return {
      fontSize: "28px",
      lineHeight: "1.2",
      fontWeight: 800,
      borderBottom: "1px solid #000000",
      paddingBottom: 6,
    };
  }

  return {
    fontSize: "36px",
    lineHeight: "1.15",
    fontWeight: 900,
    borderBottom: "2px solid #000000",
    paddingBottom: 8,
  };
}

export function getVisualStyle(block: StudyBlock): CSSProperties {
  const settings = block.settings ?? {};
  const headingPreset = block.type === "heading" ? getHeadingPreset(settings.headingStyle) : {};

  return {
    ...headingPreset,
    fontSize: settings.fontSize ? `${settings.fontSize}px` : headingPreset.fontSize,
    color: settings.textColor || undefined,
    backgroundColor: settings.backgroundColor || undefined,
    padding: typeof settings.padding === "number" ? settings.padding : headingPreset.padding,
    textAlign: settings.textAlign || undefined,
  };
}

export function getInputStyle(block: StudyBlock): CSSProperties {
  const style = getVisualStyle(block);

  return {
    ...style,
    backgroundColor: "transparent",
    padding: undefined,
    borderBottom: undefined,
  };
}
