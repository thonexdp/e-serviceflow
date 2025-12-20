import React from 'react';

const TicketAssigner = ({ ticket, productionUsers, isProductionHead, isAdmin, auth, onAssign }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [dropdownPosition, setDropdownPosition] = React.useState('bottom');
    const [localAssignedIds, setLocalAssignedIds] = React.useState([]);

    // Support both single assigned_to_user and multiple assigned_users
    // Memoize to prevent infinite loop - only recalculate when ticket.assigned_users or ticket.assigned_to_user changes
    const assignedUsers = React.useMemo(() => {
        const users = ticket.assigned_users;
        if ((!users || users.length === 0) && ticket.assigned_to_user) {
            return [ticket.assigned_to_user];
        }
        return users || [];
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

    // Calculate dropdown position when opening
    React.useEffect(() => {
        if (isOpen && buttonRef.current) {
            const buttonRect = buttonRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const spaceBelow = viewportHeight - buttonRect.bottom;
            const spaceAbove = buttonRect.top;
            const dropdownHeight = 300; // max-height of dropdown

            // Show above if not enough space below and more space above
            if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
                setDropdownPosition('top');
            } else {
                setDropdownPosition('bottom');
            }
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
                            className="card shadow-lg p-2 position-absolute"
                            style={{
                                zIndex: 1000,
                                width: '220px',
                                left: 0,
                                [dropdownPosition === 'top' ? 'bottom' : 'top']: '100%',
                                maxHeight: '300px',
                                overflowY: 'auto'
                            }}
                        >
                            <div className="text-muted small mb-2 p-1 border-bottom">Select users to assign</div>
                            {productionUsers.map(user => (
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