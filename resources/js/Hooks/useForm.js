// Hooks/useForm.js
import { useState } from "react";
import { router } from "@inertiajs/react";

export default function useForm(initialValues = {}) {
    const [data, setData] = useState(initialValues);
    const [errors, setErrors] = useState({});
    const [processing, setProcessing] = useState(false);

    const setField = (field, value) => {
        setData((prev) => ({ ...prev, [field]: value }));
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const handleChange = (e) => {
        const { name, value, type, files } = e.target;
        if (type === "file") {
            setField(name, files[0]);
        } else {
            setField(name, value);
        }
    };

    const reset = () => {
        setData(initialValues);
        setErrors({});
    };

    const submit = (method, url, options = {}) => {
        setProcessing(true);

        const submitOptions = {
            ...options,
            onSuccess: (page) => {
                setErrors({});
                setProcessing(false);
                if (options.onSuccess) options.onSuccess(page);
            },
            onError: (errors) => {
                setErrors(errors);
                setProcessing(false);
                if (options.onError) options.onError(errors);
            },
            onFinish: () => {
                setProcessing(false);
                if (options.onFinish) options.onFinish();
            },
        };

        if (method === "post") {
            router.post(url, data, submitOptions);
        } else if (method === "put") {
            router.put(url, data, submitOptions);
        } else if (method === "delete") {
            router.delete(url, submitOptions);
        }
    };

    const post = (url, options) => submit("post", url, options);
    const put = (url, options) => submit("put", url, options);
    const del = (url, options) => submit("delete", url, options);

    return {
        data,
        setData,
        errors,
        setErrors,
        processing,
        setField,
        handleChange,
        reset,
        post,
        put,
        delete: del,
    };
}






















