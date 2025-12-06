import React, { useState, useEffect } from "react";
import { router } from "@inertiajs/react";

/**
 * Reusable Date Range Filter Component
 * @param {Object} filters - Current filters object from backend
 * @param {string} route - The route to navigate to when filter changes
 * @param {Function} buildUrl - Optional function to build URLs with role prefix
 */
export default function DateRangeFilter({ filters = {}, route, buildUrl = null }) {
    const [dateRange, setDateRange] = useState(filters.date_range || "");
    const [customStartDate, setCustomStartDate] = useState(filters.start_date || "");
    const [customEndDate, setCustomEndDate] = useState(filters.end_date || "");
    const [showCustomDateInputs, setShowCustomDateInputs] = useState(filters.date_range === "custom");

    // Sync state with filters prop changes
    useEffect(() => {
        setDateRange(filters.date_range || "");
        setCustomStartDate(filters.start_date || "");
        setCustomEndDate(filters.end_date || "");
        setShowCustomDateInputs(filters.date_range === "custom");
    }, [filters.date_range, filters.start_date, filters.end_date]);

    // Helper function to get date range values
    const getDateRangeValues = (rangeType) => {
        const today = new Date();

        // Check if rangeType is a 4-digit year
        if (/^\d{4}$/.test(rangeType)) {
            return {
                start_date: `${rangeType}-01-01`,
                end_date: `${rangeType}-12-31`
            };
        }

        switch (rangeType) {
            case 'last_30_days':
                const thirtyDaysAgo = new Date(today);
                thirtyDaysAgo.setDate(today.getDate() - 30);
                return {
                    start_date: thirtyDaysAgo.toISOString().split('T')[0],
                    end_date: today.toISOString().split('T')[0]
                };
            case 'custom':
                return {
                    start_date: customStartDate,
                    end_date: customEndDate
                };
            default:
                return { start_date: null, end_date: null };
        }
    };

    // Generate years for filter (Current year down to 2025)
    const currentYear = new Date().getFullYear();
    const filterYears = [];
    for (let y = currentYear; y >= 2025; y--) {
        filterYears.push(y);
    }

    const handleDateRangeChange = (rangeType) => {
        setDateRange(rangeType);

        if (rangeType === 'custom') {
            setShowCustomDateInputs(true);
            // Don't apply filter yet, wait for user to input dates
            return;
        }

        setShowCustomDateInputs(false);

        const dates = getDateRangeValues(rangeType);

        const newFilters = {
            ...filters,
            date_range: rangeType || undefined,
            start_date: dates.start_date || undefined,
            end_date: dates.end_date || undefined,
        };

        // Clean up empty values
        Object.keys(newFilters).forEach(k => {
            if (newFilters[k] === '' || newFilters[k] === null || newFilters[k] === undefined) {
                delete newFilters[k];
            }
        });

        const targetRoute = buildUrl ? buildUrl(route) : route;
        router.get(targetRoute, newFilters, {
            preserveState: true,
            preserveScroll: true,
            replace: true
        });
    };

    const applyCustomDateRange = () => {
        if (!customStartDate || !customEndDate) {
            alert('Please select both start and end dates');
            return;
        }

        if (new Date(customStartDate) > new Date(customEndDate)) {
            alert('Start date cannot be after end date');
            return;
        }

        const newFilters = {
            ...filters,
            date_range: 'custom',
            start_date: customStartDate,
            end_date: customEndDate,
        };

        // Clean up empty values
        Object.keys(newFilters).forEach(k => {
            if (newFilters[k] === '' || newFilters[k] === null || newFilters[k] === undefined) {
                delete newFilters[k];
            }
        });

        const targetRoute = buildUrl ? buildUrl(route) : route;
        router.get(targetRoute, newFilters, {
            preserveState: true,
            preserveScroll: true,
            replace: true
        });
    };

    return (
        <>
            <div className="col-md-4">
                <select
                    className="form-control"
                    value={dateRange}
                    onChange={(e) => handleDateRangeChange(e.target.value)}
                    title="Filter by date range"
                >
                    <option value="">All Dates</option>
                    <option value="last_30_days">Last 30 Days</option>
                    {filterYears.map(year => (
                        <option key={year} value={year}>{year}</option>
                    ))}
                    <option value="custom">Custom Range</option>
                </select>
            </div>

            {showCustomDateInputs && (
                <div className="col-md-12 mt-3">
                    <div className="row align-items-center">
                        <div className="col-md-4">
                            <label className="mb-1">Start Date:</label>
                            <input
                                type="date"
                                className="form-control"
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                            />
                        </div>
                        <div className="col-md-4">
                            <label className="mb-1">End Date:</label>
                            <input
                                type="date"
                                className="form-control"
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                            />
                        </div>
                        <div className="col-md-4">
                            <label className="mb-1">&nbsp;</label>
                            <button
                                type="button"
                                className="btn btn-primary btn-block"
                                onClick={applyCustomDateRange}
                            >
                                Apply Custom Range
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
