/**
 * Dashboard Page - Main overview with dynamic data
 */
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Target,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { analyticsAPI } from "../services/api";
import toast from "react-hot-toast";
import BudgetAlerts from "../components/BudgetAlerts";

const DashboardPage = () => {
  const [summary, setSummary] = useState(null);
  const [spendingData, setSpendingData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
    fetchSpendingByCategory();
    
    // Listen for transaction changes from chatbot
    const handleTransactionChange = () => {
      fetchSummary();
      fetchSpendingByCategory();
    };
    
    window.addEventListener('transactionChanged', handleTransactionChange);
    
    return () => {
      window.removeEventListener('transactionChanged', handleTransactionChange);
    };
  }, []);

  const fetchSummary = async () => {
    try {
      // Fetch all-time data by not passing month/year parameters
      const response = await analyticsAPI.getSummary();
      setSummary(response.data);
    } catch (error) {
      console.error("Failed to fetch summary:", error);
      // Only show error if it's not an auth error (interceptor handles that)
      if (error.response?.status !== 401 && error.response?.status !== 422) {
        const errorMessage =
          error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          "Failed to load dashboard data";
        toast.error(errorMessage);
      }
      // Set default empty data on error
      setSummary({
        total_income: 0,
        total_expenses: 0,
        net_balance: 0,
        savings_rate: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSpendingByCategory = async () => {
    try {
      const response = await analyticsAPI.getSpendingByCategory({
        type: "expense",
      });
      const data = response.data.spending || [];

      // Convert total_amount to number for the chart
      const formattedData = data.map((item) => ({
        ...item,
        total_amount: parseFloat(item.total_amount || 0),
        percentage: parseFloat(item.percentage || 0),
      }));

      // Group small slices (< 3%) into "Other"
      const threshold = 3;
      const mainCategories = formattedData.filter(
        (item) => item.percentage >= threshold,
      );
      const smallCategories = formattedData.filter(
        (item) => item.percentage < threshold,
      );

      let chartData = [...mainCategories];
      if (smallCategories.length > 0) {
        const otherTotal = smallCategories.reduce(
          (sum, item) => sum + item.total_amount,
          0,
        );
        const otherPercentage = smallCategories.reduce(
          (sum, item) => sum + item.percentage,
          0,
        );
        chartData.push({
          category_name: `Other (${smallCategories.length} categories)`,
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

      setSpendingData(chartData);
    } catch (error) {
      console.error("Failed to fetch spending data:", error);
      // Don't show error toast, just log it
    }
  };

  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
  const savingsRate = totalIncome > 0 ? (netBalance / totalIncome) * 100 : 0;

  const stats = [
    {
      name: "Total Income",
      value: formatCurrency(totalIncome),
      change: "0%",
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-100 dark:bg-green-900/20",
    },
    {
      name: "Total Expenses",
      value: formatCurrency(totalExpenses),
      change: "0%",
      icon: TrendingDown,
      color: "text-red-600",
      bgColor: "bg-red-100 dark:bg-red-900/20",
    },
    {
      name: "Net Balance",
      value: formatCurrency(netBalance),
      change: "0%",
      icon: Wallet,
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/20",
    },
    {
      name: "Savings Rate",
      value: `${savingsRate.toFixed(1)}%`,
      change: "0%",
      icon: Target,
      color: "text-purple-600",
      bgColor: "bg-purple-100 dark:bg-purple-900/20",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-3xl font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          Dashboard
        </h1>
        <p className="mt-1" style={{ color: "var(--text-secondary)" }}>
          Here's your complete financial overview
        </p>
      </div>

      {/* Budget Alerts */}
      <BudgetAlerts />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const changeValue = parseFloat(stat.change);
          const isPositive = changeValue >= 0;

          return (
            <div key={stat.name} className="card">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {stat.name}
                  </p>
                  <p
                    className="text-2xl font-bold mt-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {stat.value}
                  </p>
                  {changeValue !== 0 && (
                    <div className="flex items-center mt-2 text-sm">
                      {isPositive ? (
                        <ArrowUpRight size={16} className="text-green-600" />
                      ) : (
                        <ArrowDownRight size={16} className="text-red-600" />
                      )}
                      <span
                        className={
                          isPositive ? "text-green-600" : "text-red-600"
                        }
                      >
                        {stat.change}
                      </span>
                      <span
                        className="ml-1"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        vs last month
                      </span>
                    </div>
                  )}
                </div>
                <div className={`${stat.bgColor} p-3 rounded-lg`}>
                  <Icon size={24} className={stat.color} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2
          className="text-xl font-bold mb-4"
          style={{ color: "var(--text-primary)" }}
        >
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/transactions" className="btn btn-primary text-center">
            Add Transaction
          </Link>
          <Link to="/budgets" className="btn btn-primary text-center">
            Create Budget
          </Link>
          <Link to="/goals" className="btn btn-primary text-center">
            Set Goal
          </Link>
        </div>
      </div>

      {/* Spending by Category Chart */}
      <div className="card">
        <h2
          className="text-xl font-bold mb-4"
          style={{ color: "var(--text-primary)" }}
        >
          Spending by Category
        </h2>
        <div className="mb-4">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {spendingData.filter((c) => !c.isOther).length} main categories |
            Total spent: ₹
            {spendingData
              .reduce(
                (sum, item) => sum + parseFloat(item.total_amount || 0),
                0,
              )
              .toLocaleString("en-IN")}
          </p>
        </div>
        {spendingData.length > 0 ? (
          <ResponsiveContainer width="100%" height={500}>
            <PieChart>
              <Pie
                data={spendingData}
                dataKey="total_amount"
                nameKey="category_name"
                cx="50%"
                cy="45%"
                outerRadius={130}
                innerRadius={0}
                paddingAngle={1}
                label={false}
                labelLine={false}
                activeShape={{
                  outerRadius: 145,
                  stroke: "var(--text-primary)",
                  strokeWidth: 2,
                }}
              >
                {spendingData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.category_color || "#8884d8"}
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
                          {data.category_name}
                        </div>
                        <div
                          style={{
                            color: "#4b5563",
                            fontSize: "13px",
                            marginBottom: "4px",
                          }}
                        >
                          Amount: ₹
                          {parseFloat(data.total_amount).toLocaleString(
                            "en-IN",
                            { minimumFractionDigits: 2 },
                          )}
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
                            {data.subcategories.slice(0, 5).map((sub, i) => (
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
                          {entry.payload.category_name.split(" (")[0]} (
                          {entry.payload.percentage.toFixed(1)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-64">
            <p style={{ color: "var(--text-secondary)" }}>
              No expense data available. Start adding expenses to see your
              spending breakdown!
            </p>
          </div>
        )}
      </div>

      {/* Insights Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h2
            className="text-xl font-bold mb-4"
            style={{ color: "var(--text-primary)" }}
          >
            Financial Overview
          </h2>
          <div className="space-y-4">
            <div
              className="flex justify-between items-center p-3 rounded-lg"
              style={{ backgroundColor: "var(--bg-secondary)" }}
            >
              <span style={{ color: "var(--text-secondary)" }}>
                Transactions This Period
              </span>
              <span
                className="font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                {summary?.transaction_count || 0}
              </span>
            </div>
            <div
              className="flex justify-between items-center p-3 rounded-lg"
              style={{ backgroundColor: "var(--bg-secondary)" }}
            >
              <span style={{ color: "var(--text-secondary)" }}>
                Income Entries
              </span>
              <span className="font-bold text-green-600">
                {summary?.income_count || 0}
              </span>
            </div>
            <div
              className="flex justify-between items-center p-3 rounded-lg"
              style={{ backgroundColor: "var(--bg-secondary)" }}
            >
              <span style={{ color: "var(--text-secondary)" }}>
                Expense Entries
              </span>
              <span className="font-bold text-red-600">
                {summary?.expense_count || 0}
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <h2
            className="text-xl font-bold mb-4"
            style={{ color: "var(--text-primary)" }}
          >
            Top Spending Categories
          </h2>
          <div className="space-y-3">
            {spendingData.slice(0, 5).map((category, index) => (
              <div key={index} className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: category.category_color }}
                ></div>
                <div className="flex-1 flex justify-between items-center">
                  <span style={{ color: "var(--text-primary)" }}>
                    {category.category_name}
                  </span>
                  <span
                    className="font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    ₹{parseFloat(category.total_amount).toLocaleString("en-IN")}
                  </span>
                </div>
                <span
                  className="text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {category.percentage}%
                </span>
              </div>
            ))}
            {spendingData.length === 0 && (
              <p
                style={{ color: "var(--text-secondary)" }}
                className="text-center py-4"
              >
                No spending data yet
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
