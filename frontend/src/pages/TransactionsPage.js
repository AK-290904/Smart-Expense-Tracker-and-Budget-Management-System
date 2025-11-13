import React, { useState, useEffect } from "react";
import { Plus, Search, Edit2, Trash2, X } from "lucide-react";
import { transactionsAPI, categoriesAPI } from "../services/api";
import toast from "react-hot-toast";
import BudgetAlerts from "../components/BudgetAlerts";

const TransactionsPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");

  const [formData, setFormData] = useState({
    category_id: "",
    amount: "",
    type: "expense",
    description: "",
    date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetchTransactions();
    fetchCategories();
    
    // Listen for transaction changes from chatbot
    const handleTransactionChange = () => {
      fetchTransactions();
    };
    
    window.addEventListener('transactionChanged', handleTransactionChange);
    
    return () => {
      window.removeEventListener('transactionChanged', handleTransactionChange);
    };
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await transactionsAPI.getAll();
      setTransactions(response.data.transactions || []);
    } catch (error) {
      console.error("Failed to load transactions:", error);
      // Only show error if it's not an auth error (interceptor handles that)
      if (error.response?.status !== 401 && error.response?.status !== 422) {
        const errorMessage =
          error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          "Failed to load transactions";
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getAll();
      const categoriesList = response.data?.categories || response.data || [];
      setCategories(categoriesList);

      if (categoriesList.length === 0) {
        toast.error(
          "No categories found. Please add categories in the Categories page first.",
        );
      }
    } catch (error) {
      // Don't show error toast for 401/422 - let the interceptor handle it
      if (error.response?.status === 401 || error.response?.status === 422) {
        return;
      }

      // Show all other errors
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
      // Validate form data
      if (!formData.category_id) {
        toast.error("Please select a category");
        return;
      }
      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        toast.error("Please enter a valid amount");
        return;
      }

      // Prepare data with proper types
      const submitData = {
        ...formData,
        category_id: parseInt(formData.category_id),
        amount: parseFloat(formData.amount),
      };

      console.log("Submitting transaction:", submitData);

      if (editingTransaction) {
        const response = await transactionsAPI.update(
          editingTransaction.id,
          submitData,
        );
        console.log("Transaction update response:", response);
        toast.success("Transaction updated successfully");
      } else {
        const response = await transactionsAPI.create(submitData);
        console.log("Transaction create response:", response);
        toast.success("Transaction created successfully");
      }
      await fetchTransactions();
      handleCloseModal();
    } catch (error) {
      console.error("Transaction submit error:", error);
      console.error("Error response:", error.response);
      console.error("Error data:", error.response?.data);
      console.error(
        "Full error object:",
        JSON.stringify(error.response?.data, null, 2),
      );

      // Extract detailed error message
      let errorMessage = "Failed to save transaction";

      if (error.response?.data) {
        const data = error.response.data;
        if (data.messages) {
          // Validation errors from marshmallow
          errorMessage = JSON.stringify(data.messages);
        } else if (data.message) {
          errorMessage = data.message;
        } else if (data.error) {
          errorMessage = data.error;
        }
      }

      toast.error(errorMessage);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this transaction?"))
      return;
    try {
      await transactionsAPI.delete(id);
      toast.success("Transaction deleted successfully");
      fetchTransactions();
    } catch (error) {
      // Only show error if it's not an auth error (interceptor handles that)
      if (error.response?.status !== 401 && error.response?.status !== 422) {
        const errorMessage =
          error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          "Failed to delete transaction";
        toast.error(errorMessage);
      }
    }
  };

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      category_id: transaction.category_id,
      amount: transaction.amount,
      type: transaction.type,
      description: transaction.description || "",
      date: transaction.date.split("T")[0],
    });
    // Refetch categories when opening edit modal
    fetchCategories();
    setShowModal(true);
  };

  const handleOpenModal = () => {
    // Refetch categories when opening add modal
    fetchCategories();
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTransaction(null);
    setFormData({
      category_id: "",
      amount: "",
      type: "expense",
      description: "",
      date: new Date().toISOString().split("T")[0],
    });
  };

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || t.type === filterType;
    return matchesSearch && matchesType;
  });

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
      <div className="mb-6">
        <h1
          className="text-3xl font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          Transactions
        </h1>
        <p style={{ color: "var(--text-secondary)" }}>
          Manage your income and expenses
        </p>
      </div>

      {/* Budget Alerts */}
      <BudgetAlerts />

      {/* Actions Bar */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2"
            style={{ color: "var(--text-tertiary)" }}
            size={20}
          />
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border"
            style={{
              backgroundColor: "var(--input-bg)",
              borderColor: "var(--border-color)",
              color: "var(--text-primary)",
            }}
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 rounded-lg border"
          style={{
            backgroundColor: "var(--input-bg)",
            borderColor: "var(--border-color)",
            color: "var(--text-primary)",
          }}
        >
          <option value="all">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <button
          onClick={handleOpenModal}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Add Transaction
        </button>
      </div>

      {/* Transactions List */}
      <div className="space-y-3">
        {filteredTransactions.length === 0 ? (
          <div
            className="text-center py-12 rounded-lg"
            style={{ backgroundColor: "var(--card-bg)" }}
          >
            <p style={{ color: "var(--text-secondary)" }}>
              No transactions found. Add your first transaction!
            </p>
          </div>
        ) : (
          filteredTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className="p-4 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 flex items-center justify-between border border-transparent hover:border-blue-300"
              style={{
                backgroundColor: "var(--card-bg)",
                backgroundImage:
                  transaction.type === "income"
                    ? "linear-gradient(135deg, rgba(16, 185, 129, 0.03) 0%, transparent 100%)"
                    : "linear-gradient(135deg, rgba(239, 68, 68, 0.03) 0%, transparent 100%)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#93c5fd";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "transparent";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div className="flex items-center gap-4 flex-1">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300"
                  style={{
                    backgroundColor: transaction.category?.color + "20",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor =
                      transaction.category?.color + "40";
                    e.currentTarget.style.boxShadow = `0 4px 8px ${transaction.category?.color}40`;
                    e.currentTarget.style.transform = "scale(1.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor =
                      transaction.category?.color + "20";
                    e.currentTarget.style.boxShadow =
                      "0 2px 4px rgba(0,0,0,0.1)";
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  <span
                    style={{ color: transaction.category?.color }}
                    className="text-xl font-bold"
                  >
                    {transaction.type === "income" ? "↑" : "↓"}
                  </span>
                </div>
                <div className="flex-1">
                  <h3
                    className="font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {transaction.category?.name || "Unknown"}
                  </h3>
                  <p
                    className="text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {transaction.description || "No description"}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {new Date(transaction.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className="text-xl font-bold"
                    style={{
                      color:
                        transaction.type === "income" ? "#10b981" : "#ef4444",
                    }}
                  >
                    {transaction.type === "income" ? "+" : "-"}₹
                    {parseFloat(transaction.amount).toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => handleEdit(transaction)}
                  className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 transition-all duration-200 hover:scale-110 shadow-sm hover:shadow-md border border-transparent"
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.borderColor = "#60a5fa")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor = "transparent")
                  }
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => handleDelete(transaction.id)}
                  className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 transition-all duration-200 hover:scale-110 shadow-sm hover:shadow-md border border-transparent"
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.borderColor = "#ef4444")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor = "transparent")
                  }
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
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
                  {editingTransaction ? "Edit Transaction" : "Add Transaction"}
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
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg border"
                    style={{
                      backgroundColor: "var(--input-bg)",
                      borderColor: "var(--border-color)",
                      color: "var(--text-primary)",
                    }}
                    required
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
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
                    {categories && categories.length > 0 ? (
                      categories
                        .filter((c) => c.type === formData.type)
                        .map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))
                    ) : (
                      <option value="" disabled>
                        Loading categories...
                      </option>
                    )}
                  </select>
                </div>
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Amount (₹)
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
                    Date
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
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
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg border"
                    style={{
                      backgroundColor: "var(--input-bg)",
                      borderColor: "var(--border-color)",
                      color: "var(--text-primary)",
                    }}
                    rows="3"
                  />
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
                    {editingTransaction ? "Update" : "Create"}
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

export default TransactionsPage;
