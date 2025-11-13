/**
 * Home Page - Landing page with quick actions
 */
import React from "react";
import { Link } from "react-router-dom";
import {
  Target,
  TrendingUp,
  IndianRupee,
  PieChart,
  Calendar,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const HomePage = () => {
  const { isAuthenticated, user } = useAuth();

  const quickActions = [
    {
      title: "Add Expense",
      description: "Track your spending",
      icon: <IndianRupee className="w-8 h-8" />,
      color: "bg-red-500",
      hoverColor: "hover:bg-red-600",
      link: "/transactions?type=expense",
    },
    {
      title: "Create Budget",
      description: "Set spending limits",
      icon: <PieChart className="w-8 h-8" />,
      color: "bg-blue-500",
      hoverColor: "hover:bg-blue-600",
      link: "/budgets",
    },
    {
      title: "Set Goal",
      description: "Plan your savings",
      icon: <Target className="w-8 h-8" />,
      color: "bg-green-500",
      hoverColor: "hover:bg-green-600",
      link: "/goals",
    },
  ];

  const features = [
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "Track Expenses",
      description: "Monitor your income and expenses in real-time",
    },
    {
      icon: <PieChart className="w-6 h-6" />,
      title: "Smart Budgets",
      description: "Set budgets and get alerts when you overspend",
    },
    {
      icon: <Target className="w-6 h-6" />,
      title: "Savings Goals",
      description: "Create goals and track your progress",
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      title: "Calendar View",
      description: "Visualize your transactions on a calendar",
    },
  ];

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-[var(--bg-secondary)] p-6">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-[var(--text-primary)] mb-4">
              Welcome,{" "}
              <span className="text-blue-600">
                {user?.username || user?.email?.split("@")[0] || "User"}
              </span>
              !
            </h1>
            <p className="text-xl text-[var(--text-secondary)] mb-8">
              Ready to take control of your finances today?
            </p>
          </div>

          {/* Quick Actions */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6 text-center">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {quickActions.map((action, index) => (
                <Link
                  key={index}
                  to={action.link}
                  className={`${action.color} ${action.hoverColor} text-white rounded-xl p-8 shadow-lg transform transition-all duration-200 hover:scale-105 hover:shadow-xl`}
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="mb-4 bg-white bg-opacity-20 p-4 rounded-full">
                      {action.icon}
                    </div>
                    <h3 className="text-2xl font-bold mb-2">{action.title}</h3>
                    <p className="text-white text-opacity-90">
                      {action.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Features Grid */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6 text-center">
              Powerful Features
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="bg-[var(--card-bg)] rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow"
                >
                  <div className="text-blue-600 mb-4">{feature.icon}</div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-[var(--text-secondary)] text-sm">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-center text-white shadow-xl">
            <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
            <p className="text-lg mb-6 text-white text-opacity-90">
              View your dashboard to see your financial overview
            </p>
            <Link
              to="/dashboard"
              className="inline-block bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated - show landing page
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Master Your Money with{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              ExpenseTracker
            </span>
          </h1>
          <p className="text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            Track expenses, set budgets, achieve goals - all in one beautiful
            app
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              to="/register"
              className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors shadow-lg"
            >
              Get Started Free
            </Link>
            <Link
              to="/login"
              className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors shadow-lg"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="text-blue-600 mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-12 shadow-xl text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
            Why Choose ExpenseTracker?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">100%</div>
              <div className="text-gray-600 dark:text-gray-300">
                Free to Use
              </div>
            </div>
            <div>
              <div className="text-4xl font-bold text-purple-600 mb-2">18+</div>
              <div className="text-gray-600 dark:text-gray-300">
                Default Categories
              </div>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-600 mb-2">∞</div>
              <div className="text-gray-600 dark:text-gray-300">
                Unlimited Transactions
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
