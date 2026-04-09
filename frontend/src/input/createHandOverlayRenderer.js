const HAND_CONNECTIONS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [0, 17],
];

const GESTURE_COLORS = {
  none: '#6dd3ff',
  open_palm: '#72f0c7',
  point: '#ffd166',
  fist: '#ff7b72',
  pinch: '#ff9f5a',
  swipe: '#9e8cff',
  zoom: '#ff6bd6',
};

export function createHandOverlayRenderer({ canvasElement }) {
  const context = shouldCreateCanvasContext() ? canvasElement.getContext('2d') : null;
  let overlayAlpha = 0;

  resize();
  window.addEventListener('resize', resize);

  return {
    render(frame) {
      resize();
      const hands = frame?.hands ?? [];
      const targetAlpha = hands.length ? Math.max(0.12, Math.min(frame.confidence ?? 0.8, 1)) : 0;
      overlayAlpha = overlayAlpha * 0.78 + targetAlpha * 0.22;
      clearCanvas();

      if (!context || overlayAlpha < 0.02 || !hands.length) {
        return;
      }

      const color = GESTURE_COLORS[frame.gesture] ?? GESTURE_COLORS.none;
      hands.forEach((hand) => drawHand(hand, color, overlayAlpha));
      drawLabel(frame, color, overlayAlpha);
    },
    clear() {
      overlayAlpha = 0;
      clearCanvas();
    },
    destroy() {
      window.removeEventListener('resize', resize);
      clearCanvas();
    },
  };

  function resize() {
    const bounds = canvasElement.getBoundingClientRect();
    const width = Math.max(1, Math.floor(bounds.width || window.innerWidth));
    const height = Math.max(1, Math.floor(bounds.height || window.innerHeight));

    if (canvasElement.width !== width || canvasElement.height !== height) {
      canvasElement.width = width;
      canvasElement.height = height;
    }
  }

  function drawHand(hand, color, alpha) {
    const points = hand.landmarks.map((point) => projectPoint(point));

    context.save();
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = withAlpha(color, alpha * 0.82);
    context.lineWidth = 2.4;
    context.shadowBlur = 18;
    context.shadowColor = withAlpha(color, alpha * 0.9);

    HAND_CONNECTIONS.forEach(([startIndex, endIndex]) => {
      context.beginPath();
      context.moveTo(points[startIndex].x, points[startIndex].y);
      context.lineTo(points[endIndex].x, points[endIndex].y);
      context.stroke();
    });

    points.forEach((point, index) => {
      context.beginPath();
      context.fillStyle = withAlpha(index === 8 ? '#f4f8ff' : color, alpha);
      context.arc(point.x, point.y, index === 8 ? 5 : 3.3, 0, Math.PI * 2);
      context.fill();
    });

    context.restore();
  }

  function drawLabel(frame, color, alpha) {
    const wrist = frame.hands?.[0]?.landmarks?.[0];
    if (!wrist) {
      return;
    }

    const anchor = projectPoint(wrist);
    const label = `${formatLabel(frame.gesture)} ${frame.gesturePhase.toLowerCase()}`;
    context.save();
    context.font = '600 14px Bahnschrift, Trebuchet MS, sans-serif';
    const textWidth = context.measureText(label).width;
    const x = Math.min(canvasElement.width - textWidth - 24, anchor.x + 18);
    const y = Math.max(28, anchor.y - 18);

    context.fillStyle = withAlpha('#03111b', alpha * 0.92);
    roundRect(context, x - 10, y - 20, textWidth + 20, 30, 12);
    context.fill();

    context.strokeStyle = withAlpha(color, alpha * 0.65);
    context.lineWidth = 1;
    roundRect(context, x - 10, y - 20, textWidth + 20, 30, 12);
    context.stroke();

    context.fillStyle = withAlpha('#f4f8ff', alpha);
    context.fillText(label, x, y);
    context.restore();
  }

  function clearCanvas() {
    context?.clearRect(0, 0, canvasElement.width, canvasElement.height);
  }

  function projectPoint(point) {
    return {
      x: point.x * canvasElement.width,
      y: point.y * canvasElement.height,
    };
  }
}

function shouldCreateCanvasContext() {
  return typeof navigator === 'undefined' || !/jsdom/i.test(navigator.userAgent);
}

function withAlpha(hexColor, alpha) {
  const safeAlpha = Math.max(0, Math.min(alpha, 1));
  const red = parseInt(hexColor.slice(1, 3), 16);
  const green = parseInt(hexColor.slice(3, 5), 16);
  const blue = parseInt(hexColor.slice(5, 7), 16);
  return `rgba(${red}, ${green}, ${blue}, ${safeAlpha})`;
}

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function formatLabel(gesture) {
  return gesture
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}
