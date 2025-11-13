import { useState } from "react";
import { useTheme } from "../context/ThemeContext";

export default function ChatbotWidget() {
  const { isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);

  const sendMessage = async () => {
    if (!message.trim()) return;

    const userMsg = { sender: "user", text: message };
    setChat((prev) => [...prev, userMsg]);
    setMessage("");

    try {
      // Get JWT token from localStorage
      const token = localStorage.getItem("access_token");
      
      if (!token) {
        const errorMsg = { sender: "bot", text: "⚠️ Please login to use the chatbot." };
        setChat((prev) => [...prev, errorMsg]);
        return;
      }

      const res = await fetch("http://127.0.0.1:5000/api/v1/chatbot/chat", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ message: userMsg.text }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        const errorMsg = { sender: "bot", text: `❌ ${data.error || "Failed to process message"}` };
        setChat((prev) => [...prev, errorMsg]);
        return;
      }

      let replyText = data.reply;

      // ✅ Smart suggestion
      if (replyText.toLowerCase().includes("recorded")) {
        replyText += "\n\n💡 Suggestion: Track this category in Budget section to avoid overspending.";
      }

      const botMsg = { sender: "bot", text: replyText };
      setChat((prev) => [...prev, botMsg]);
      
      // 🔄 Trigger data refresh if transaction was modified
      const transactionModified = replyText.includes("✅ Recorded") || 
                                   replyText.includes("✅ Updated") || 
                                   replyText.includes("✅ Deleted");
      
      if (transactionModified) {
        // Dispatch custom event to notify other components to refresh
        window.dispatchEvent(new CustomEvent('transactionChanged'));
      }
    } catch (err) {
      console.error("Chatbot error:", err);
      const errorMsg = { sender: "bot", text: "❌ Sorry, something went wrong. Please try again." };
      setChat((prev) => [...prev, errorMsg]);
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-all duration-200 z-50"
        style={{ boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)' }}
      >
        💬
      </button>

      {/* Chat Box */}
      {isOpen && (
        <div 
          className="fixed bottom-20 right-6 w-80 shadow-xl rounded-lg flex flex-col z-50 transition-all duration-300"
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            boxShadow: isDark ? '0 20px 25px -5px rgba(0, 0, 0, 0.5)' : '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}
        >
          <div className="px-4 py-3 bg-blue-600 text-white font-bold rounded-t-lg flex items-center justify-between">
            <span>💬 Expense Assistant</span>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-gray-200 text-xl font-normal"
            >
              ×
            </button>
          </div>

          <div 
            className="p-3 h-80 overflow-y-auto flex flex-col gap-2"
            style={{ backgroundColor: isDark ? 'var(--bg-secondary)' : 'var(--bg-primary)' }}
          >
            {chat.length === 0 ? (
              <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-tertiary)' }}>
                <p className="text-sm text-center">👋 Hi! Ask me about your expenses or add new ones.</p>
              </div>
            ) : (
              chat.map((msg, i) => (
                <div
                  key={i}
                  className={`p-3 max-w-[75%] rounded-lg text-sm whitespace-pre-line shadow-sm ${
                    msg.sender === "user"
                      ? "bg-blue-500 text-white self-end"
                      : "self-start"
                  }`}
                  style={msg.sender === "bot" ? {
                    backgroundColor: isDark ? 'var(--bg-tertiary)' : '#f3f4f6',
                    color: 'var(--text-primary)'
                  } : {}}
                >
                  {msg.text}
                </div>
              ))
            )}
          </div>

          <div 
            className="flex items-center gap-2 p-3 rounded-b-lg"
            style={{ 
              borderTop: '1px solid var(--border-color)',
              backgroundColor: isDark ? 'var(--bg-secondary)' : 'var(--bg-primary)'
            }}
          >
            <input
              className="flex-1 p-2 text-sm outline-none rounded-lg transition-all duration-200"
              style={{
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)'
              }}
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button
              onClick={sendMessage}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium"
              disabled={!message.trim()}
              style={{ opacity: message.trim() ? 1 : 0.5 }}
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}
