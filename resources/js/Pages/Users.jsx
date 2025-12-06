import React, { useState } from "react";
import AdminLayout from "@/Components/Layouts/AdminLayout";
import { Head, useForm, usePage, router } from "@inertiajs/react";
import Modal from "@/Components/Main/Modal";
import PrimaryButton from "@/Components/PrimaryButton";
import SecondaryButton from "@/Components/SecondaryButton";
import DangerButton from "@/Components/DangerButton";
import TextInput from "@/Components/TextInput";
import InputLabel from "@/Components/InputLabel";
import InputError from "@/Components/InputError";
import Checkbox from "@/Components/Checkbox";
import DataTable from "@/Components/Common/DataTable";
import DeleteConfirmation from "@/Components/Common/DeleteConfirmation";

export default function Users({ users, availableRoles, availablePermissions }) {
    const { auth } = usePage().props;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [openDeleteModal, setDeleteModalOpen] = useState(false);
    const [selectedID, setSelectedID] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [generatedPassword, setGeneratedPassword] = useState("");

    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm({
            name: "",
            email: "",
            password: "",
            password_confirmation: "",
            role: "FrontDesk",
            permissions: {},
            password_type: "auto", // 'auto' or 'custom'
            is_active: true,
        });

    const hasPermission = (module, feature) => {
        if (auth.user.role === "admin") return true;
        // Check if user has specific permission
        // The permissions prop is an array of strings "module.feature"
        return auth.user.permissions.includes(`${module}.${feature}`);
    };

    const generateSecurePassword = () => {
        const length = 12;
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
        let password = "";
        for (let i = 0; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        return password;
    };

    const userColumns = [
        {
            label: "Name",
            key: "name",
        },
        {
            label: "Email",
            key: "email",
        },
        {
            label: "Role",
            key: "role",
        },
        {
            label: "Status",
            key: "is_active",
            render: (user) => (
                <span
                    className={`badge ${
                        user.is_active ? "badge-success" : "badge-danger"
                    }`}
                >
                    {user.is_active ? "Active" : "Inactive"}
                </span>
            ),
        },
    ];

    const openModal = (user = null) => {
        clearErrors();
        if (user) {
            setEditingUser(user);
            // Transform user permissions array to object for checkbox state
            const userPerms = {};
            user.permissions.forEach((p) => {
                userPerms[p.id] = true; // or p.pivot.granted if we want to be specific, but here we assume presence means granted
            });

            setData({
                name: user.name,
                email: user.email,
                password: "",
                password_confirmation: "",
                role: user.role,
                permissions: userPerms,
                password_type: "auto",
                is_active: user.is_active !== undefined ? user.is_active : true,
            });
        } else {
            setEditingUser(null);
            setData({
                name: "",
                email: "",
                password: "",
                password_confirmation: "",
                role: "FrontDesk",
                permissions: {},
                password_type: "auto",
                is_active: true,
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setDeleteModalOpen(false);
        setIsModalOpen(false);
        setEditingUser(null);
        reset();
    };

    const handleClosePasswordModal = () => {
        setShowPasswordModal(false);
        setGeneratedPassword("");
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedPassword);
        alert("Password copied to clipboard!");
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Prepare data to submit
        let submitData = { ...data };
        let showPassword = false;
        
        // Generate password if auto-generate is selected
        if (data.password_type === "auto") {
            const passwordToUse = generateSecurePassword();
            submitData.password = passwordToUse;
            submitData.password_confirmation = passwordToUse;
            setGeneratedPassword(passwordToUse);
            showPassword = true;
        }

        if (editingUser) {
            router.put(route("admin.users.update", editingUser.id), submitData, {
                onSuccess: () => {
                    handleCloseModal();
                    if (showPassword) {
                        setShowPasswordModal(true);
                    }
                },
                onError: (errors) => {
                    console.log('Errors:', errors);
                },
            });
        } else {
            router.post(route("admin.users.store"), submitData, {
                onSuccess: () => {
                    handleCloseModal();
                    if (showPassword) {
                        setShowPasswordModal(true);
                    }
                },
                onError: (errors) => {
                    console.log('Errors:', errors);
                },
            });
        }
    };

    const handleConfirmDelete = () => {
        if (!selectedID) return;
        setLoading(true);
        router.delete(route("admin.users.destroy", selectedID), {
            preserveScroll: true,
            preserveState: false,
            onSuccess: () => {
                setLoading(false);
                handleCloseModal();
            },
            onError: () => {
                setLoading(false);
            },
        });
    };

    const handlePermissionChange = (permissionId, checked) => {
        setData("permissions", {
            ...data.permissions,
            [permissionId]: checked,
        });
    };

    const handleDeleteUser = (id) => {
        // Prevent deleting the currently authenticated user
        if (id === auth.user.id) return;
        setSelectedID(id);
        setDeleteModalOpen(true);
    };

    const handleEditTicket = (user) => {
        if (!hasPermission("users", "update")) return;
        openModal(user);
    };

    return (
        <AdminLayout user={auth.user}>
            <Head title="User Management" />

            <div className="row">
                <div className="col-lg-8 p-r-0 title-margin-right">
                    <div className="page-header">
                        <div className="page-title">
                            <h1>User Management</h1>
                        </div>
                    </div>
                </div>
                <div className="col-lg-4 p-l-0 title-margin-left">
                    <div className="page-header">
                        <div className="page-title">
                            <ol className="breadcrumb">
                                <li className="breadcrumb-item">
                                    <a href="#">Dashboard</a>
                                </li>
                                <li className="breadcrumb-item active">
                                    Users
                                </li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row">
                <div className="col-lg-12">
                    <div className="card">
                        <div className="card-title pr flex justify-between items-center">
                            <h4>All Users</h4>
                            {hasPermission("users", "create") && (
                                <button
                                    type="button"
                                    onClick={() => openModal()}
                                    className="btn btn-primary text-medium float-end"
                                >
                                    <i className="ti-plus"></i> Add User
                                </button>
                            )}
                        </div>
                        <div className="card-body">
                            <DataTable
                                columns={userColumns}
                                data={users}
                                pagination={null}
                                onEdit={hasPermission("users", "update") ? handleEditTicket : null}
                                onDelete={hasPermission("users", "delete") ? handleDeleteUser : null}
                                emptyMessage="No users found."
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Create/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingUser ? "Edit User" : "Add New User"}
                size="5xl"
            >
                <form onSubmit={handleSubmit} className="p-6">
                    <div className="grid grid-cols-1 gap-6">
                        <div>
                            <InputLabel htmlFor="name" value="Name" />
                            <TextInput
                                id="name"
                                type="text"
                                className="mt-1 block w-full"
                                value={data.name}
                                onChange={(e) =>
                                    setData("name", e.target.value)
                                }
                                required
                            />
                            <InputError
                                message={errors.name}
                                className="mt-2"
                            />
                        </div>

                        <div>
                            <InputLabel htmlFor="email" value="Email" />
                            <TextInput
                                id="email"
                                type="email"
                                className="mt-1 block w-full"
                                value={data.email}
                                onChange={(e) =>
                                    setData("email", e.target.value)
                                }
                                required
                            />
                            <InputError
                                message={errors.email}
                                className="mt-2"
                            />
                        </div>

                        <div>
                            <InputLabel htmlFor="role" value="Role" />
                            <select
                                id="role"
                                className="mt-1 block w-full border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm"
                                value={data.role}
                                onChange={(e) =>
                                    setData("role", e.target.value)
                                }
                            >
                                {availableRoles.map((role) => (
                                    <option key={role} value={role}>
                                        {role}
                                    </option>
                                ))}
                            </select>
                            <InputError
                                message={errors.role}
                                className="mt-2"
                            />
                        </div>

                        <div>
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <Checkbox
                                    checked={data.is_active}
                                    onChange={(e) =>
                                        setData("is_active", e.target.checked)
                                    }
                                />
                                <span className="text-sm font-medium text-gray-700">
                                    Active User
                                </span>
                            </label>
                            <p className="mt-1 text-xs text-gray-500">
                                Inactive users cannot log in to the system
                            </p>
                        </div>

                        <div>
                            <InputLabel
                                value={editingUser ? "Reset Password" : "Password"}
                            />
                            <div className="mt-2 space-y-3">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="password_type"
                                        value="auto"
                                        checked={data.password_type === "auto"}
                                        onChange={(e) => {
                                            setData("password_type", e.target.value);
                                            setData("password", "");
                                            setData("password_confirmation", "");
                                        }}
                                        className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm text-gray-700">
                                        Auto-generate secure password
                                    </span>
                                </label>

                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="password_type"
                                        value="custom"
                                        checked={data.password_type === "custom"}
                                        onChange={(e) =>
                                            setData("password_type", e.target.value)
                                        }
                                        className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm text-gray-700">
                                        Set custom password
                                    </span>
                                </label>

                                {data.password_type === "custom" && (
                                    <div className="ml-6 mt-3 space-y-4">
                                        <div>
                                            <InputLabel
                                                htmlFor="password"
                                                value="Password"
                                            />
                                            <TextInput
                                                id="password"
                                                type="password"
                                                className="mt-1 block w-full"
                                                value={data.password}
                                                onChange={(e) =>
                                                    setData("password", e.target.value)
                                                }
                                                required={data.password_type === "custom"}
                                            />
                                            <InputError
                                                message={errors.password}
                                                className="mt-2"
                                            />
                                        </div>

                                        <div>
                                            <InputLabel
                                                htmlFor="password_confirmation"
                                                value="Confirm Password"
                                            />
                                            <TextInput
                                                id="password_confirmation"
                                                type="password"
                                                className="mt-1 block w-full"
                                                value={data.password_confirmation}
                                                onChange={(e) =>
                                                    setData(
                                                        "password_confirmation",
                                                        e.target.value
                                                    )
                                                }
                                                required={data.password_type === "custom"}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                            <InputError
                                message={errors.password}
                                className="mt-2"
                            />
                        </div>

                        {/* Permissions Section */}
                        <div className="mt-4">
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                Permissions
                            </h3>
                            <div className="space-y-4">
                                {Object.entries(availablePermissions).map(
                                    ([module, permissions]) => (
                                        <div
                                            key={module}
                                            className="border rounded-md bg-gray-50"
                                        >
                                            <div className="flex items-center justify-between px-4 py-2 border-b bg-white rounded-t-md">
                                                <h4 className="font-semibold capitalize text-sm text-gray-800">
                                                    {module}
                                                </h4>
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                                    {permissions.length} option{permissions.length !== 1 ? "s" : ""}
                                                </span>
                                            </div>
                                            <div className="px-4 py-3">
                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                                                    {permissions.map((permission) => (
                                                        <label
                                                            key={permission.id}
                                                            htmlFor={`permission-${permission.id}`}
                                                            className="flex items-center space-x-2 rounded-md px-2 py-1 hover:bg-gray-100 cursor-pointer text-sm text-gray-700"
                                                        >
                                                            <Checkbox
                                                                id={`permission-${permission.id}`}
                                                                checked={
                                                                    data.permissions[
                                                                        permission.id
                                                                    ] || false
                                                                }
                                                                onChange={(e) =>
                                                                    handlePermissionChange(
                                                                        permission.id,
                                                                        e.target.checked
                                                                    )
                                                                }
                                                            />
                                                            <span>
                                                                {permission.label ||
                                                                    permission.feature}
                                                            </span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                        <SecondaryButton onClick={handleCloseModal} className="mr-3">
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton disabled={processing}>
                            {editingUser ? "Update User" : "Create User"}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                title={"Delete User"}
                isOpen={openDeleteModal}
                onClose={handleCloseModal}
                size="md"
                submitButtonText={null}
            >
                <DeleteConfirmation
                    label=" user"
                    loading={loading}
                    onSubmit={handleConfirmDelete}
                    onCancel={handleCloseModal}
                />
            </Modal>

            {/* Generated Password Display Modal */}
            <Modal
                title="Generated Password"
                isOpen={showPasswordModal}
                onClose={handleClosePasswordModal}
                size="md"
            >
                <div className="p-6">
                    <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-4">
                            The password has been auto-generated. Please copy and share it with the user securely.
                        </p>
                        <div className="bg-gray-50 border border-gray-300 rounded-md p-4">
                            <div className="flex items-center justify-between">
                                <code className="text-lg font-mono font-semibold text-gray-800">
                                    {generatedPassword}
                                </code>
                                <button
                                    type="button"
                                    onClick={copyToClipboard}
                                    className="ml-4 btn btn-sm btn-primary"
                                    title="Copy to clipboard"
                                >
                                    <i className="ti-clipboard"></i> Copy
                                </button>
                            </div>
                        </div>
                        <p className="text-xs text-red-600 mt-3">
                            ⚠️ Important: This password will only be shown once. Make sure to copy it now.
                        </p>
                    </div>
                    <div className="flex justify-end mt-6">
                        <PrimaryButton onClick={handleClosePasswordModal}>
                            I've Saved the Password
                        </PrimaryButton>
                    </div>
                </div>
            </Modal>
        </AdminLayout>
    );
}
