import React from "react";

export default function CardStatistics({
    label,
    statistics = 0,
    icon,
    color = "bg-secondary",
    statChange = false,
    changePercent = 0,
    changeLabel = "vs previous period",
    onClick = null,
    details = null
}) {
    const isPositive = changePercent >= 0;
    const formattedPercent = Math.abs(changePercent).toFixed(1);

    return (
        <div
            className={`bg-white p-4 rounded-lg shadow-sm border border-gray-200 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
            onClick={onClick}
        >
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        {label}
                    </p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                        {statistics}
                    </p>

                    {details &&
                        <div className="mt-1 text-xs text-gray-500">
                            {details}
                        </div>
                    }
                    {
                        statChange &&
                        <div className="flex items-center mt-2 text-xs">
                            <span className={`${isPositive ? 'text-green-600' : 'text-red-600'} font-semibold flex items-center`}>
                                {isPositive ?
                                    <svg
                                        className="w-3 h-3 mr-0.5"
                                        fill="currentColor"
                                        viewBox="0 0 20 20">

                                        <path
                                            fillRule="evenodd"
                                            d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                                            clipRule="evenodd" />

                                    </svg> :

                                    <svg
                                        className="w-3 h-3 mr-0.5"
                                        fill="currentColor"
                                        viewBox="0 0 20 20">

                                        <path
                                            fillRule="evenodd"
                                            d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"
                                            clipRule="evenodd" />

                                    </svg>
                                }
                                {formattedPercent}%
                            </span>
                            <span className="text-gray-400 ml-1">
                                {changeLabel}
                            </span>
                        </div>

                    }

                </div>
                <div className={`${color} p-3 rounded-lg`}>
                    {icon === "ti-money" ? "₱" : <i className={`${icon} text-white`}></i>}
                </div>
            </div>
        </div>);

}