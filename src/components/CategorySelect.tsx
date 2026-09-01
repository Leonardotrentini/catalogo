"use client";

import { useMemo } from "react";
import { ComboBox } from "./ComboBox";

export function CategorySelect({
  value,
  onChange,
  categories,
}: {
  value: string;
  onChange: (value: string) => void;
  categories: string[];
}) {
  const options = useMemo(() => {
    const all = [...new Set([...categories, ...(value ? [value] : [])])];
    return all.sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [categories, value]);

  return (
    <ComboBox
      mode="single"
      value={value}
      onChange={onChange}
      options={options}
      placeholder="Selecione uma categoria"
      createLabel={(q) => `Criar categoria "${q}"`}
    />
  );
}
