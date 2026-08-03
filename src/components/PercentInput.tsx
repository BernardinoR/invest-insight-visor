import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

const toText = (val: number | null | undefined): string => {
  if (val === null || val === undefined || Number.isNaN(val)) return "";
  return String(val).replace(".", ",");
};

const parseText = (text: string): number | undefined => {
  const trimmed = text.trim().replace(",", ".");
  if (trimmed === "" || trimmed === "-" || trimmed === "." || trimmed === "-.") return undefined;
  const parsed = parseFloat(trimmed);
  return Number.isNaN(parsed) ? undefined : parsed;
};

interface PercentInputProps {
  /** Value in percent units (e.g. -1.25 for -1,25%) */
  value: number | null | undefined;
  /** Called with the parsed percent value, or undefined when the field is empty */
  onChange: (value: number | undefined) => void;
  id?: string;
  className?: string;
  placeholder?: string;
}

export const PercentInput = ({ value, onChange, id, className, placeholder }: PercentInputProps) => {
  const [text, setText] = useState(() => toText(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(toText(value));
  }, [value, focused]);

  return (
    <Input
      id={id}
      type="text"
      inputMode="decimal"
      value={text}
      className={className}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        setText(toText(parseText(text) ?? null));
      }}
      onChange={(e) => {
        // Allow only digits, a single leading minus and one decimal separator
        let raw = e.target.value.replace(/[^\d,.\-]/g, "");
        const negative = raw.startsWith("-");
        raw = raw.replace(/-/g, "");
        const parts = raw.replace(/\./g, ",").split(",");
        raw = parts.length > 1 ? `${parts[0]},${parts.slice(1).join("")}` : parts[0];
        const next = (negative ? "-" : "") + raw;
        setText(next);
        onChange(parseText(next));
      }}
    />
  );
};
