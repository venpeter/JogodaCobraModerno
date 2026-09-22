import SnakeGame from "./game/SnakeGame";

const SPECKS = [
  { left: "8%", top: "18%", size: 4, delay: "0s", color: "rgba(52,196,108,0.5)" },
  { left: "16%", top: "72%", size: 3, delay: "1.2s", color: "rgba(159,232,182,0.4)" },
  { left: "28%", top: "34%", size: 3, delay: "2.4s", color: "rgba(255,209,102,0.35)" },
  { left: "74%", top: "22%", size: 4, delay: "0.8s", color: "rgba(52,196,108,0.45)" },
  { left: "86%", top: "58%", size: 3, delay: "3.1s", color: "rgba(159,232,182,0.4)" },
  { left: "64%", top: "82%", size: 4, delay: "1.8s", color: "rgba(52,196,108,0.4)" },
  { left: "44%", top: "10%", size: 3, delay: "4s", color: "rgba(255,107,120,0.35)" },
  { left: "92%", top: "84%", size: 3, delay: "2.7s", color: "rgba(255,209,102,0.3)" },
  { left: "5%", top: "48%", size: 3, delay: "3.6s", color: "rgba(98,217,141,0.4)" },
  { left: "55%", top: "92%", size: 3, delay: "0.4s", color: "rgba(159,232,182,0.3)" },
];

export default function App() {
  return (
    <div className="relative flex min-h-full flex-col overflow-x-hidden">
      {/* fundo ambiente em camadas */}
      <div className="pointer-events-none fixed inset-0 bg-pine-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,69,47,0.55),transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(159,232,182,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(159,232,182,0.035)_1px,transparent_1px)] bg-[size:34px_34px]" />
        <div className="anim-drift1 absolute -left-40 -top-40 h-[44rem] w-[44rem] rounded-full bg-[radial-gradient(circle,rgba(52,196,108,0.14),transparent_62%)]" />
        <div className="anim-drift2 absolute -bottom-48 -right-40 h-[46rem] w-[46rem] rounded-full bg-[radial-gradient(circle,rgba(255,209,102,0.07),transparent_60%)]" />
        <div className="anim-drift2 absolute -right-24 top-1/4 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(255,77,94,0.06),transparent_65%)]" />
        {SPECKS.map((s, i) => (
          <span
            key={i}
            className="speck absolute rounded-[1px]"
            style={{
              left: s.left,
              top: s.top,
              width: s.size,
              height: s.size,
              background: s.color,
              animationDelay: s.delay,
              boxShadow: `0 0 8px ${s.color}`,
            }}
          />
        ))}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_52%,rgba(2,12,8,0.65))]" />
      </div>

      <main className="relative z-10 flex flex-1 flex-col items-center">
        <SnakeGame />
      </main>

      <footer className="relative z-10 pb-4 text-center text-[10.5px] font-medium tracking-wide text-mint-300/30">
        SNAKE · o clássico de 1997 reinventado — React + Canvas, sem uma única imagem
      </footer>
    </div>
  );
}
