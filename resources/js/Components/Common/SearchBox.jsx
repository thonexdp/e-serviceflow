import React, { useState, useEffect } from "react";
import { router } from "@inertiajs/react";
import { useDebouncedCallback } from "use-debounce";
import { useRoleApi } from "@/Hooks/useRoleApi";

export default function SearchBox({
  placeholder = "Search...",
  initialValue = "",
  route = "",
  preserveState = true,
  preserveScroll = true,
  debounceMs = 500,
  additionalParams = {},
  onSearchChange = null
}) {
  const [search, setSearch] = useState(initialValue);

  const { buildUrl } = useRoleApi();

  const debouncedSearch = useDebouncedCallback((value) => {
    router.get(
      buildUrl(route),
      { search: value, ...additionalParams },
      {
        preserveState,
        preserveScroll,
        only: ["customers", "tickets"]
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
    router.get(buildUrl(route), { search, ...additionalParams }, { preserveState, preserveScroll });
  };

  const handleClear = () => {
    setSearch("");
    router.get(buildUrl(route), { ...additionalParams }, { preserveState, preserveScroll, only: ["customers", "tickets"] });
    if (onSearchChange) onSearchChange("");
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
            <div className="relative flex items-center mb-4">
                <input
          type="text"
          placeholder={placeholder}
          className="w-full rounded-sm border border-gray-300 bg-white pl-10 pr-10 text-sm text-gray-700 placeholder-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-none transition-all"
          value={search}
          onChange={handleChange} />


                {/* Search icon (left) */}
                <div className="absolute left-3 text-gray-400 pointer-events-none">
                    <i className="ti-search"></i>
                </div>

                {/* Clear button (right) */}
                {search &&
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-14 text-gray-400 hover:text-gray-600 transition z-10">

                        <i className="ti-close"></i>
                    </button>
        }

                {/* Submit button */}
                <button
          type="submit"
          className="absolute right-1 bg-orange-500 text-white px-3 py-1.5 rounded-md hover:bg-orange-600 focus:ring-2 focus:ring-orange-300 transition z-20">

                    <i className="ti-arrow-right"></i>
                </button>
            </div>
        </form>);

}