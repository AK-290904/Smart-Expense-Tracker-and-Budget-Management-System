/**
 * Goals Page - Savings Goals Management
 */
import React, { useState, useEffect } from "react";
import { Plus, Target, Edit2, Trash2, X } from "lucide-react";
import { goalsAPI } from "../services/api";
import toast from "react-hot-toast";

const GoalsPage = () => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [contributingGoal, setContributingGoal] = useState(null);
  const [contributeAmount, setContributeAmount] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    target_amount: "",
    current_amount: "0",
    target_date: "",
    icon: "target",
    color: "#10b981",
  });

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const response = await goalsAPI.getAll();
      setGoals(response.data.goals || []);
    } catch (error) {
      console.error("Failed to load goals:", error);
      // Only show error if it's not an auth error (interceptor handles that)
      if (error.response?.status !== 401 && error.response?.status !== 422) {
        const errorMessage =
          error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          "Failed to load goals";
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Validate form data
      if (!formData.name || formData.name.trim() === "") {
        toast.error("Please enter a goal name");
        return;
      }
      if (!formData.target_amount || parseFloat(formData.target_amount) <= 0) {
        toast.error("Please enter a valid target amount");
        return;
      }

      // Prepare data with proper types
      const submitData = {
        ...formData,
        target_amount: parseFloat(formData.target_amount),
        current_amount: parseFloat(formData.current_amount || 0),
      };

      console.log("Submitting goal:", submitData);

      if (editingGoal) {
        const response = await goalsAPI.update(editingGoal.id, submitData);
        console.log("Goal update response:", response);
        toast.success("Goal updated successfully");
      } else {
        const response = await goalsAPI.create(submitData);
        console.log("Goal create response:", response);
        toast.success("Goal created successfully");
      }
      await fetchGoals();
      handleCloseModal();
    } catch (error) {
      console.error("Goal submit error:", error);
      console.error("Error response:", error.response);
      // Show all errors to help debug
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Failed to save goal";
      toast.error(errorMessage);
    }
  };

  const handleContribute = async (e) => {
    e.preventDefault();
    try {
      await goalsAPI.contribute(contributingGoal.id, contributeAmount);
      toast.success("Contribution added successfully");
      fetchGoals();
      setShowContributeModal(false);
      setContributingGoal(null);
      setContributeAmount("");
    } catch (error) {
      // Only show error if it's not an auth error (interceptor handles that)
      if (error.response?.status !== 401 && error.response?.status !== 422) {
        const errorMessage =
          error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          "Failed to add contribution";
        toast.error(errorMessage);
      }
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this goal?")) return;
    try {
      await goalsAPI.delete(id);
      toast.success("Goal deleted successfully");
      fetchGoals();
    } catch (error) {
      // Only show error if it's not an auth error (interceptor handles that)
      if (error.response?.status !== 401 && error.response?.status !== 422) {
        const errorMessage =
          error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          "Failed to delete goal";
        toast.error(errorMessage);
      }
    }
  };

  const handleEdit = (goal) => {
    setEditingGoal(goal);
    setFormData({
      name: goal.name,
      target_amount: goal.target_amount,
      current_amount: goal.current_amount,
      target_date: goal.target_date ? goal.target_date.split("T")[0] : "",
      icon: goal.icon || "target",
      color: goal.color || "#10b981",
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingGoal(null);
    setFormData({
      name: "",
      target_amount: "",
      current_amount: "0",
      target_date: "",
      icon: "target",
      color: "#10b981",
    });
  };

  const getProgressPercentage = (goal) => {
    return Math.min(
      (parseFloat(goal.current_amount) / parseFloat(goal.target_amount)) * 100,
      100,
    );
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
            Savings Goals
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Track your financial goals and progress
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          New Goal
        </button>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {goals.length === 0 ? (
          <div
            className="col-span-full text-center py-12 rounded-lg"
            style={{ backgroundColor: "var(--card-bg)" }}
          >
            <Target
              size={48}
              className="mx-auto mb-4"
              style={{ color: "var(--text-tertiary)" }}
            />
            <p style={{ color: "var(--text-secondary)" }}>
              No goals yet. Create your first savings goal!
            </p>
          </div>
        ) : (
          goals.map((goal) => {
            const progress = getProgressPercentage(goal);
            const isCompleted = progress >= 100;

            return (
              <div
                key={goal.id}
                className="rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 border border-transparent hover:border-blue-400 hover:scale-[1.02] cursor-pointer"
                style={{
                  backgroundColor: "var(--card-bg)",
                  boxShadow:
                    "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow =
                    "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)";
                  e.currentTarget.style.borderColor = isCompleted
                    ? "#10b981"
                    : progress >= 90
                      ? "#10b981"
                      : "#60a5fa";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow =
                    "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
                  e.currentTarget.style.borderColor = "transparent";
                }}
              >
                <div className="flex justify-between items-start mb-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300"
                    style={{
                      backgroundColor: goal.color + "20",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = goal.color + "40";
                      e.currentTarget.style.boxShadow = `0 4px 8px ${goal.color}40`;
                      e.currentTarget.style.transform = "scale(1.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = goal.color + "20";
                      e.currentTarget.style.boxShadow =
                        "0 2px 4px rgba(0,0,0,0.1)";
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                  >
                    <Target size={24} style={{ color: goal.color }} />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(goal);
                      }}
                      className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 transition-all duration-200 hover:scale-110 shadow-sm hover:shadow-md border border-transparent"
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
                        handleDelete(goal.id);
                      }}
                      className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 transition-all duration-200 hover:scale-110 shadow-sm hover:shadow-md border border-transparent"
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

                <h3
                  className="text-xl font-bold mb-2"
                  style={{ color: "var(--text-primary)" }}
                >
                  {goal.name}
                </h3>

                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span style={{ color: "var(--text-secondary)" }}>
                      Progress
                    </span>
                    <span
                      className={`font-semibold px-2 py-1 rounded-md shadow-md transition-all duration-300 ${isCompleted ? "animate-pulse" : ""}`}
                      style={{
                        color: goal.color,
                        backgroundColor: goal.color + "15",
                        border: `1px solid ${goal.color}40`,
                      }}
                    >
                      {progress.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${progress}%`,
                        backgroundColor: goal.color,
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between">
                    <span
                      className="text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Current
                    </span>
                    <span
                      className="font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      ₹{parseFloat(goal.current_amount).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span
                      className="text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Target
                    </span>
                    <span
                      className="font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      ₹{parseFloat(goal.target_amount).toFixed(2)}
                    </span>
                  </div>
                  {goal.target_date && (
                    <div className="flex justify-between">
                      <span
                        className="text-sm"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Deadline
                      </span>
                      <span
                        className="text-sm"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {new Date(goal.target_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                {!isCompleted && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setContributingGoal(goal);
                      setShowContributeModal(true);
                    }}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-all duration-200 hover:scale-[1.02] shadow-md hover:shadow-lg"
                  >
                    Add Contribution
                  </button>
                )}
                {isCompleted && (
                  <div className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 py-2 px-4 rounded-lg text-center font-semibold shadow-md border border-green-400 animate-pulse">
                    Goal Completed!
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Create/Edit Modal */}
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
                  {editingGoal ? "Edit Goal" : "Create New Goal"}
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
                    Goal Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg border"
                    style={{
                      backgroundColor: "var(--input-bg)",
                      borderColor: "var(--border-color)",
                      color: "var(--text-primary)",
                    }}
                    placeholder="e.g., Vacation Fund"
                    required
                  />
                </div>
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Target Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.target_amount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        target_amount: e.target.value,
                      })
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
                    Current Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.current_amount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        current_amount: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 rounded-lg border"
                    style={{
                      backgroundColor: "var(--input-bg)",
                      borderColor: "var(--border-color)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Target Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.target_date}
                    onChange={(e) =>
                      setFormData({ ...formData, target_date: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg border"
                    style={{
                      backgroundColor: "var(--input-bg)",
                      borderColor: "var(--border-color)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Color
                  </label>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    className="w-full h-12 rounded-lg border cursor-pointer"
                    style={{ borderColor: "var(--border-color)" }}
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
                    {editingGoal ? "Update" : "Create"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Contribute Modal */}
      {showContributeModal && contributingGoal && (
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
                  Add Contribution
                </h2>
                <button
                  onClick={() => {
                    setShowContributeModal(false);
                    setContributingGoal(null);
                    setContributeAmount("");
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} style={{ color: "var(--text-secondary)" }} />
                </button>
              </div>
              <div
                className="mb-4 p-4 rounded-lg"
                style={{ backgroundColor: "var(--bg-tertiary)" }}
              >
                <p
                  className="text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Contributing to:
                </p>
                <p
                  className="text-lg font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {contributingGoal.name}
                </p>
              </div>
              <form onSubmit={handleContribute} className="space-y-4">
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Contribution Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={contributeAmount}
                    onChange={(e) => setContributeAmount(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border"
                    style={{
                      backgroundColor: "var(--input-bg)",
                      borderColor: "var(--border-color)",
                      color: "var(--text-primary)",
                    }}
                    placeholder="Enter amount"
                    required
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowContributeModal(false);
                      setContributingGoal(null);
                      setContributeAmount("");
                    }}
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
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Add Contribution
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

export default GoalsPage;
