import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";

export default function PreviewModal({
    isOpen,
    onClose,
    fileUrl,
    title = "Preview"
}) {
    if (!fileUrl) return null;

    const isPDF = fileUrl?.toLowerCase().endsWith(".pdf");

    // Handle close without propagating to parent
    const handleClose = (e) => {
        if (e) {
            e.stopPropagation();
        }
        onClose();
    };

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog
                as="div"
                className="relative z-[60]"
                onClose={handleClose}
                static
            >

                {/* Background Overlay */}
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div
                        className="fixed inset-0 bg-black/50"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleClose();
                        }}
                    />
                </Transition.Child>

                {/* Modal Panel */}
                <div
                    className="fixed inset-0 flex items-center justify-center p-4"
                    onClick={(e) => e.stopPropagation()}
                >
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0 scale-95"
                        enterTo="opacity-100 scale-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100 scale-100"
                        leaveTo="opacity-0 scale-95"
                    >
                        <Dialog.Panel
                            className="w-full max-w-5xl bg-white rounded-xl shadow-xl p-0 overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >

                            {/* Header */}
                            <div className="flex justify-between items-center px-4 py-3 border-b">
                                <Dialog.Title className="text-lg font-medium">
                                    {title}
                                </Dialog.Title>

                                <button
                                    onClick={handleClose}
                                    className="text-gray-600 hover:text-black transition-colors"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Content */}
                            <div className="w-full h-[80vh] bg-gray-50 flex items-center justify-center">
                                {isPDF ? (
                                    <embed
                                        src={fileUrl}
                                        type="application/pdf"
                                        className="w-full h-full"
                                    />
                                ) : (
                                    <img
                                        src={fileUrl}
                                        alt="Preview"
                                        className="max-h-full max-w-full object-contain"
                                    />
                                )}
                            </div>
                        </Dialog.Panel>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition>
    );
}