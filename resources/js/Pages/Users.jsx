import React, { useState } from 'react';
import AdminLayout from '@/Components/Layouts/AdminLayout';
import { Head, useForm, usePage, router } from '@inertiajs/react';
import Modal from '@/Components/Main/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import DangerButton from '@/Components/DangerButton';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';
import Checkbox from '@/Components/Checkbox';

export default function Users({ users, availableRoles, availablePermissions }) {
    const { auth } = usePage().props;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [userToDelete, setUserToDelete] = useState(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        role: 'FrontDesk',
        permissions: {},
    });

    const hasPermission = (module, feature) => {
        if (auth.user.role === 'admin') return true;
        // Check if user has specific permission
        // The permissions prop is an array of strings "module.feature"
        return auth.user.permissions.includes(`${module}.${feature}`);
    };

    const openModal = (user = null) => {
        clearErrors();
        if (user) {
            setEditingUser(user);
            // Transform user permissions array to object for checkbox state
            const userPerms = {};
            user.permissions.forEach(p => {
                userPerms[p.id] = true; // or p.pivot.granted if we want to be specific, but here we assume presence means granted
            });

            setData({
                name: user.name,
                email: user.email,
                password: '',
                password_confirmation: '',
                role: user.role,
                permissions: userPerms,
            });
        } else {
            setEditingUser(null);
            setData({
                name: '',
                email: '',
                password: '',
                password_confirmation: '',
                role: 'FrontDesk',
                permissions: {},
            });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
        reset();
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editingUser) {
            put(route('admin.users.update', editingUser.id), {
                onSuccess: () => closeModal(),
            });
        } else {
            post(route('admin.users.store'), {
                onSuccess: () => closeModal(),
            });
        }
    };

    const openDeleteModal = (user) => {
        setUserToDelete(user);
        setIsDeleteModalOpen(true);
    };

    const closeDeleteModal = () => {
        setIsDeleteModalOpen(false);
        setUserToDelete(null);
    };

    const handleDelete = () => {
        if (userToDelete) {
            router.delete(route('admin.users.destroy', userToDelete.id), {
                onSuccess: () => closeDeleteModal(),
            });
        }
    };

    const handlePermissionChange = (permissionId, checked) => {
        setData('permissions', {
            ...data.permissions,
            [permissionId]: checked,
        });
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
                                <li className="breadcrumb-item active">Users</li>
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
                            {hasPermission('users', 'create') && (
                                <PrimaryButton onClick={() => openModal()}>
                                    <i className="ti-plus"></i> Add User
                                </PrimaryButton>
                            )}
                        </div>
                        <div className="card-body">
                            <div className="table-responsive">
                                <table className="table student-data-table m-t-20">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Email</th>
                                            <th>Role</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map((user) => (
                                            <tr key={user.id}>
                                                <td>{user.name}</td>
                                                <td>{user.email}</td>
                                                <td>
                                                    <span className={`badge badge-${user.role === 'admin' ? 'danger' : 'primary'}`}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td>
                                                    {hasPermission('users', 'update') && (
                                                        <button
                                                            className="btn btn-primary btn-sm m-r-5"
                                                            onClick={() => openModal(user)}
                                                        >
                                                            <i className="ti-pencil"></i>
                                                        </button>
                                                    )}
                                                    {hasPermission('users', 'delete') && user.id !== auth.user.id && (
                                                        <button
                                                            className="btn btn-danger btn-sm"
                                                            onClick={() => openDeleteModal(user)}
                                                        >
                                                            <i className="ti-trash"></i>
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Create/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={editingUser ? 'Edit User' : 'Add New User'}
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
                                onChange={(e) => setData('name', e.target.value)}
                                required
                            />
                            <InputError message={errors.name} className="mt-2" />
                        </div>

                        <div>
                            <InputLabel htmlFor="email" value="Email" />
                            <TextInput
                                id="email"
                                type="email"
                                className="mt-1 block w-full"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                required
                            />
                            <InputError message={errors.email} className="mt-2" />
                        </div>

                        <div>
                            <InputLabel htmlFor="role" value="Role" />
                            <select
                                id="role"
                                className="mt-1 block w-full border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm"
                                value={data.role}
                                onChange={(e) => setData('role', e.target.value)}
                            >
                                {availableRoles.map((role) => (
                                    <option key={role} value={role}>
                                        {role}
                                    </option>
                                ))}
                            </select>
                            <InputError message={errors.role} className="mt-2" />
                        </div>

                        <div>
                            <InputLabel htmlFor="password" value={editingUser ? "Password (leave blank to keep current)" : "Password"} />
                            <TextInput
                                id="password"
                                type="password"
                                className="mt-1 block w-full"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                required={!editingUser}
                            />
                            <InputError message={errors.password} className="mt-2" />
                        </div>

                        <div>
                            <InputLabel htmlFor="password_confirmation" value="Confirm Password" />
                            <TextInput
                                id="password_confirmation"
                                type="password"
                                className="mt-1 block w-full"
                                value={data.password_confirmation}
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                required={!editingUser}
                            />
                        </div>

                        {/* Permissions Section */}
                        <div className="mt-4">
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Permissions</h3>
                            <div className="space-y-4">
                                {Object.entries(availablePermissions).map(([module, permissions]) => (
                                    <div key={module} className="border p-4 rounded-md">
                                        <h4 className="font-semibold capitalize mb-2">{module}</h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            {permissions.map((permission) => (
                                                <div key={permission.id} className="flex items-center">
                                                    <Checkbox
                                                        id={`permission-${permission.id}`}
                                                        checked={data.permissions[permission.id] || false}
                                                        onChange={(e) => handlePermissionChange(permission.id, e.target.checked)}
                                                    />
                                                    <label htmlFor={`permission-${permission.id}`} className="ml-2 text-sm text-gray-600">
                                                        {permission.label || permission.feature}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                        <SecondaryButton onClick={closeModal} className="mr-3">
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton disabled={processing}>
                            {editingUser ? 'Update User' : 'Create User'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={closeDeleteModal}
                title="Delete User"
                size="sm"
            >
                <div className="p-6">
                    <p className="text-gray-600">
                        Are you sure you want to delete this user? This action cannot be undone.
                    </p>
                    <div className="mt-6 flex justify-end">
                        <SecondaryButton onClick={closeDeleteModal} className="mr-3">
                            Cancel
                        </SecondaryButton>
                        <DangerButton onClick={handleDelete}>
                            Delete User
                        </DangerButton>
                    </div>
                </div>
            </Modal>
        </AdminLayout>
    );
}
