import React from 'react';
import InputError from '@/Components/InputError';

export default function FormTextarea({
    label,
    name,
    value,
    onChange,
    error,
    placeholder,
    required = false,
    rows = 3,
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
            <textarea
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                rows={rows}
                className={`w-full border p-2 rounded ${error ? 'border-red-500' : 'border-gray-300'}`}
                {...props}
            />
            {error && <InputError message={error} />}
        </div>
    );
}




















