"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import {
  reviewService,
  type Review,
  type ReviewSummary,
} from "@/lib/review-service";
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

export default function ReviewsAdminPage() {
  const PAGE_SIZE = 10;
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState<number | "all">("all");
  const [verifiedFilter, setVerifiedFilter] = useState<
    "all" | "verified" | "unverified"
  >("all");
  const [page, setPage] = useState(1);

  const filteredReviews = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return reviews.filter((review) => {
      const matchesKeyword =
        !keyword ||
        String(review.productId).includes(keyword) ||
        String(review.userId).includes(keyword) ||
        (review.comment || "").toLowerCase().includes(keyword);

      const matchesRating =
        ratingFilter === "all" ? true : review.rating === ratingFilter;

      const matchesVerified =
        verifiedFilter === "all"
          ? true
          : verifiedFilter === "verified"
            ? review.isVerified
            : !review.isVerified;

      return matchesKeyword && matchesRating && matchesVerified;
    });
  }, [reviews, search, ratingFilter, verifiedFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredReviews.length / PAGE_SIZE));
  const paginatedReviews = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredReviews.slice(start, start + PAGE_SIZE);
  }, [filteredReviews, page]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryData, listData] = await Promise.all([
        reviewService.getSummary(),
        reviewService.getAll(1, 30),
      ]);
      setSummary(summaryData);
      setReviews(listData.data);
    } catch {
      setError("Không thể tải dữ liệu đánh giá");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPage(1);
  }, [search, ratingFilter, verifiedFilter]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  async function handleDelete(reviewId: number) {
    setDeletingId(reviewId);
    setError(null);
    try {
      await reviewService.remove(reviewId);
      await fetchData();
    } catch {
      setError("Không thể xóa đánh giá");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Quản lý đánh giá</h1>
        <p className="text-muted-foreground">
          Moderate review và theo dõi chất lượng phản hồi
        </p>
      </div>

      <div className="grid gap-3 rounded-lg border p-3 md:grid-cols-4">
        <input
          className="h-9 rounded-md border border-input bg-background px-3 text-sm md:col-span-2"
          placeholder="Tìm theo product/user/comment"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={ratingFilter}
          onChange={(event) => {
            const value = event.target.value;
            setRatingFilter(value === "all" ? "all" : Number(value));
          }}
        >
          <option value="all">Tất cả số sao</option>
          <option value="5">5 sao</option>
          <option value="4">4 sao</option>
          <option value="3">3 sao</option>
          <option value="2">2 sao</option>
          <option value="1">1 sao</option>
        </select>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={verifiedFilter}
          onChange={(event) =>
            setVerifiedFilter(
              event.target.value as "all" | "verified" | "unverified",
            )
          }
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="verified">Đã xác thực</option>
          <option value="unverified">Chưa xác thực</option>
        </select>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Tổng đánh giá</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summary?.total ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Đã xác thực</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summary?.verified ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Điểm trung bình</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {summary?.averageRating ?? "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">5 sao</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summary?.byRating[5] ?? "—"}</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Bình luận</TableHead>
              <TableHead>Thời gian</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : filteredReviews.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-muted-foreground"
                >
                  Không có đánh giá phù hợp bộ lọc
                </TableCell>
              </TableRow>
            ) : (
              paginatedReviews.map((review) => (
                <TableRow key={review.id}>
                  <TableCell>{review.id}</TableCell>
                  <TableCell>{review.productId}</TableCell>
                  <TableCell>{review.userId}</TableCell>
                  <TableCell>{review.rating}</TableCell>
                  <TableCell className="max-w-[320px] truncate">
                    {review.comment || "(Không có)"}
                  </TableCell>
                  <TableCell>
                    {new Date(review.createdAt).toLocaleString("vi-VN")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={deletingId === review.id}
                      onClick={() => handleDelete(review.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredReviews.length} kết quả • Trang {page}/{totalPages}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            Trước
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          >
            Sau
          </Button>
        </div>
      </div>
    </div>
  );
}
