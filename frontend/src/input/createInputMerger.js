const INPUT_TIMEOUT_MS = 450;

export function createInputMerger() {
  const activity = new Map();

  return {
    markActive(source) {
      activity.set(source, performance.now());
    },
    getActiveSource() {
      const now = performance.now();
      let activeSource = 'mouse';
      let activeTimestamp = 0;

      activity.forEach((timestamp, source) => {
        if (now - timestamp > INPUT_TIMEOUT_MS) {
          return;
        }

        if (timestamp >= activeTimestamp) {
          activeTimestamp = timestamp;
          activeSource = source;
        }
      });

      return activeSource;
    },
  };
}
