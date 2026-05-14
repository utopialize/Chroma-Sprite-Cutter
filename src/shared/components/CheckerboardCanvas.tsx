import type { CSSProperties } from 'react';
import { colors } from '../../theme';

interface CheckerboardCanvasProps {
  size?: number;
  tileSize?: number;
  style?: CSSProperties;
}

export function CheckerboardCanvas({
  size = 18,
  tileSize = 6,
  style,
}: CheckerboardCanvasProps) {
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        backgroundColor: colors.checkerLight,
        backgroundImage: `
          linear-gradient(45deg, ${colors.checkerDark} 25%, transparent 25%),
          linear-gradient(-45deg, ${colors.checkerDark} 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, ${colors.checkerDark} 75%),
          linear-gradient(-45deg, transparent 75%, ${colors.checkerDark} 75%)
        `,
        backgroundSize: `${tileSize * 2}px ${tileSize * 2}px`,
        backgroundPosition: `0 0, 0 ${tileSize}px, ${tileSize}px -${tileSize}px, -${tileSize}px 0`,
        ...style,
      }}
    />
  );
}
