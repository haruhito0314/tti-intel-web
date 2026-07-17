const JST_OFFSET_MILLISECONDS = 9 * 60 * 60 * 1_000;

/** Calendar day key in Asia/Tokyo (UTC+9), used for Dynamo day partitions. */
export function jstDateKey(now: Date): string {
  return new Date(now.getTime() + JST_OFFSET_MILLISECONDS)
    .toISOString()
    .slice(0, 10);
}
