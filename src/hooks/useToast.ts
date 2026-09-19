import { useCallback, useEffect, useState } from "react";

const TOAST_MS = 2600;

export function useToast() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [message]);

  const show = useCallback((text: string) => setMessage(text), []);
  return { message, show };
}
