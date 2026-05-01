"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import {
  notificationAdminService,
  type DeadLetterJob,
  type NotificationQueueStats,
} from "@/lib/notification-admin-service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const initialStats: NotificationQueueStats = {
  pending: 0,
  retrying: 0,
  deadLetter: 0,
};

export default function NotificationsPage() {
  const { hasRole } = useAuth();
  const canAccessNotifications = hasRole("admin", "staff");
  const [stats, setStats] = useState<NotificationQueueStats>(initialStats);
  const [dlqJobs, setDlqJobs] = useState<DeadLetterJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!canAccessNotifications) {
      setLoading(false);
      setStats(initialStats);
      setDlqJobs([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [queueStats, deadLetters] = await Promise.all([
        notificationAdminService.getQueueStats(),
        notificationAdminService.getDeadLetterJobs(20),
      ]);
      setStats(queueStats);
      setDlqJobs(deadLetters);
    } catch {
      setError("Không thể tải dữ liệu hàng đợi thông báo");
    } finally {
      setLoading(false);
    }
  }, [canAccessNotifications]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  if (!canAccessNotifications) {
    return (
      <div className="rounded-lg border p-6">
        <h1 className="text-xl font-semibold">Thông báo hệ thống</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Bạn không có quyền truy cập module này.
        </p>
      </div>
    );
  }

  async function retryDeadLetters() {
    setRetrying(true);
    setError(null);
    try {
      await notificationAdminService.retryDeadLetterJobs(20);
      await fetchData();
    } catch {
      setError("Không thể retry DLQ");
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Thông báo hệ thống
          </h1>
          <p className="text-muted-foreground">
            Theo dõi queue delivery, retry queue và dead-letter queue
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void fetchData()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Làm mới
          </Button>
          <Button
            onClick={retryDeadLetters}
            disabled={retrying || stats.deadLetter === 0}
          >
            {retrying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Retry DLQ
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Pending Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Retry Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.retrying}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Dead Letter Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">
              {stats.deadLetter}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">DLQ payloads (tối đa 20)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : dlqJobs.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Dead-letter queue đang trống
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Index</TableHead>
                    <TableHead>Payload</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dlqJobs.map((job) => (
                    <TableRow key={`${job.index}-${job.raw.slice(0, 12)}`}>
                      <TableCell>{job.index}</TableCell>
                      <TableCell>
                        <pre className="max-h-28 overflow-auto whitespace-pre-wrap rounded bg-muted p-2 text-xs">
                          {JSON.stringify(job.payload ?? job.raw, null, 2)}
                        </pre>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
