export type BlockLike = { height?: number; id?: string; timestamp?: number };

/** The tip of a recent-blocks list, whatever order the source sent it in. */
export function highestBlock<T extends BlockLike>(
  blocks: readonly (T | null | undefined)[],
): (T & { height: number }) | null {
  let top: (T & { height: number }) | null = null;
  for (const b of blocks) {
    if (b && typeof b.height === "number" && (top == null || b.height > top.height)) {
      top = b as T & { height: number };
    }
  }
  return top;
}
