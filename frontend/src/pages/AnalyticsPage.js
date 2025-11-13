/**
 * Analytics Page - Comprehensive Financial Analytics
 */
import React, { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  PieChart as PieChartIcon,
  BarChart3,
  Download,
  Filter,
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { analyticsAPI } from "../services/api";
import toast from "react-hot-toast";

const AnalyticsPage = () => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [spendingByCategory, setSpendingByCategory] = useState([]);
  const [trends, setTrends] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState("6months");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch summary for current month
      const summaryResponse = await analyticsAPI.getSummary(
        selectedMonth,
        selectedYear,
      );
      setSummary(summaryResponse.data);

      // Fetch spending by category
      const spendingResponse = await analyticsAPI.getSpendingByCategory({
        type: "expense",
        month: selectedMonth,
        year: selectedYear,
      });
      const spendingData = spendingResponse.data.spending || [];
      const formattedSpending = spendingData.map((item) => ({
        ...item,
        total_amount: parseFloat(item.total_amount || 0),
        percentage: parseFloat(item.percentage || 0),
        value: parseFloat(item.total_amount || 0), // For pie chart
        name: item.category_name, // For pie chart
      }));

      // Group small slices (< 3%) into "Other"
      const threshold = 3;
      const mainCategories = formattedSpending.filter(
        (item) => item.percentage >= threshold,
      );
      const smallCategories = formattedSpending.filter(
        (item) => item.percentage < threshold,
      );

      let chartData = [...mainCategories];
      if (smallCategories.length > 0) {
        const otherTotal = smallCategories.reduce(
          (sum, item) => sum + item.value,
          0,
        );
        const otherPercentage = smallCategories.reduce(
          (sum, item) => sum + item.percentage,
          0,
        );
        chartData.push({
          name: "Other",
          category_name: `Other (${smallCategories.length} categories)`,
          value: otherTotal,
          total_amount: otherTotal,
          percentage: otherPercentage,
          category_color: "#94a3b8",
          transaction_count: smallCategories.reduce(
            (sum, item) => sum + (item.transaction_count || 0),
            0,
          ),
          isOther: true,
          subcategories: smallCategories,
        });
      }

      setSpendingByCategory(chartData);

      // Fetch trends
      const months = selectedPeriod === "6months" ? 6 : 12;
      const trendsResponse = await analyticsAPI.getTrends({
        period: "monthly",
        months: months,
      });
      const trendsData = trendsResponse.data.trends || [];
      const formattedTrends = trendsData.map((item) => ({
        ...item,
        income: parseFloat(item.income || 0),
        expense: parseFloat(item.expense || 0),
        net: parseFloat(item.net || 0),
        month: new Date(item.date + "-01").toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        }),
      }));
      setTrends(formattedTrends);
    } catch (error) {
      console.error("Failed to load analytics:", error);
      if (error.response?.status !== 401 && error.response?.status !== 422) {
        toast.error("Failed to load analytics data");
      }
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear, selectedPeriod]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const formatCurrencyDetailed = (amount) => {
    return `₹${parseFloat(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const totalIncome = parseFloat(summary?.total_income || 0);
  const totalExpenses = parseFloat(summary?.total_expenses || 0);
  const netBalance = totalIncome - totalExpenses;
  const expenseRate =
    totalIncome > 0 ? ((totalExpenses / totalIncome) * 100).toFixed(1) : 0;

  const COLORS = [
    "#ef4444",
    "#f97316",
    "#f59e0b",
    "#eab308",
    "#84cc16",
    "#22c55e",
    "#10b981",
    "#14b8a6",
    "#06b6d4",
    "#0ea5e9",
    "#3b82f6",
    "#6366f1",
    "#8b5cf6",
    "#a855f7",
    "#d946ef",
    "#ec4899",
  ];

  return (
    <div
      className="p-6 space-y-6"
      style={{ backgroundColor: "var(--bg-secondary)", minHeight: "100vh" }}
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1
            className="text-3xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            Analytics Dashboard
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Comprehensive financial insights and trends
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="px-4 py-2 rounded-lg border"
            style={{
              backgroundColor: "var(--input-bg)",
              borderColor: "var(--border-color)",
              color: "var(--text-primary)",
            }}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2000, i).toLocaleString("default", { month: "long" })}
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-4 py-2 rounded-lg border"
            style={{
              backgroundColor: "var(--input-bg)",
              borderColor: "var(--border-color)",
              color: "var(--text-primary)",
            }}
          >
            {Array.from({ length: 5 }, (_, i) => {
              const year = new Date().getFullYear() - i;
              return (
                <option key={year} value={year}>
                  {year}
                </option>
              );
            })}
          </select>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 rounded-lg border"
            style={{
              backgroundColor: "var(--input-bg)",
              borderColor: "var(--border-color)",
              color: "var(--text-primary)",
            }}
          >
            <option value="6months">Last 6 Months</option>
            <option value="12months">Last 12 Months</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Income */}
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-sm font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              Total Income
            </span>
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20">
              <TrendingUp size={20} className="text-green-600" />
            </div>
          </div>
          <div
            className="text-2xl font-bold mb-1"
            style={{ color: "var(--text-primary)" }}
          >
            {formatCurrency(totalIncome)}
          </div>
          <div className="flex items-center text-sm">
            <span style={{ color: "var(--text-tertiary)" }}>
              {summary?.income_count || 0} transactions
            </span>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-sm font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              Total Expenses
            </span>
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/20">
              <TrendingDown size={20} className="text-red-600" />
            </div>
          </div>
          <div
            className="text-2xl font-bold mb-1"
            style={{ color: "var(--text-primary)" }}
          >
            {formatCurrency(totalExpenses)}
          </div>
          <div className="flex items-center text-sm">
            <span style={{ color: "var(--text-tertiary)" }}>
              {summary?.expense_count || 0} transactions
            </span>
          </div>
        </div>

        {/* Net Balance */}
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-sm font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              Net Balance
            </span>
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
              <DollarSign size={20} className="text-blue-600" />
            </div>
          </div>
          <div
            className="text-2xl font-bold mb-1"
            style={{
              color: netBalance >= 0 ? "#10b981" : "#ef4444",
            }}
          >
            {formatCurrency(netBalance)}
          </div>
          <div className="flex items-center text-sm">
            <span style={{ color: "var(--text-tertiary)" }}>
              {netBalance >= 0 ? "Surplus" : "Deficit"}
            </span>
          </div>
        </div>

        {/* Expense Rate */}
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-sm font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              Expense Rate
            </span>
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/20">
              <BarChart3 size={20} className="text-purple-600" />
            </div>
          </div>
          <div
            className="text-2xl font-bold mb-1"
            style={{ color: "var(--text-primary)" }}
          >
            {expenseRate}%
          </div>
          <div className="flex items-center text-sm">
            <span style={{ color: "var(--text-tertiary)" }}>
              of total income
            </span>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income vs Expense Trend */}
        <div className="card">
          <h2
            className="text-xl font-bold mb-4"
            style={{ color: "var(--text-primary)" }}
          >
            Income vs Expenses Trend
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trends}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border-color)"
              />
              <XAxis
                dataKey="month"
                stroke="var(--text-tertiary)"
                style={{ fontSize: "12px" }}
              />
              <YAxis
                stroke="var(--text-tertiary)"
                style={{ fontSize: "12px" }}
                tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  color: "#1f2937",
                }}
                formatter={(value) => formatCurrencyDetailed(value)}
                labelStyle={{ color: "#1f2937", fontWeight: "600" }}
              />
              <Legend
                wrapperStyle={{ paddingTop: "10px" }}
                formatter={(value) => (
                  <span
                    style={{ color: "var(--text-primary)", fontSize: "13px" }}
                  >
                    {value}
                  </span>
                )}
              />
              <Area
                type="monotone"
                dataKey="income"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#colorIncome)"
                name="Income"
              />
              <Area
                type="monotone"
                dataKey="expense"
                stroke="#ef4444"
                strokeWidth={2}
                fill="url(#colorExpense)"
                name="Expenses"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Net Balance Trend */}
        <div className="card">
          <h2
            className="text-xl font-bold mb-4"
            style={{ color: "var(--text-primary)" }}
          >
            Net Balance Trend
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border-color)"
              />
              <XAxis
                dataKey="month"
                stroke="var(--text-tertiary)"
                style={{ fontSize: "12px" }}
              />
              <YAxis
                stroke="var(--text-tertiary)"
                style={{ fontSize: "12px" }}
                tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  color: "#1f2937",
                }}
                formatter={(value) => formatCurrencyDetailed(value)}
                labelStyle={{ color: "#1f2937", fontWeight: "600" }}
              />
              <Legend
                wrapperStyle={{ paddingTop: "10px" }}
                formatter={(value) => (
                  <span
                    style={{ color: "var(--text-primary)", fontSize: "13px" }}
                  >
                    {value}
                  </span>
                )}
              />
              <Line
                type="monotone"
                dataKey="net"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: "#3b82f6", r: 4 }}
                activeDot={{ r: 6 }}
                name="Net Balance"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Spending Analysis Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown - Pie Chart */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2
              className="text-xl font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              Spending by Category
            </h2>
            <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {spendingByCategory.length > 0 && (
                <span>
                  {spendingByCategory.filter((c) => !c.isOther).length}{" "}
                  categories shown
                </span>
              )}
            </div>
          </div>
          {spendingByCategory.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={spendingByCategory}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={110}
                    innerRadius={0}
                    paddingAngle={1}
                    label={false}
                    labelLine={false}
                  >
                    {spendingByCategory.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.category_color || COLORS[index % COLORS.length]
                        }
                        style={{ cursor: "pointer", outline: "none" }}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div
                            style={{
                              backgroundColor: "#ffffff",
                              border: "1px solid #e5e7eb",
                              borderRadius: "8px",
                              padding: "12px",
                              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                            }}
                          >
                            <div
                              style={{
                                fontWeight: "600",
                                color: "#1f2937",
                                marginBottom: "8px",
                                fontSize: "14px",
                              }}
                            >
                              {data.category_name || data.name}
                            </div>
                            <div
                              style={{
                                color: "#4b5563",
                                fontSize: "13px",
                                marginBottom: "4px",
                              }}
                            >
                              Amount: {formatCurrencyDetailed(data.value)}
                            </div>
                            <div
                              style={{
                                color: "#4b5563",
                                fontSize: "13px",
                                marginBottom: "4px",
                              }}
                            >
                              Percentage: {data.percentage.toFixed(1)}%
                            </div>
                            <div style={{ color: "#6b7280", fontSize: "12px" }}>
                              {data.transaction_count} transactions
                            </div>
                            {data.isOther && data.subcategories && (
                              <div
                                style={{
                                  marginTop: "8px",
                                  paddingTop: "8px",
                                  borderTop: "1px solid #e5e7eb",
                                  fontSize: "12px",
                                  color: "#6b7280",
                                }}
                              >
                                <div
                                  style={{
                                    fontWeight: "600",
                                    marginBottom: "4px",
                                  }}
                                >
                                  Includes:
                                </div>
                                {data.subcategories
                                  .slice(0, 5)
                                  .map((sub, i) => (
                                    <div key={i} style={{ marginLeft: "8px" }}>
                                      • {sub.category_name} (
                                      {sub.percentage.toFixed(1)}%)
                                    </div>
                                  ))}
                                {data.subcategories.length > 5 && (
                                  <div
                                    style={{
                                      marginLeft: "8px",
                                      fontStyle: "italic",
                                    }}
                                  >
                                    ... and {data.subcategories.length - 5} more
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={80}
                    wrapperStyle={{
                      paddingTop: "20px",
                      maxHeight: "80px",
                      overflowY: "auto",
                    }}
                    content={({ payload }) => (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          justifyContent: "center",
                          gap: "12px",
                          padding: "8px",
                        }}
                      >
                        {payload.map((entry, index) => (
                          <div
                            key={`legend-${index}`}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              fontSize: "13px",
                              color: "var(--text-primary)",
                            }}
                          >
                            <div
                              style={{
                                width: "12px",
                                height: "12px",
                                borderRadius: "3px",
                                backgroundColor: entry.color,
                                flexShrink: 0,
                              }}
                            />
                            <span>
                              {entry.value} (
                              {entry.payload.percentage.toFixed(1)}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </>
          ) : (
            <div className="flex items-center justify-center h-64">
              <p style={{ color: "var(--text-secondary)" }}>
                No spending data available for this period
              </p>
            </div>
          )}
        </div>

        {/* Category Breakdown - Bar Chart */}
        <div className="card">
          <h2
            className="text-xl font-bold mb-4"
            style={{ color: "var(--text-primary)" }}
          >
            Top Categories by Amount
          </h2>
          {spendingByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart
                data={spendingByCategory.slice(0, 8)}
                layout="vertical"
                margin={{ left: 20 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border-color)"
                />
                <XAxis
                  type="number"
                  stroke="var(--text-tertiary)"
                  style={{ fontSize: "12px" }}
                  tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="var(--text-tertiary)"
                  style={{ fontSize: "12px" }}
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    color: "#1f2937",
                  }}
                  formatter={(value) => formatCurrencyDetailed(value)}
                  labelStyle={{ color: "#1f2937", fontWeight: "600" }}
                />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {spendingByCategory.slice(0, 8).map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.category_color || COLORS[index % COLORS.length]
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64">
              <p style={{ color: "var(--text-secondary)" }}>
                No category data available for this period
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Insights & Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Spending Categories List */}
        <div className="card lg:col-span-2">
          <h2
            className="text-xl font-bold mb-4"
            style={{ color: "var(--text-primary)" }}
          >
            Detailed Category Breakdown
          </h2>
          <div className="space-y-3">
            {spendingByCategory.length > 0 ? (
              spendingByCategory.map((category, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-3 rounded-lg"
                  style={{ backgroundColor: "var(--bg-secondary)" }}
                >
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor:
                        category.category_color ||
                        COLORS[index % COLORS.length],
                    }}
                  ></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span
                        className="font-medium truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {category.name}
                      </span>
                      <span
                        className="font-bold ml-4"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {formatCurrency(category.value)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${category.percentage}%`,
                            backgroundColor:
                              category.category_color ||
                              COLORS[index % COLORS.length],
                          }}
                        ></div>
                      </div>
                      <span
                        className="text-sm font-medium"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {category.percentage.toFixed(1)}%
                      </span>
                    </div>
                    <span
                      className="text-xs"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {category.transaction_count} transactions
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p
                className="text-center py-8"
                style={{ color: "var(--text-secondary)" }}
              >
                No spending data available
              </p>
            )}
          </div>
        </div>

        {/* Quick Insights */}
        <div className="card">
          <h2
            className="text-xl font-bold mb-4"
            style={{ color: "var(--text-primary)" }}
          >
            Quick Insights
          </h2>
          <div className="space-y-4">
            {/* Highest Spending Category */}
            {spendingByCategory.length > 0 && (
              <div
                className="p-3 rounded-lg border-l-4 border-red-500"
                style={{ backgroundColor: "var(--bg-secondary)" }}
              >
                <div
                  className="text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Top Spending Category
                </div>
                <div
                  className="text-lg font-bold mt-1"
                  style={{ color: "var(--text-primary)" }}
                >
                  {spendingByCategory[0]?.name}
                </div>
                <div className="text-sm font-semibold text-red-600">
                  {formatCurrency(spendingByCategory[0]?.value)} (
                  {spendingByCategory[0]?.percentage.toFixed(1)}%)
                </div>
              </div>
            )}

            {/* Savings Status */}
            <div
              className={`p-3 rounded-lg border-l-4 ${
                netBalance >= 0 ? "border-green-500" : "border-red-500"
              }`}
              style={{ backgroundColor: "var(--bg-secondary)" }}
            >
              <div
                className="text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                This Period
              </div>
              <div
                className="text-lg font-bold mt-1"
                style={{ color: netBalance >= 0 ? "#10b981" : "#ef4444" }}
              >
                {netBalance >= 0 ? "Saving" : "Overspending"}
              </div>
              <div
                className={`text-sm font-semibold ${
                  netBalance >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatCurrency(Math.abs(netBalance))}
              </div>
            </div>

            {/* Total Transactions */}
            <div
              className="p-3 rounded-lg border-l-4 border-blue-500"
              style={{ backgroundColor: "var(--bg-secondary)" }}
            >
              <div
                className="text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                Total Transactions
              </div>
              <div
                className="text-lg font-bold mt-1"
                style={{ color: "var(--text-primary)" }}
              >
                {summary?.transaction_count || 0}
              </div>
              <div className="text-sm text-blue-600">
                {summary?.income_count || 0} income •{" "}
                {summary?.expense_count || 0} expense
              </div>
            </div>

            {/* Expense Rate Status */}
            <div
              className={`p-3 rounded-lg border-l-4 ${
                expenseRate > 100
                  ? "border-red-500"
                  : expenseRate > 80
                    ? "border-yellow-500"
                    : "border-green-500"
              }`}
              style={{ backgroundColor: "var(--bg-secondary)" }}
            >
              <div
                className="text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                Expense Rate Status
              </div>
              <div
                className={`text-lg font-bold mt-1 ${
                  expenseRate > 100
                    ? "text-red-600"
                    : expenseRate > 80
                      ? "text-yellow-600"
                      : "text-green-600"
                }`}
              >
                {expenseRate > 100
                  ? "High Risk"
                  : expenseRate > 80
                    ? "Moderate"
                    : "Healthy"}
              </div>
              <div
                className="text-sm"
                style={{ color: "var(--text-tertiary)" }}
              >
                Spending {expenseRate}% of income
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
