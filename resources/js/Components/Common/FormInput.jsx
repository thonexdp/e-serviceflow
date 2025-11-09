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
      {label && (
        <label
          htmlFor={name}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      {renderInput()}
      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}



//Usage : 

// <FormInput
//   label="Customer Name"
//   name="name"
//   value={form.name}
//   onChange={handleChange}
//   required
//   error={errors.name}
// />

// <FormInput
//   label="Notes"
//   type="textarea"
//   name="notes"
//   value={form.notes}
//   onChange={handleChange}
// />

// <FormInput
//   label="Status"
//   type="select"
//   name="status"
//   value={form.status}
//   onChange={handleChange}
//   options={[
//     { value: "active", label: "Active" },
//     { value: "inactive", label: "Inactive" },
//   ]}
// />
