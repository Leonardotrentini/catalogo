"use client";

import { useMemo } from "react";
import { ComboBox } from "./ComboBox";

export function SizeSelect({
  value,
  onChange,
  sizes,
}: {
  value: string[];
  onChange: (sizes: string[]) => void;
  sizes: string[];
}) {
  const options = useMemo(() => {
    const all = [...new Set([...sizes, ...value])];
    return all.sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
  }, [sizes, value]);

  return (
    <ComboBox
      mode="multiple"
      value={value}
      onChange={onChange}
      options={options}
      placeholder="Selecione os tamanhos"
      createLabel={(q) => `Adicionar tamanho "${q}"`}
    />
  );
}
