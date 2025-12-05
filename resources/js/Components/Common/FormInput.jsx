import React from "react";

export default function FormInput({
  label,
  type = "text",
  name,
  value,
  onChange,
  error = null,
  placeholder = "",
  required = false,
  disabled = false,
  className = "",
  rows = 3,
  options = [], // For select inputs
  defaultChecked, // For checkbox
}) {
  const baseClasses = `
    w-full text-sm rounded-md border border-gray-300 
    focus:border-blue-500 focus:ring-2 focus:ring-blue-200 
    outline-none transition duration-150 ease-in-out
    placeholder-gray-400
    ${disabled ? "bg-gray-100 cursor-not-allowed" : "bg-white"}
    ${error ? "border-red-500 focus:ring-red-200" : ""}
    ${className}
  `;

  const renderInput = () => {
    switch (type) {
      case "checkbox":
        return (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name={name}
              checked={value}
              defaultChecked={defaultChecked}
              onChange={(e) =>
                onChange
                  ? onChange({
                    target: { name, value: e.target.checked },
                  })
                  : null
              }
              disabled={disabled}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <span className="text-sm">{label}</span>
          </div>
        );

      case "textarea":
        return (
          <textarea
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            rows={rows}
            className={`${baseClasses} p-2.5`}
          />
        );

      case "select":
        return (
          <select
            name={name}
            value={value}
            onChange={onChange}
            required={required}
            disabled={disabled}
            className={`${baseClasses} p-2.5`}
          >
            <option value="">Select {label}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      default:
        return (
          <input
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            className={`${baseClasses} p-2.5`}
          />
        );
    }
  };

  return (
    <div className="mb-4">
      {/* For checkbox we don't render label above */}
      {type !== "checkbox" && label && (
        <label
          htmlFor={name}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {renderInput()}

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
