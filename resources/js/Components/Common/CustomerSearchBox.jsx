import React, { useState, useEffect } from "react";
import axios from "axios";
import { useRoleApi } from "@/Hooks/useRoleApi";


export default function CustomerSearchBox({ onSelect, _selectedCustomer }) {
    const [query, setQuery] = useState(_selectedCustomer?.full_name || "");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const { api } = useRoleApi();

    // Sync query with selected customer if it changes externally (e.g. after ticket creation)
    useEffect(() => {
        if (_selectedCustomer) {
            setQuery(_selectedCustomer.full_name);
        } else if (query === "") {
            setResults([]);
        }
    }, [_selectedCustomer]);

    useEffect(() => {
        // If query matches the selected customer's name exactly, don't trigger a new search
        if (_selectedCustomer && query === _selectedCustomer.full_name) {
            return;
        }

        if (query.length < 2) {
            setResults([]);
            setShowDropdown(false);
            return;
        }

        const delay = setTimeout(async () => {
            setLoading(true);
            try {
                const { data } = await api.get(`/customers/search`, { params: { q: query } });
                setResults(data);
                setShowDropdown(true);
            } catch (error) {
                console.error("Error fetching customers", error);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(delay);
    }, [query, _selectedCustomer]);

    const handleSelect = (customer) => {
        setQuery(customer.full_name);
        setResults([]); // Clear results to prevent "No results found" from flashing
        setShowDropdown(false);
        onSelect(customer);
    };

    return (
        <div className="relative">
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => query.length >= 2 && setShowDropdown(true)}
                placeholder="Search Customer..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-400 focus:outline-none"
            />

            {loading && (
                <div className="absolute right-3 top-2 text-gray-400 animate-spin">
                    <i className="ti-reload"></i>
                </div>
            )}

            {showDropdown && results.length > 0 && (
                <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-md mt-1 shadow-md max-h-48 overflow-y-auto">
                    {results.map((customer) => (
                        <li
                            key={customer.id}
                            onClick={() => handleSelect(customer)}
                            className="px-3 py-2 cursor-pointer hover:bg-orange-100"
                        >
                            <span className="font-medium">{customer.full_name}</span>
                            <div className="text-xs text-gray-500">{customer.email || "No email"}</div>
                        </li>
                    ))}
                </ul>
            )}

            {showDropdown && !loading && results.length === 0 && query.length >= 2 && !_selectedCustomer && (
                <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-md mt-1 px-3 py-2 text-gray-500 text-sm">
                    No results found
                </div>
            )}
        </div>
    );
}
