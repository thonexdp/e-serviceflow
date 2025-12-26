import React, { useState, useEffect } from "react";

export default function FlashMessage({ type = "success", message, duration = 4000 }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => setVisible(false), duration);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  if (!visible || !message) return null;

  const styles = {
    success: "bg-green-600 text-white",
    error: "bg-red-600 text-white",
    warning: "bg-yellow-500 text-black",
    info: "bg-orange-600 text-white"
  };

  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center space-x-3 shadow-lg rounded-lg px-4 py-3 w-auto max-w-sm animate-fade-in-up ${styles[type]}`}>
            <div className={`flex items-center justify-between w-full`}>
                <span className="text-sm font-medium">{message}</span>
                <button
          type="button"
          className="ml-3 text-white/80 hover:text-white"
          onClick={() => setVisible(false)}>

                    <i className="ti-close"></i>
                </button>
            </div>
        </div>);

}