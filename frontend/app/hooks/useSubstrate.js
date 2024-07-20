'use client';

import { useState, useEffect } from 'react';
import { ApiPromise, WsProvider } from '@polkadot/api';

export function useSubstrate() {
  const [api, setApi] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const connectToSubstrate = async () => {
      try {
        const wsProvider = new WsProvider('ws://127.0.0.1:9944');
        const api = await ApiPromise.create({ provider: wsProvider });
        setApi(api);
      } catch (err) {
        setError(err.message);
      }
    };

    connectToSubstrate();

    return () => {
      if (api) {
        api.disconnect();
      }
    };
  }, []);

  return { api, error };
}