import api from "./api";

export interface NotificationQueueStats {
  pending: number;
  retrying: number;
  deadLetter: number;
}

export interface DeadLetterJob {
  index: number;
  payload: Record<string, unknown> | null;
  raw: string;
}

export const notificationAdminService = {
  async getQueueStats(): Promise<NotificationQueueStats> {
    const res = await api.get("/admin/notifications/queue-stats");
    return res.data.data;
  },

  async getDeadLetterJobs(limit = 20): Promise<DeadLetterJob[]> {
    const res = await api.get("/admin/notifications/dlq", {
      params: { limit },
    });
    return res.data.data;
  },

  async retryDeadLetterJobs(limit = 20): Promise<{ retried: number }> {
    const res = await api.post("/admin/notifications/dlq/retry", null, {
      params: { limit },
    });
    return res.data.data;
  },
};
