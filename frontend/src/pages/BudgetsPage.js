/**
 * Budgets Page - Budget Management
 */
import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, X, AlertCircle, DollarSign } from "lucide-react";
import { budgetsAPI, categoriesAPI } from "../services/api";
import toast from "react-hot-toast";

const BudgetsPage = () => {
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);

  const [formData, setFormData] = useState({
    category_id: "",
    amount: "",
    period: "monthly",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });

  useEffect(() => {
    fetchBudgets();
    fetchCategories();
    
    // Listen for transaction changes from chatbot
    const handleTransactionChange = () => {
      fetchBudgets();
    };
    
    window.addEventListener('transactionChanged', handleTransactionChange);
    
    return () => {
      window.removeEventListener('transactionChanged', handleTransactionChange);
    };
  }, []);

  const fetchBudgets = async () => {
    try {
      // Ensure token is set before making request
      const token = localStorage.getItem("access_token");
      if (!token) {
        console.error("No access token found");
        setLoading(false);
        return;
      }

      const response = await budgetsAPI.getAll();
      setBudgets(response.data.budgets || []);
    } catch (error) {
      console.error("Failed to load budgets:", error);

      // Don't show error toast for auth errors (interceptor handles redirect)
      if (error.response?.status === 401 || error.response?.status === 422) {
        console.log("Authentication error, redirecting...");
        return;
      }

      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Failed to load budgets";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      // Ensure token is set before making request
      const token = localStorage.getItem("access_token");
      if (!token) {
        console.error("No access token found");
        return;
      }

      const response = await categoriesAPI.getAll();
      setCategories(
        response.data.categories?.filter((c) => c.type === "expense") || [],
      );
      if (!response.data.categories || response.data.categories.length === 0) {
        toast.error(
          "No categories found. Please add categories in the Categories page first.",
        );
      }
    } catch (error) {
      console.error("Failed to load categories:", error);

      // Don't show error toast for auth errors (interceptor handles redirect)
      if (error.response?.status === 401 || error.response?.status === 422) {
        console.log("Authentication error, redirecting...");
        return;
      }

      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Failed to load categories";
      toast.error(`Failed to load categories: ${errorMessage}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingBudget) {
        await budgetsAPI.update(editingBudget.id, formData);
        toast.success("Budget updated successfully");
      } else {
        await budgetsAPI.create(formData);
        toast.success("Budget created successfully");
      }
      fetchBudgets();
      handleCloseModal();
    } catch (error) {
      // Only show error if it's not an auth error (interceptor handles that)
      if (error.response?.status !== 401 && error.response?.status !== 422) {
        const errorMessage =
          error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          "Failed to save budget";
        toast.error(errorMessage);
      }
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this budget?")) return;
    try {
      await budgetsAPI.delete(id);
      toast.success("Budget deleted successfully");
      fetchBudgets();
    } catch (error) {
      // Only show error if it's not an auth error (interceptor handles that)
      if (error.response?.status !== 401 && error.response?.status !== 422) {
        const errorMessage =
          error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          "Failed to delete budget";
        toast.error(errorMessage);
      }
    }
  };

  const handleEdit = (budget) => {
    setEditingBudget(budget);
    setFormData({
      category_id: budget.category_id,
      amount: budget.amount,
      period: budget.period,
      month: budget.month,
      year: budget.year,
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingBudget(null);
    setFormData({
      category_id: "",
      amount: "",
      period: "monthly",
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
    });
  };

  const getProgressPercentage = (budget) => {
    const spent = parseFloat(budget.spent || 0);
    const limit = parseFloat(budget.amount);
    return Math.min((spent / limit) * 100, 100);
  };

  const getStatusColor = (percentage) => {
    if (percentage >= 90) return "#ef4444";
    if (percentage >= 75) return "#f59e0b";
    return "#10b981";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div
      className="p-6"
      style={{ backgroundColor: "var(--bg-secondary)", minHeight: "100vh" }}
    >
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1
            className="text-3xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            Budgets
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Set spending limits and track your expenses
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          New Budget
        </button>
      </div>

      {/* Budgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {budgets.length === 0 ? (
          <div
            className="col-span-full text-center py-12 rounded-lg"
            style={{ backgroundColor: "var(--card-bg)" }}
          >
            <AlertCircle
              size={48}
              className="mx-auto mb-4"
              style={{ color: "var(--text-tertiary)" }}
            />
            <p style={{ color: "var(--text-secondary)" }}>
              No budgets yet. Create your first budget!
            </p>
          </div>
        ) : (
          budgets.map((budget) => {
            const progress = getProgressPercentage(budget);
            const statusColor = getStatusColor(progress);

            return (
              <div
                key={budget.id}
                className="rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 border border-transparent hover:border-blue-400 hover:scale-[1.02] cursor-pointer"
                style={{
                  backgroundColor: "var(--card-bg)",
                  boxShadow:
                    "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow =
                    "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)";
                  e.currentTarget.style.borderColor =
                    progress >= 90 ? "#ef4444" : "#60a5fa";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow =
                    "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
                  e.currentTarget.style.borderColor = "transparent";
                }}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3
                      className="text-lg font-bold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {budget.category?.name || "Unknown Category"}
                    </h3>
                    <p
                      className="text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {budget.period === "monthly" ? "Monthly" : "Weekly"}{" "}
                      Budget
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(budget);
                      }}
                      className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 transition-all duration-200 hover:scale-110 shadow-sm hover:shadow-md"
                      style={{ border: "1px solid transparent" }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.borderColor = "#60a5fa")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.borderColor = "transparent")
                      }
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(budget.id);
                      }}
                      className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 transition-all duration-200 hover:scale-110 shadow-sm hover:shadow-md"
                      style={{ border: "1px solid transparent" }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.borderColor = "#ef4444")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.borderColor = "transparent")
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span style={{ color: "var(--text-secondary)" }}>
                      Spent
                    </span>
                    <span
                      className="font-semibold"
                      style={{ color: statusColor }}
                    >
                      {progress.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${progress}%`,
                        backgroundColor: statusColor,
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span
                      className="text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Spent
                    </span>
                    <span
                      className="font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      ₹{parseFloat(budget.spent || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span
                      className="text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Limit
                    </span>
                    <span
                      className="font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      ₹{parseFloat(budget.amount).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span
                      className="text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Remaining
                    </span>
                    <span
                      className="font-semibold"
                      style={{ color: progress >= 100 ? "#ef4444" : "#10b981" }}
                    >
                      ₹
                      {Math.max(
                        0,
                        parseFloat(budget.amount) -
                          parseFloat(budget.spent || 0),
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>

                {progress >= 90 && (
                  <div
                    className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center gap-2 border border-red-200 dark:border-red-800 shadow-md"
                    style={{
                      animation:
                        "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                      boxShadow:
                        "0 0 0 1px rgba(239, 68, 68, 0.1), 0 4px 6px -1px rgba(239, 68, 68, 0.1)",
                    }}
                  >
                    <AlertCircle size={16} className="text-red-600" />
                    <span className="text-sm font-semibold text-red-600">
                      {progress >= 100
                        ? "Budget exceeded!"
                        : "Approaching limit"}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div
            className="rounded-lg shadow-xl max-w-md w-full"
            style={{ backgroundColor: "var(--card-bg)" }}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2
                  className="text-2xl font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {editingBudget ? "Edit Budget" : "Create New Budget"}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} style={{ color: "var(--text-secondary)" }} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Category
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) =>
                      setFormData({ ...formData, category_id: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg border"
                    style={{
                      backgroundColor: "var(--input-bg)",
                      borderColor: "var(--border-color)",
                      color: "var(--text-primary)",
                    }}
                    required
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    className="block text-sm font-medium mb-1 flex items-center gap-2"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <DollarSign size={16} />
                    Budget Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg border"
                    style={{
                      backgroundColor: "var(--input-bg)",
                      borderColor: "var(--border-color)",
                      color: "var(--text-primary)",
                    }}
                    required
                  />
                </div>
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Period
                  </label>
                  <select
                    value={formData.period}
                    onChange={(e) =>
                      setFormData({ ...formData, period: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg border"
                    style={{
                      backgroundColor: "var(--input-bg)",
                      borderColor: "var(--border-color)",
                      color: "var(--text-primary)",
                    }}
                    required
                  >
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 px-4 py-2 rounded-lg border hover:bg-gray-50 transition-colors"
                    style={{
                      borderColor: "var(--border-color)",
                      color: "var(--text-primary)",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {editingBudget ? "Update" : "Create"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetsPage;
