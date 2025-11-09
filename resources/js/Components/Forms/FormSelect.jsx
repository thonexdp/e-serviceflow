import React from 'react';
import InputError from '@/Components/InputError';

export default function FormSelect({
    label,
    name,
    value,
    onChange,
    options = [],
    error,
    placeholder = 'Select an option',
    required = false,
    className = '',
    ...props
}) {
    return (
        <div className={className}>
            {label && (
                <label className="block text-sm font-medium mb-1">
                    {label}
                    {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <select
                name={name}
                value={value}
                onChange={onChange}
                className={`w-full border p-2 rounded ${error ? 'border-red-500' : 'border-gray-300'}`}
                {...props}
            >
                <option value="">{placeholder}</option>
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            {error && <InputError message={error} />}
        </div>
    );
}



