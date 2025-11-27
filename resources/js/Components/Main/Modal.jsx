import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";

export default function Modal({
    title,
    isOpen,
    onClose,
    children,
    onSave,
    size = "md",
    submitButtonText = "Save",
    submitSecond = "",
}) {
    const sizeClasses = {
        sm: "max-w-sm",
        md: "max-w-md",
        lg: "max-w-lg",
        xl: "max-w-xl",
        "2xl": "max-w-2xl",
        "3xl": "max-w-3xl",
        "4xl": "max-w-4xl",
        "5xl": "max-w-5xl",
        "6xl": "max-w-6xl",
        "7xl": "max-w-7xl",
    };

    // Prevent closing if a higher z-index modal is open
    const handleClose = () => {
        // Check if PreviewModal (z-60) is open by checking if there's a dialog with higher z-index
        const higherZIndexDialog = document.querySelector('.z-\\[60\\]');
        if (higherZIndexDialog) {
            return; // Don't close if PreviewModal is open
        }
        onClose();
    };

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={handleClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-200"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-150"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/30" />
                </Transition.Child>

                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-200"
                        enterFrom="opacity-0 scale-95"
                        enterTo="opacity-100 scale-100"
                        leave="ease-in duration-150"
                        leaveFrom="opacity-100 scale-100"
                        leaveTo="opacity-0 scale-95"
                    >
                        <Dialog.Panel
                            className={`w-full ${
                                sizeClasses[size] || sizeClasses.md
                            } bg-white p-6 shadow-xl rounded-lg`}
                        >
                            {/* Header */}
                            <div className="flex justify-between items-center border-b pb-2 mb-4">
                                <Dialog.Title className="text-lg font-semibold">
                                    {title}
                                </Dialog.Title>
                                <button
                                    onClick={onClose}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Scrollable Body */}
                            <div className="mb-4 max-h-[80vh] overflow-y-auto pr-2">
                                {children}
                            </div>

                            {/* Footer — uncomment if needed */}
                            {/* <div className="flex justify-end gap-2">
                                <button
                                    onClick={onClose}
                                    className="btn-sm border border-gray-300"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={onSave}
                                    className="btn-sm bg-blue-600 text-white hover:bg-blue-700"
                                >
                                    {submitButtonText}
                                </button>
                                {submitSecond && (
                                    <button
                                        onClick={onSave}
                                        className="btn-sm bg-blue-600 text-white hover:bg-blue-700"
                                    >
                                        {submitSecond}
                                    </button>
                                )}
                            </div> */}
                        </Dialog.Panel>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition>
    );
}