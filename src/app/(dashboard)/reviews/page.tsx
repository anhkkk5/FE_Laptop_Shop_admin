"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import {
  reviewService,
  type Review,
  type ReviewQuery,
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

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
}

function parseRating(value: string | null): number | "all" {
  if (!value || value === "all") {
    return "all";
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) {
    return "all";
  }
  return parsed;
}

function parseVerified(
  value: string | null,
): "all" | "verified" | "unverified" {
  if (value === "verified" || value === "unverified") {
    return value;
  }
  return "all";
}

function ReviewsAdminPageContent() {
  const PAGE_SIZE = 10;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialPage = parsePositiveInt(searchParams.get("page"), 1);
  const initialRating = parseRating(searchParams.get("rating"));
  const initialVerified = parseVerified(searchParams.get("verified"));
  const initialSearch = searchParams.get("search") ?? "";

  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [ratingFilter, setRatingFilter] = useState<number | "all">(
    initialRating,
  );
  const [verifiedFilter, setVerifiedFilter] = useState<
    "all" | "verified" | "unverified"
  >(initialVerified);
  const [page, setPage] = useState(initialPage);
  const tableSectionRef = useRef<HTMLDivElement | null>(null);
  const shouldFocusTableRef = useRef(false);

  function markKeepTableInView() {
    shouldFocusTableRef.current = true;
  }

  function clearFilters() {
    markKeepTableInView();
    setSearchInput("");
    setDebouncedSearch("");
    setRatingFilter("all");
    setVerifiedFilter("all");
    setPage(1);
  }

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query: ReviewQuery = {
        page,
        limit: PAGE_SIZE,
        rating: ratingFilter === "all" ? undefined : ratingFilter,
        isVerified:
          verifiedFilter === "all"
            ? undefined
            : verifiedFilter === "verified"
              ? true
              : false,
        search: debouncedSearch.trim() || undefined,
      };

      const [summaryData, listData] = await Promise.all([
        reviewService.getSummary(),
        reviewService.getAll(query),
      ]);
      setSummary(summaryData);
      setReviews(listData.data);
      setTotal(listData.meta.total);
      setTotalPages(Math.max(1, listData.meta.totalPages || 1));
    } catch {
      setError("Không thể tải dữ liệu đánh giá");
    } finally {
      setLoading(false);
    }
  }, [page, ratingFilter, verifiedFilter, debouncedSearch]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, ratingFilter, verifiedFilter]);

  useEffect(() => {
    if (!loading && shouldFocusTableRef.current) {
      tableSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      shouldFocusTableRef.current = false;
    }
  }, [loading]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (page > 1) {
      params.set("page", String(page));
    }
    if (ratingFilter !== "all") {
      params.set("rating", String(ratingFilter));
    }
    if (verifiedFilter !== "all") {
      params.set("verified", verifiedFilter);
    }
    const keyword = debouncedSearch.trim();
    if (keyword) {
      params.set("search", keyword);
    }

    const nextQuery = params.toString();
    const currentQuery = searchParams.toString();
    if (nextQuery !== currentQuery) {
      const href = nextQuery ? `${pathname}?${nextQuery}` : pathname;
      router.replace(href, { scroll: false });
    }
  }, [
    page,
    ratingFilter,
    verifiedFilter,
    debouncedSearch,
    pathname,
    router,
    searchParams,
  ]);

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

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-3 rounded-lg border p-3 md:grid-cols-4">
        <input
          className="h-9 rounded-md border border-input bg-background px-3 text-sm md:col-span-2"
          placeholder="Tìm theo product/user/comment"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={ratingFilter}
          onChange={(event) => {
            const value = event.target.value;
            markKeepTableInView();
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
          onChange={(event) => {
            markKeepTableInView();
            setVerifiedFilter(
              event.target.value as "all" | "verified" | "unverified",
            );
          }}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="verified">Đã xác thực</option>
          <option value="unverified">Chưa xác thực</option>
        </select>
        <div className="flex items-center justify-end md:col-span-4">
          <Button variant="outline" size="sm" onClick={clearFilters}>
            Clear
          </Button>
        </div>
      </div>

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

      <div ref={tableSectionRef} className="rounded-lg border">
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
            ) : reviews.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-muted-foreground"
                >
                  Không có đánh giá phù hợp bộ lọc
                </TableCell>
              </TableRow>
            ) : (
              reviews.map((review) => (
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
          {total} kết quả • Trang {page}/{totalPages}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => {
              markKeepTableInView();
              setPage((prev) => Math.max(1, prev - 1));
            }}
          >
            Trước
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => {
              markKeepTableInView();
              setPage((prev) => Math.min(totalPages, prev + 1));
            }}
          >
            Sau
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ReviewsAdminPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 text-sm text-muted-foreground">Đang tải...</div>
      }
    >
      <ReviewsAdminPageContent />
    </Suspense>
  );
}
