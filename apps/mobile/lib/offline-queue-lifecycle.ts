import type { SyncOfflineQueueOptions } from "./offline-queue";

type ResumeSync = (options: SyncOfflineQueueOptions) => Promise<unknown>;

export function createOfflineQueueAppStateHandler(sync: ResumeSync) {
  return (nextState: string) => {
    if (nextState === "active") {
      void sync({ retryFailed: true });
    }
  };
}
