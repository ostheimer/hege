import { describe, expect, it, vi } from "vitest";

import { createOfflineQueueAppStateHandler } from "./offline-queue-lifecycle";

describe("offline queue app lifecycle", () => {
  it("forces a retry when the app becomes active after a network change", () => {
    const sync = vi.fn(async () => []);
    const handleAppStateChange = createOfflineQueueAppStateHandler(sync);

    handleAppStateChange("inactive");
    expect(sync).not.toHaveBeenCalled();

    handleAppStateChange("active");
    expect(sync).toHaveBeenCalledWith({ retryFailed: true });
  });
});
