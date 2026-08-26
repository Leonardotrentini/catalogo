export function VestoLogo({ size = 28 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center font-bold text-white shrink-0"
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        fontSize: size * 0.5,
        background: "linear-gradient(135deg, #0D4726 0%, #C9A84C 100%)",
      }}
      aria-hidden
    >
      V
    </div>
  );
}
