"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { emptyResourceState, jsonResource, type ResourceOptions } from "@/lib/data/resource";

const noopSubscribe = () => () => {};

export function useJsonResource<T>(url: string | null, { staleMs, pollMs }: ResourceOptions) {
  const resource = useMemo(() => url ? jsonResource<T>(url, { staleMs, pollMs }) : null, [url, staleMs, pollMs]);
  const state = useSyncExternalStore(resource?.subscribe ?? noopSubscribe, resource?.getSnapshot ?? emptyResourceState<T>, emptyResourceState<T>);
  const reload = useCallback(() => resource?.refresh(true) ?? Promise.resolve(), [resource]);
  return { ...state, loading: state.loading || (!!url && state.data == null && state.error == null), reload };
}
