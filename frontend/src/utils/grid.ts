// Helper functions to generate grid lines
export function generateGridLines(
  width: number,
  height: number,
  gridSize: number
): { x: number[]; y: number[] } {
  const x = [];
  const y = [];

  for (let i = 0; i <= width; i += gridSize) {
    x.push(i);
  }

  for (let i = 0; i <= height; i += gridSize) {
    y.push(i);
  }

  return { x, y };
}
