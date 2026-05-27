import confetti from "canvas-confetti";

export function celebrateSharpe(sharpe: number) {
  if (!isFinite(sharpe) || sharpe < 2) return;
  const colors = ["#22d3ee", "#a78bfa", "#34d399", "#f59e0b"];
  confetti({
    particleCount: 120,
    spread: 80,
    origin: { y: 0.4 },
    colors,
    ticks: 220,
  });
  // Side bursts for big numbers
  if (sharpe >= 3) {
    setTimeout(() => confetti({ particleCount: 80, angle: 60, spread: 55, origin: { x: 0 }, colors }), 200);
    setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 55, origin: { x: 1 }, colors }), 400);
  }
}
