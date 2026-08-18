import { useEffect, useRef, useState, useCallback } from 'react';
import { AuditEvent } from '../types';

export type WSStatus = 'connected' | 'connecting' | 'disconnected';

export function useWebSocket(onAuditEvent: (event: AuditEvent) => void) {
  const [status, setStatus] = useState<WSStatus>('connecting');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const backoffRef = useRef<number>(1000);

  const connect = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    setStatus('connecting');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/events`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
        backoffRef.current = 1000; // reset backoff
      };

      ws.onmessage = (messageEvent) => {
        try {
          const payload = JSON.parse(messageEvent.data);
          if (payload.type === 'AUDIT_EVENT' && payload.event) {
            onAuditEvent(payload.event);
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      ws.onclose = () => {
        setStatus('disconnected');
        wsRef.current = null;
        // Exponential backoff reconnect
        const nextRetry = Math.min(backoffRef.current * 1.5, 10000);
        backoffRef.current = nextRetry;
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connect();
        }, nextRetry);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (e) {
      setStatus('disconnected');
    }
  }, [onAuditEvent]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { status, reconnect: connect };
}
