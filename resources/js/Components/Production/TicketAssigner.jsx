import React from 'react';

const TicketAssigner = ({ ticket, productionUsers, isProductionHead, isAdmin, canOnlyPrint = false, auth, onAssign }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [dropdownPosition, setDropdownPosition] = React.useState({ top: 0, left: 0, placement: 'bottom-left' });
    const [localAssignedIds, setLocalAssignedIds] = React.useState([]);

    // Support both single assigned_to_user and multiple assigned_users
    // Memoize to prevent infinite loop - only recalculate when ticket.assigned_users or ticket.assigned_to_user changes
    const assignedUsers = React.useMemo(() => {
        const users = ticket.assigned_users;
        let list = [];
        if ((!users || users.length === 0) && ticket.assigned_to_user) {
            list = [ticket.assigned_to_user];
        } else {
            list = users || [];
        }

        // Filter out designers from the Assigned Users list
        return list.filter(u => !u.role || (u.role.toLowerCase() !== 'designer'));
    }, [ticket.assigned_users, ticket.assigned_to_user]);

    // Initialize local state when dropdown opens
    React.useEffect(() => {
        if (isOpen) {
            setLocalAssignedIds(assignedUsers.map(u => u.id));
        }
    }, [isOpen, assignedUsers]);

    // Sync local state when assigned users change (from parent updates)
    // Only update if dropdown is closed to avoid conflicts with user interaction
    React.useEffect(() => {
        if (!isOpen) {
            setLocalAssignedIds(assignedUsers.map(u => u.id));
        }
    }, [assignedUsers, isOpen]);

    // Close dropdown when clicking outside
    const dropdownRef = React.useRef(null);
    const buttonRef = React.useRef(null);

    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Close dropdown on scroll and recalculate position on resize
    React.useEffect(() => {
        if (!isOpen) return;

        const handleScroll = () => {
            setIsOpen(false);
        };

        const handleResize = () => {
            if (buttonRef.current) {
                const buttonRect = buttonRef.current.getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                const viewportWidth = window.innerWidth;
                const dropdownWidth = 220;
                const dropdownHeight = 300;

                const spaceBelow = viewportHeight - buttonRect.bottom;
                const spaceAbove = buttonRect.top;
                const spaceRight = viewportWidth - buttonRect.right;

                let top = 0;
                let left = 0;

                if (spaceBelow >= dropdownHeight) {
                    top = buttonRect.bottom + 4;
                } else if (spaceAbove >= dropdownHeight) {
                    top = buttonRect.top - dropdownHeight - 4;
                } else {
                    top = spaceBelow > spaceAbove ? buttonRect.bottom + 4 : Math.max(10, buttonRect.top - Math.min(dropdownHeight, spaceAbove) - 4);
                }

                if (spaceRight >= dropdownWidth) {
                    left = buttonRect.right + 4;
                } else {
                    left = buttonRect.left - dropdownWidth - 4;
                }

                left = Math.max(10, Math.min(left, viewportWidth - dropdownWidth - 10));
                top = Math.max(10, Math.min(top, viewportHeight - 10));

                setDropdownPosition({ top, left, placement: 'bottom-right' });
            }
        };

        window.addEventListener('scroll', handleScroll, true);
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('resize', handleResize);
        };
    }, [isOpen]);

    // Calculate dropdown position when opening - use fixed positioning for better visibility
    React.useEffect(() => {
        if (isOpen && buttonRef.current) {
            const buttonRect = buttonRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;
            const dropdownWidth = 220;
            const dropdownHeight = 300; // max-height of dropdown

            const spaceBelow = viewportHeight - buttonRect.bottom;
            const spaceAbove = buttonRect.top;
            const spaceRight = viewportWidth - buttonRect.right;
            const spaceLeft = buttonRect.left;

            let top = 0;
            let left = 0;
            let placement = 'bottom-right';

            // Determine vertical placement
            if (spaceBelow >= dropdownHeight) {
                // Enough space below - show below
                top = buttonRect.bottom + 4; // 4px gap
                placement = spaceRight >= dropdownWidth ? 'bottom-right' : 'bottom-left';
            } else if (spaceAbove >= dropdownHeight) {
                // Not enough space below, but enough above - show above
                top = buttonRect.top - dropdownHeight - 4; // 4px gap
                placement = spaceRight >= dropdownWidth ? 'top-right' : 'top-left';
            } else {
                // Not enough space either way - use available space and make scrollable
                if (spaceBelow > spaceAbove) {
                    top = buttonRect.bottom + 4;
                    placement = spaceRight >= dropdownWidth ? 'bottom-right' : 'bottom-left';
                } else {
                    top = Math.max(10, buttonRect.top - Math.min(dropdownHeight, spaceAbove) - 4);
                    placement = spaceRight >= dropdownWidth ? 'top-right' : 'top-left';
                }
            }

            // Determine horizontal placement
            if (placement.includes('right')) {
                // Position to the right of button
                if (spaceRight >= dropdownWidth) {
                    left = buttonRect.right + 4; // 4px gap to the right
                } else {
                    // Not enough space on right, position to the left
                    left = buttonRect.left - dropdownWidth - 4; // 4px gap to the left
                }
            } else {
                // Position to the left of button
                if (spaceLeft >= dropdownWidth) {
                    left = buttonRect.left - dropdownWidth - 4; // 4px gap to the left
                } else {
                    // Not enough space on left, position to the right
                    left = buttonRect.right + 4; // 4px gap to the right
                }
            }

            // Ensure dropdown doesn't go off-screen
            left = Math.max(10, Math.min(left, viewportWidth - dropdownWidth - 10));
            top = Math.max(10, Math.min(top, viewportHeight - 10));

            setDropdownPosition({ top, left, placement });
        }
    }, [isOpen]);

    // Verify user quantity for current step
    const getUserQuantity = (userId) => {
        if (!ticket.production_records) return 0;
        const currentStep = ticket.current_workflow_step;
        return ticket.production_records
            .filter(r => r.user_id === userId && r.workflow_step === currentStep)
            .reduce((sum, r) => sum + (r.quantity_produced || 0), 0);
    };

    // Allow can_only_print users to assign only for printing workflow step - DISABLED as per new requirement
    // const isPrintingWorkflow = ticket.current_workflow_step === 'printing' || ticket.status === 'ready_to_print';
    // const canEditByCanOnlyPrint = canOnlyPrint && isPrintingWorkflow && (ticket.status === 'in_production' || ticket.status === 'ready_to_print');

    // Only Head/Admin can assign users
    const canEdit = (isProductionHead || isAdmin) && (ticket.status === 'in_production' || ticket.status === 'ready_to_print');

    // Handle checkbox change using local state to avoid race conditions
    const handleCheckboxChange = (user, checked) => {
        const newIds = checked
            ? [...localAssignedIds, user.id]
            : localAssignedIds.filter(id => id !== user.id);

        setLocalAssignedIds(newIds);
        // Pass current workflow step as third argument for callers that expect it (e.g. AllTickets)
        // Callers that only accept (ticket, userIds) will simply ignore the extra argument.
        onAssign(ticket, newIds, ticket.current_workflow_step || null);
    };

    return (
        <div className="position-relative" ref={dropdownRef}>
            {canEdit && (
                <div className="mb-2">
                    <button
                        ref={buttonRef}
                        className="btn btn-outline-secondary btn-sm btn-block text-left d-flex justify-content-between align-items-center"
                        onClick={() => setIsOpen(!isOpen)}
                        type="button"
                    >
                        <span>Assign Users</span>
                        <i className={`ti-angle-${isOpen ? 'up' : 'down'}`}></i>
                    </button>

                    {isOpen && (
                        <div
                            className="card shadow-lg p-2"
                            style={{
                                position: 'fixed',
                                zIndex: 9999,
                                width: '220px',
                                top: `${dropdownPosition.top}px`,
                                left: `${dropdownPosition.left}px`,
                                maxHeight: '300px',
                                overflowY: 'auto',
                                backgroundColor: 'white',
                                border: '1px solid #dee2e6',
                                borderRadius: '0.25rem'
                            }}
                        >
                            <div className="text-muted small mb-2 p-1 border-bottom">Select users to assign</div>
                            {productionUsers
                                .filter(u => !u.role || (u.role.toLowerCase() !== 'designer'))
                                .map(user => (
                                    <div key={user.id} className="custom-control custom-checkbox mb-2">
                                        <input
                                            type="checkbox"
                                            className="custom-control-input"
                                            id={`assign-${ticket.id}-${user.id}`}
                                            checked={localAssignedIds.includes(user.id)}
                                            onChange={(e) => handleCheckboxChange(user, e.target.checked)}
                                        />
                                        <label className="custom-control-label w-100 cursor-pointer" htmlFor={`assign-${ticket.id}-${user.id}`}>
                                            {user.name}
                                        </label>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>
            )}

            <div className="assigned-users-list">
                {assignedUsers.length > 0 ? (
                    <div className="d-flex flex-column gap-1">
                        {assignedUsers.map((user, idx) => {
                            const isAssignedToMe = user.id === auth?.user?.id;
                            const qty = getUserQuantity(user.id);

                            return (
                                <div key={user.id || idx} className={`d-flex justify-content-between align-items-center rounded p-1 mb-1 border ${isAssignedToMe ? 'bg-blue-50 border-blue-200' : 'bg-light'}`} style={{ fontSize: '0.85rem' }}>
                                    <span className="text-truncate mr-2" style={{ maxWidth: '120px' }} title={user.name}>
                                        <i className={`ti-user mr-1 ${isAssignedToMe ? 'text-primary' : 'text-muted'}`}></i>
                                        <span className={isAssignedToMe ? 'font-weight-bold text-primary' : ''}>{user.name}</span>
                                    </span>
                                    <span className={`badge ${qty > 0 ? 'badge-success' : 'badge-secondary'} badge-pill`} title="Quantity Produced">
                                        {qty}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <span className="text-muted small">Unassigned</span>
                )}
            </div>
        </div>
    );
};

export default TicketAssigner;