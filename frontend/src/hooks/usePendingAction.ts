import { useCallback, useState } from 'react';

/**
 * Rastreia qual, de entre várias acções assíncronas disparadas por botões (ex: abrir um PDF,
 * uma por linha de tabela), está em curso — para mostrar o estado de loading só no botão certo.
 */
export function usePendingAction() {
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const run = useCallback(async (key: string, action: () => Promise<unknown>) => {
    setPendingKey(key);
    try {
      await action();
    } finally {
      setPendingKey((k) => (k === key ? null : k));
    }
  }, []);

  return { isPending: (key: string) => pendingKey === key, run };
}
