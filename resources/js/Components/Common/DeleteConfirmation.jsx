import React from "react";

export default function DeleteConfirmation({
    label,
    loading,
    onCancel,
    onSubmit,
}) {
    return (
        <div className="p-6 text-center">
            {/* Warning Icon */}
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <i className="ti-alert text-red-600 text-3xl"></i>
            </div>

            {/* Title */}
            <h2 className="text-lg font-semibold text-gray-800">
                Are you sure you want to delete this {label}?
            </h2>

            {/* Description */}
            <p className="mt-2 text-sm text-gray-500">
                This action cannot be undone. The {label}’s data will be
                permanently removed from your records.
            </p>

            {/* Buttons */}
            <div className="mt-6 flex justify-center gap-3">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 transition"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={onSubmit}
                    disabled={loading}
                    className={`px-5 py-2.5 text-sm font-medium text-white rounded-lg transition
                                ${
                                    loading
                                        ? "bg-red-400 cursor-not-allowed"
                                        : "bg-red-600 hover:bg-red-700 focus:ring-2 focus:ring-red-400"
                                }
                            `}
                >
                    {loading ? (
                        <span className="flex items-center">
                            <i className="ti-reload mr-2 animate-spin"></i>{" "}
                            Deleting...
                        </span>
                    ) : (
                        <span className="flex items-center">
                            <i className="ti-trash mr-2"></i> Delete
                        </span>
                    )}
                </button>
            </div>
        </div>
    );
}
