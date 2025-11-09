import React, { useState, useEffect } from "react";
import { router } from "@inertiajs/react";
import { useDebouncedCallback } from "use-debounce";

export default function SearchBox({
    placeholder = "Search...",
    initialValue = "",
    route = "",
    preserveState = true,
    preserveScroll = true,
    debounceMs = 500,
    additionalParams = {},
    onSearchChange = null,
}) {
    const [search, setSearch] = useState(initialValue);

    const debouncedSearch = useDebouncedCallback((value) => {
        router.get(
            route,
            { search: value, ...additionalParams },
            {
                preserveState,
                preserveScroll,
                only: ["customers", "tickets"],
            }
        );
    }, debounceMs);

    useEffect(() => {
        if (search !== initialValue) {
            debouncedSearch(search);
        }
    }, [search]);

    const handleChange = (e) => {
        const value = e.target.value;
        setSearch(value);
        if (onSearchChange) onSearchChange(value);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        debouncedSearch.cancel();
        router.get(route, { search, ...additionalParams }, { preserveState, preserveScroll });
    };

    const handleClear = () => {
        setSearch("");
        router.get(route, { ...additionalParams }, { preserveState, preserveScroll, only: ["customers", "tickets"] });
        if (onSearchChange) onSearchChange("");
    };

    return (
        <form onSubmit={handleSubmit} className="w-full">
            <div className="relative flex items-center">
                <input
                    type="text"
                    placeholder={placeholder}
                    className="w-full rounded-sm border border-gray-300 bg-white py-2 pl-10 pr-10 text-sm text-gray-700 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                    value={search}
                    onChange={handleChange}
                />

                {/* Search icon (left) */}
                <div className="absolute left-3 text-gray-400 pointer-events-none">
                    <i className="ti-search"></i>
                </div>

                {/* Clear button (right) */}
                {search && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="absolute right-14 text-gray-400 hover:text-gray-600 transition z-10"
                    >
                        <i className="ti-close"></i>
                    </button>
                )}

                {/* Submit button */}
                <button
                    type="submit"
                    className="absolute right-1 bg-blue-500 text-white px-3 py-1.5 rounded-md hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 transition z-20"
                >
                    <i className="ti-arrow-right"></i>
                </button>
            </div>
        </form>
    );
}
