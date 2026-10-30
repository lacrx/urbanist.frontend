import { useState, useEffect } from "react";

type RuntimeDataState<T> =
  | { status: "loading"; data: null; error: null }
  | { status: "ready"; data: T; error: null }
  | { status: "error"; data: null; error: string };

export function useRuntimeData<T = unknown>(url: string): RuntimeDataState<T> {
  const [state, setState] = useState<RuntimeDataState<T>>({
    status: "loading",
    data: null,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading", data: null, error: null });

    fetch(url, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.json() as Promise<T>;
      })
      .then((data) => {
        setState({ status: "ready", data, error: null });
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setState({ status: "error", data: null, error: String(err) });
      });

    return () => controller.abort();
  }, [url]);

  return state;
}
