import api from "./api";

export interface DashboardOverview {
  totalRevenue: number;
  orderCount: number;
  productCount: number;
  warrantyCount: number;
  revenueByStatus: { status: string; amount: number }[];
  ordersByStatus: { status: string; count: number }[];
  topProducts: {
    productId: number;
    productName: string;
    totalSold: number;
    revenue: number;
  }[];
  warrantyByStatus: { status: string; count: number }[];
  recentOrders: {
    id: number;
    orderCode: string;
    customerName: string;
    total: number;
    status: string;
    createdAt: string;
  }[];
}

export interface DashboardQuery {
  fromDate?: string;
  toDate?: string;
  topProductsLimit?: number;
}

export async function getDashboardOverview(
  query?: DashboardQuery,
): Promise<DashboardOverview> {
  const params = new URLSearchParams();
  if (query?.fromDate) params.set("fromDate", query.fromDate);
  if (query?.toDate) params.set("toDate", query.toDate);
  if (query?.topProductsLimit)
    params.set("topProductsLimit", String(query.topProductsLimit));

  const qs = params.toString();
  const url = `/dashboard/overview${qs ? `?${qs}` : ""}`;
  const { data } = await api.get(url);
  return data;
}
