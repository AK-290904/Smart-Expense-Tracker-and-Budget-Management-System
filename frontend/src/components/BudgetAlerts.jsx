import React, { useState, useEffect } from 'react';
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { budgetsAPI } from '../services/api';

const BudgetAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [dismissedAlerts, setDismissedAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
    // Check for alerts every 5 minutes
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await budgetsAPI.getAlerts();
      setAlerts(response.data.alerts || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch budget alerts:', error);
      setLoading(false);
    }
  };

  const dismissAlert = (alertId) => {
    setDismissedAlerts([...dismissedAlerts, alertId]);
  };

  const visibleAlerts = alerts.filter(
    (alert) => !dismissedAlerts.includes(alert.id)
  );

  if (loading || visibleAlerts.length === 0) {
    return null;
  }

  const getAlertIcon = (level) => {
    switch (level) {
      case 'danger':
        return <AlertTriangle size={20} />;
      case 'warning':
        return <AlertCircle size={20} />;
      case 'info':
        return <Info size={20} />;
      default:
        return <Info size={20} />;
    }
  };

  const getAlertStyles = (level) => {
    switch (level) {
      case 'danger':
        return {
          bg: 'bg-red-100 dark:bg-red-900/50',
          border: 'border-red-500 dark:border-red-500',
          text: 'text-red-900 dark:text-red-100',
          icon: 'text-red-700 dark:text-red-300',
          shadow: 'shadow-md shadow-red-200/50 dark:shadow-red-900/50',
        };
      case 'warning':
        return {
          bg: 'bg-yellow-100 dark:bg-yellow-900/50',
          border: 'border-yellow-500 dark:border-yellow-500',
          text: 'text-yellow-900 dark:text-yellow-100',
          icon: 'text-yellow-700 dark:text-yellow-300',
          shadow: 'shadow-md shadow-yellow-200/50 dark:shadow-yellow-900/50',
        };
      case 'info':
        return {
          bg: 'bg-blue-100 dark:bg-blue-900/50',
          border: 'border-blue-500 dark:border-blue-500',
          text: 'text-blue-900 dark:text-blue-100',
          icon: 'text-blue-700 dark:text-blue-300',
          shadow: 'shadow-md shadow-blue-200/50 dark:shadow-blue-900/50',
        };
      default:
        return {
          bg: 'bg-gray-100 dark:bg-gray-900/50',
          border: 'border-gray-500 dark:border-gray-500',
          text: 'text-gray-900 dark:text-gray-100',
          icon: 'text-gray-700 dark:text-gray-300',
          shadow: 'shadow-md',
        };
    }
  };

  return (
    <div className="space-y-3 mb-6">
      {visibleAlerts.map((alert) => {
        const styles = getAlertStyles(alert.alert_level);
        return (
          <div
            key={alert.id}
            className={`${styles.bg} ${styles.border} ${styles.shadow} border-2 rounded-lg p-4 flex items-start gap-3 animate-fade-in`}
          >
            <div className={styles.icon}>{getAlertIcon(alert.alert_level)}</div>
            <div className="flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className={`font-bold text-base ${styles.text}`}>
                    {alert.message}
                  </p>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-3 flex-wrap text-sm font-bold">
                      <span className={`${styles.text} px-3 py-1.5 rounded-md`}>
                        Spent: ₹{alert.spent_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                      <span className={`${styles.text} px-3 py-1.5 rounded-md`}>
                        Budget: ₹{alert.budget_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                      <span className={`px-3 py-1.5 rounded-md font-bold ${
                        alert.remaining < 0 
                          ? styles.text
                          : 'text-green-900 dark:text-green-100'
                      }`}>
                        {alert.remaining < 0 ? 'Over' : 'Left'}: ₹{Math.abs(alert.remaining).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-bold ${styles.text}`}>
                          Budget Usage
                        </span>
                        <span className={`text-sm font-bold ${styles.text}`}>
                          {alert.percentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-300 dark:bg-gray-600 rounded-full h-3 overflow-hidden shadow-inner">
                        <div
                          className={`h-3 rounded-full transition-all duration-300 ${
                            alert.percentage > 100
                              ? 'bg-red-600 dark:bg-red-500'
                              : alert.percentage >= 90
                              ? 'bg-yellow-600 dark:bg-yellow-500'
                              : 'bg-blue-600 dark:bg-blue-500'
                          }`}
                          style={{ width: `${Math.min(alert.percentage, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => dismissAlert(alert.id)}
                  className={`${styles.text} hover:opacity-60 transition-opacity flex-shrink-0`}
                  aria-label="Dismiss alert"
                >
                  <X size={20} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BudgetAlerts;
