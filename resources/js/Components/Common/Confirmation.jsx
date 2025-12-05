import React from "react";

export default function Confirmation({
    label,
    loading,
    onCancel,
    onSubmit,
    description,
    subtitle,
    color = "primary",
    icon,
    cancelLabel = "Cancel",
    showIcon = true,
}) {
    // Default icons based on color if not provided
    const getDefaultIcon = () => {
        if (icon) return icon;

        switch (color) {
            case "danger":
                return "ti-alert";
            case "success":
                return "ti-check";
            case "warning":
                return "ti-alert";
            case "info":
                return "ti-info-alt";
            default:
                return "ti-check";
        }
    };

    const iconClass = getDefaultIcon();

    // const getIconBgColor = () => {
    //     return "";
    //     switch (color) {
    //         case "danger":
    //             return "bg-danger";
    //         case "success":
    //             return "bg-success";
    //         case "warning":
    //             return "bg-warning";
    //         case "info":
    //             return "bg-info";
    //         default:
    //             return "bg-primary";
    //     }
    // };

    return (
        <div className="text-center py-3">
            {/* Icon */}
            {showIcon && (
                <div className="mb-4">
                    <div
                        className={`bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center`}
                        style={{ width: "80px", height: "80px" }}
                    >
                        <i
                            className={`${iconClass} text-${color}`}
                            style={{ fontSize: "2.5rem" }}
                        ></i>
                    </div>
                </div>
            )}

            {/* Title */}
            <h4 className="font-weight-bold mb-2 text-dark">
                {description}
            </h4>

            {/* Subtitle */}
            {subtitle && (
                <p className="text-muted mb-4" style={{ fontSize: "0.95rem" }}>
                    {subtitle}
                </p>
            )}

            {/* Buttons */}
            <div className="mt-4 d-flex justify-content-center gap-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="btn btn-light px-4"
                    disabled={loading}
                >
                    <i className="ti-close mr-2"></i>
                    {cancelLabel}
                </button>
                <button
                    type="button"
                    onClick={onSubmit}
                    disabled={loading}
                    className={`btn btn-${color} px-4`}
                >
                    {loading ? (
                        <span className="d-flex align-items-center">
                            <i className="ti-reload mr-2 animate-spin"></i>
                            {label} ...
                        </span>
                    ) : (
                        <span className="d-flex align-items-center">
                            <i className={`${iconClass} mr-2`}></i>
                            {label}
                        </span>
                    )}
                </button>
            </div>
        </div>
    );
}