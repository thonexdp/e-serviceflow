import React from 'react';
import InputError from '@/Components/InputError';

export default function FormInput({
    label,
    name,
    type = 'text',
    value,
    onChange,
    error,
    placeholder,
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
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className={`w-full border p-2 rounded ${error ? 'border-red-500' : 'border-gray-300'}`}
                {...props}
            />
            {error && <InputError message={error} />}
        </div>
    );
}






