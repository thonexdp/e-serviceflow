import React, { useRef } from 'react';
import InputError from '@/Components/InputError';

export default function FileUpload({
    label,
    name,
    onChange,
    error,
    accept = 'image/*,application/pdf',
    multiple = false,
    maxSize = 10, // MB
    className = '',
}) {
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        
        // Validate file sizes
        const validFiles = files.filter(file => {
            const fileSizeMB = file.size / (1024 * 1024);
            return fileSizeMB <= maxSize;
        });

        if (validFiles.length !== files.length) {
            alert(`Some files exceed the maximum size of ${maxSize}MB`);
        }

        onChange(validFiles);
    };

    return (
        <div className={className}>
            {label && (
                <label className="block text-sm font-medium mb-2">
                    {label}
                </label>
            )}
            <div className="flex items-center justify-center w-full">
                <label
                    htmlFor={name}
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg
                            className="w-8 h-8 mb-3 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                        </svg>
                        <p className="mb-2 text-sm text-gray-500">
                            <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">
                            PNG, JPG, PDF up to {maxSize}MB
                        </p>
                    </div>
                    <input
                        ref={fileInputRef}
                        id={name}
                        name={name}
                        type="file"
                        className="hidden"
                        accept={accept}
                        multiple={multiple}
                        onChange={handleFileChange}
                    />
                </label>
            </div>
            {error && <InputError message={error} />}
        </div>
    );
}
























