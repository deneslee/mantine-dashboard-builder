import type { DataFrame } from '../../src/core/data/DataFrame';

/** A database the relay reads for the app. Every method rejects with an `AppError`. */
export interface Driver<Query, Test> {
  query(input: Query, signal?: AbortSignal): Promise<DataFrame[]>;
  /** What the server says it is, proving the connection string works. */
  test(input: Test, signal?: AbortSignal): Promise<string>;
  /** Closes every open connection, when the relay stops. */
  close(): Promise<void>;
}
