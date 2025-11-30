import React from "react";

export default function CardStatistics({
    label,
    statistics = 0,
    icon,
    color = "bg-secondary"
}) {
    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        {label}
                    </p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                        {statistics}
                    </p>
                    {/* <div className="flex items-center mt-2 text-xs">
                        <span className="text-green-600 font-semibold flex items-center">
                            <svg
                                className="w-3 h-3 mr-0.5"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            12%
                        </span>
                        <span className="text-gray-400 ml-1">
                            vs last month
                        </span>
                    </div> */}
                </div>
                <div className={`${color} p-3 rounded-lg`}>
                    <i className={`${icon} text-white`}></i>
                </div>
            </div>
        </div >
    );
}
