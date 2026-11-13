/**
 * Incremental parser of server-sent events (text/event-stream). Used by the API to read the
 * model's stream and by the site to read the API's stream (T-2102).
 */
export interface SseEvent {
  /** `event:` field; "message" when absent. */
  event: string;
  data: string;
}

export interface SseParser {
  /** Feeds a piece of the stream; returns the events it completed. */
  push(chunk: string): SseEvent[];
  /** Ends the stream: an event without the final blank line still counts. */
  end(): SseEvent[];
}

export function createSseParser(): SseParser {
  let buffer = '';
  let event = '';
  let data: string[] = [];
  let started = false;

  const take = (): SseEvent[] => {
    if (!started) return [];
    const out = { event: event || 'message', data: data.join('\n') };
    event = '';
    data = [];
    started = false;
    return [out];
  };

  const line = (raw: string): SseEvent[] => {
    const text = raw.endsWith('\r') ? raw.slice(0, -1) : raw;
    if (text === '') return take();
    if (text.startsWith(':')) return [];
    const colon = text.indexOf(':');
    const field = colon < 0 ? text : text.slice(0, colon);
    let value = colon < 0 ? '' : text.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    if (field === 'event') {
      event = value;
      started = true;
    } else if (field === 'data') {
      data.push(value);
      started = true;
    }
    return [];
  };

  return {
    push(chunk) {
      buffer += chunk;
      const out: SseEvent[] = [];
      let nl = buffer.indexOf('\n');
      while (nl >= 0) {
        out.push(...line(buffer.slice(0, nl)));
        buffer = buffer.slice(nl + 1);
        nl = buffer.indexOf('\n');
      }
      return out;
    },
    end() {
      const out = buffer ? line(buffer) : [];
      buffer = '';
      return [...out, ...take()];
    },
  };
}
