"use client";

import { useMemo } from "react";
import { ComboBox } from "./ComboBox";

export function CategorySelect({
  value,
  onChange,
  categories,
  onCreate,
}: {
  value: string;
  onChange: (value: string) => void;
  categories: string[];
  onCreate?: (value: string) => void;
}) {
  const options = useMemo(() => {
    const all = [...new Set([...categories, ...(value ? [value] : [])])];
    return all.sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [categories, value]);

  return (
    <ComboBox
      mode="single"
      value={value}
      onChange={(next) => {
        if (next && !categories.some((item) => item.toLowerCase() === next.toLowerCase())) {
          onCreate?.(next);
        }
        onChange(next);
      }}
      options={options}
      placeholder="Escolha a pasta da peça"
      createLabel={(q) => `Criar categoria "${q}"`}
    />
  );
}
