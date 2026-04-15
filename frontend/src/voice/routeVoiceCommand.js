const UI_COMMANDS = [
  { id: 'dive_in', pattern: /\b(dive in|dive into|enter layer|open layer|drill in|drill down)\b/ },
  { id: 'surface', pattern: /\b(surface up|surface|pop layer|go up a layer|exit layer)\b/ },
  { id: 'surface_all', pattern: /\b(go to root|go home|root layer|all the way out)\b/ },
  { id: 'reset', pattern: /\b(reset|reset view)\b/ },
  { id: 'zoom_in', pattern: /\b(zoom in|move closer|closer)\b/ },
  { id: 'zoom_out', pattern: /\b(zoom out|move back|farther|further)\b/ },
  { id: 'undo', pattern: /\b(undo|go back|previous view)\b/ },
  { id: 'stop', pattern: /\b(stop|cancel|hold on)\b/ },
  { id: 'confirm', pattern: /\b(confirm|approve|accept)\b/ },
  { id: 'reject', pattern: /\b(reject|dismiss|clear selection)\b/ },
];

const AGENT_PATTERN =
  /\b(plan|draft|summarize|organize|write|prepare|remind|email|investigate|analyze)\b/;

export function routeVoiceCommand(transcript) {
  const normalized = transcript.trim().toLowerCase();
  const uiMatch = UI_COMMANDS.find((entry) => entry.pattern.test(normalized));
  if (uiMatch) {
    return {
      kind: 'ui',
      command: uiMatch.id,
      transcript,
    };
  }

  if (AGENT_PATTERN.test(normalized)) {
    return {
      kind: 'agent',
      command: transcript,
      transcript,
    };
  }

  return {
    kind: 'graph',
    command: transcript,
    transcript,
  };
}
