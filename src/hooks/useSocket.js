import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { API_URL } from '../config/api';

let socketInstance = null;

function getSocket() {
  if (!socketInstance) {
    socketInstance = io(API_URL || '', {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });
  }
  return socketInstance;
}

/**
 * Fetch initial state from REST so UI has teams/players even before socket connects.
 */
async function fetchInitialState() {
  const base = API_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  const res = await fetch(`${base}/api/state`);
  if (!res.ok) return null;
  return res.json();
}

/**
 * Subscribe to socket and optionally return the socket for emitting.
 * stateUpdate is applied to state; pass onStateUpdate to get full payload.
 * Fetches initial state from GET /api/state so Manager/Admin get teams and players immediately.
 */
export function useSocket(options = {}) {
  const { onStateUpdate } = options;
  const [state, setState] = useState(null);

  useEffect(() => {
    fetchInitialState().then((payload) => {
      if (payload) setState(payload);
    });
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket.connected) socket.connect();

    const onUpdate = (payload) => {
      setState(payload);
      onStateUpdate?.(payload);
    };

    const onConnect = () => {
      fetchInitialState().then((payload) => {
        if (payload) {
          setState(payload);
          onStateUpdate?.(payload);
        }
      });
    };

    socket.on('stateUpdate', onUpdate);
    socket.on('connect', onConnect);
    return () => {
      socket.off('stateUpdate', onUpdate);
      socket.off('connect', onConnect);
    };
  }, [onStateUpdate]);

  return { socket: getSocket(), state };
}

export { getSocket };
