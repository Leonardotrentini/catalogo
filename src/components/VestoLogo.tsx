export function VestoLogo({ size = 40 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/vesto-logo.jpg"
      alt="Vesto Catálogo"
      width={size}
      height={size}
      className="shrink-0 rounded-[10px] object-cover"
      style={{
        width: size,
        height: size,
        boxShadow: "0 0 0 1px rgba(201,168,76,0.25)",
      }}
    />
  );
}
