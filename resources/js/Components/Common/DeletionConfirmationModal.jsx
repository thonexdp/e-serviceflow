import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import axios from 'axios';

/**
 * DeletionConfirmationModal Component
 * 
 * A comprehensive modal for confirming deletions with cascading dependency checks
 * 
 * @param {boolean} isOpen - Whether the modal is open
 * @param {function} onClose - Function to close the modal
 * @param {function} onConfirm - Function to call when deletion is confirmed
 * @param {string} itemType - Type of item being deleted (e.g., 'ticket', 'customer', 'job-type')
 * @param {object} item - The item being deleted
 * @param {string} checkUrl - URL to check deletion dependencies
 * @param {string} title - Modal title (optional)
 */
export default function DeletionConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    itemType,
    item,
    checkUrl,
    title = 'Confirm Deletion',
}) {
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(false);
    const [deletionCheck, setDeletionCheck] = useState(null);
    const [error, setError] = useState(null);
    const [confirmText, setConfirmText] = useState('');

    // Check deletion dependencies when modal opens
    useEffect(() => {
        if (isOpen && checkUrl) {
            checkDeletionDependencies();
        } else if (!isOpen) {
            // Reset state when modal closes
            setDeletionCheck(null);
            setError(null);
            setConfirmText('');
        }
    }, [isOpen, checkUrl]);

    const checkDeletionDependencies = async () => {
        setChecking(true);
        setError(null);

        try {
            const response = await axios.get(checkUrl);
            setDeletionCheck(response.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to check deletion dependencies');
            console.error('Deletion check error:', err);
        } finally {
            setChecking(false);
        }
    };

    const handleConfirm = async () => {
        if (!deletionCheck?.can_delete) {
            return;
        }

        setLoading(true);
        try {
            await onConfirm();
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete item');
        } finally {
            setLoading(false);
        }
    };

    const getItemDisplayName = () => {
        if (!item) return 'this item';

        switch (itemType) {
            case 'ticket':
                return `Ticket #${item.ticket_number}`;
            case 'customer':
                return `${item.firstname} ${item.lastname}`;
            case 'job-type':
                return item.name;
            case 'branch':
                return item.name;
            case 'stock-item':
                return item.name;
            default:
                return 'this item';
        }
    };

    const renderDependencySection = (title, data) => {
        if (!data || !data.message) return null;

        return (
            <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="font-semibold text-sm text-gray-700 mb-1">{title}</h4>
                <p className="text-sm text-gray-600">{data.message}</p>
                {data.count !== undefined && (
                    <p className="text-xs text-gray-500 mt-1">Total: {data.count}</p>
                )}
            </div>
        );
    };

    const renderWarnings = () => {
        if (!deletionCheck?.warnings || deletionCheck.warnings.length === 0) {
            return null;
        }

        return (
            <div className="mb-4">
                <h3 className="text-sm font-semibold text-yellow-800 mb-2 flex items-center">
                    <i className="ti-alert mr-2"></i>
                    Warnings
                </h3>
                <ul className="space-y-2">
                    {deletionCheck.warnings.map((warning, index) => (
                        <li key={index} className="text-sm text-yellow-700 bg-yellow-50 p-2 rounded border border-yellow-200">
                            {warning}
                        </li>
                    ))}
                </ul>
            </div>
        );
    };

    const renderDependencies = () => {
        if (!deletionCheck?.dependencies) return null;

        const deps = deletionCheck.dependencies;
        const sections = [];

        // Render different sections based on item type
        if (itemType === 'ticket') {
            sections.push(
                renderDependencySection('Status', deps.status),
                renderDependencySection('Payments', deps.payments),
                renderDependencySection('Files', deps.files),
                renderDependencySection('Production', deps.production)
            );
        } else if (itemType === 'customer') {
            sections.push(
                renderDependencySection('Tickets', deps.tickets),
                renderDependencySection('Payments', deps.payments)
            );
        } else if (itemType === 'job-type') {
            sections.push(
                renderDependencySection('Tickets', deps.tickets),
                renderDependencySection('Stock Requirements', deps.stock_requirements),
                renderDependencySection('Price Tiers', deps.price_tiers),
                renderDependencySection('Size Rates', deps.size_rates),
                renderDependencySection('Promo Rules', deps.promo_rules)
            );
        } else if (itemType === 'branch') {
            sections.push(
                renderDependencySection('Users', deps.users),
                renderDependencySection('Ordered Tickets', deps.ordered_tickets),
                renderDependencySection('Production Tickets', deps.production_tickets)
            );
        } else if (itemType === 'stock-item') {
            sections.push(
                renderDependencySection('Stock Movements', deps.movements),
                renderDependencySection('Production Consumptions', deps.consumptions),
                renderDependencySection('Purchase Orders', deps.purchase_orders),
                renderDependencySection('Job Types', deps.job_types)
            );
        }

        return (
            <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Related Data</h3>
                <div className="space-y-2">
                    {sections.filter(Boolean).map((section, index) => (
                        <div key={`section-${index}`}>{section}</div>
                    ))}
                </div>
            </div>
        );
    };

    const canConfirmDeletion = () => {
        if (!deletionCheck) return false;
        if (!deletionCheck.can_delete) return false;
        
        // For items with dependencies, require confirmation text
        if (deletionCheck.dependencies?.total_count > 0) {
            return confirmText.toLowerCase() === 'delete';
        }
        
        return true;
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-25" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                {/* Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                                            <i className="ti-alert text-red-600 text-3xl"></i>
                                        </div>
                                        <Dialog.Title
                                            as="h3"
                                            className="ml-4 text-lg font-medium leading-6 text-gray-900"
                                        >
                                            {title}
                                        </Dialog.Title>
                                    </div>
                                    <button
                                        type="button"
                                        className="text-gray-400 hover:text-gray-500"
                                        onClick={onClose}
                                    >
                                        <i className="ti-close text-gray-400 hover:text-gray-500 text-3xl"></i>
                                    </button>
                                </div>

                                {/* Content */}
                                <div className="mt-4">
                                    {checking ? (
                                        <div className="flex items-center justify-center py-8">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                            <span className="ml-3 text-gray-600">Checking dependencies...</span>
                                        </div>
                                    ) : error ? (
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                            <p className="text-sm text-red-800">{error}</p>
                                        </div>
                                    ) : deletionCheck ? (
                                        <>
                                            <p className="text-sm text-gray-600 mb-4">
                                                You are about to delete <strong>{getItemDisplayName()}</strong>.
                                            </p>

                                            {!deletionCheck.can_delete ? (
                                                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                                                    <p className="text-sm font-semibold text-red-800 mb-2">
                                                        Cannot Delete
                                                    </p>
                                                    <p className="text-sm text-red-700">
                                                        This item cannot be deleted because it has active dependencies or is currently in use.
                                                    </p>
                                                </div>
                                            ) : deletionCheck.dependencies?.total_count > 0 ? (
                                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                                                    <p className="text-sm font-semibold text-yellow-800 mb-2">
                                                        Warning: This item has related data
                                                    </p>
                                                    <p className="text-sm text-yellow-700">
                                                        Deleting this item will also affect the related data listed below. This action cannot be undone.
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                                                    <p className="text-sm text-green-700">
                                                        This item has no dependencies and can be safely deleted.
                                                    </p>
                                                </div>
                                            )}

                                            {renderWarnings()}
                                            {renderDependencies()}

                                            {deletionCheck.can_delete && deletionCheck.dependencies?.total_count > 0 && (
                                                <div className="mb-4">
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Type <strong>DELETE</strong> to confirm
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={confirmText}
                                                        onChange={(e) => setConfirmText(e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                                                        placeholder="Type DELETE"
                                                    />
                                                </div>
                                            )}
                                        </>
                                    ) : null}
                                </div>

                                {/* Footer */}
                                <div className="mt-6 flex justify-end space-x-3">
                                    <button
                                        type="button"
                                        className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                        onClick={onClose}
                                        disabled={loading}
                                    >
                                        Cancel
                                    </button>
                                    {deletionCheck?.can_delete && (
                                        <button
                                            type="button"
                                            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                            onClick={handleConfirm}
                                            disabled={loading || !canConfirmDeletion()}
                                        >
                                            {loading ? (
                                                <>
                                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Deleting...
                                                </>
                                            ) : (
                                                'Delete'
                                            )}
                                        </button>
                                    )}
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}

