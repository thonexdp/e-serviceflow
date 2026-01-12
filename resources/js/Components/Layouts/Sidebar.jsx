import React, { useState } from "react";
import { Link, usePage } from "@inertiajs/react";

export default function Sidebar({ isCollapsed }) {
    const { props, url } = usePage();
    const { auth } = props;
    const [isProductionWorkflowOpen, setIsProductionWorkflowOpen] = useState(false);

    const isActive = (path) => {
        const currentPath = url.split('?')[0];
        if (path.endsWith('/') && path.length > 1) {
            return currentPath === path;
        }
        return currentPath.startsWith(path);
    };

    const hasPermission = (module, feature) => {
        if (auth.user.role === 'admin') return true;
        return auth.user.permissions && auth.user.permissions.includes(`${module}.${feature}`);
    };

    const sidebarClasses = [
        "sidebar",
        "sidebar-hide-to-small",
        "sidebar-shrink",
        "sidebar-gestures",
        isCollapsed ? "sidebar-hide" : ""].

        filter(Boolean).
        join(" ");






    const role = auth?.user?.role;
    const userBranch = auth?.user?.branch;
    const canAcceptOrders = userBranch?.can_accept_orders ?? true;
    const canProduce = userBranch?.can_produce ?? true;

    if (!role) {
        return null;
    }
    return (
        <div className={sidebarClasses}>
            <div className="nano">
                <div className="nano-content">
                    <div className="logo flex flex-col items-center py-4">
                        <Link href="/" className="flex flex-col items-center">
                            <img
                                src="/images/logo.jpg"
                                alt="RC PrintShoppe Logo"
                                className="w-16 h-16 object-contain mb-2 rounded-full" />


                            <span className="text-lg font-semibold">
                                RC PrintShoppe
                            </span>
                        </Link>
                    </div>

                    {role === "FrontDesk" ?
                        <ul>
                            <li className="label">Main Menu</li>
                            <li className={isActive("/frontdesk/") ? "active" : ""}>
                                <Link href="/frontdesk/">
                                    <i className="ti-calendar"></i> Dashboard
                                </Link>
                            </li>
                            {canAcceptOrders &&
                                <>
                                    <li className={isActive("/frontdesk/tickets") ? "active" : ""}>
                                        <Link href="/frontdesk/tickets">
                                            <i className="ti-email"></i> Tickets
                                        </Link>
                                    </li>
                                    <li className={isActive("/frontdesk/customers") ? "active" : ""}>
                                        <Link href="/frontdesk/customers">
                                            <i className="ti-user"></i> Customers
                                        </Link>
                                    </li>
                                    {hasPermission('delivery', 'print') && (
                                        <li className={isActive("/delivery-receipts") ? "active" : ""}>
                                            <Link href="/delivery-receipts">
                                                <i className="ti-printer"></i> Delivery Receipts
                                            </Link>
                                        </li>
                                    )}
                                </>
                            }

                            {(hasPermission('finance', 'read') || isActive("/frontdesk/finance")) && (
                                <>
                                    <li className="label">Financials</li>
                                    <li className={isActive("/frontdesk/finance") ? "active" : ""}>
                                        <Link href="/frontdesk/finance">
                                            <i className="ti-credit-card"></i> Payments & Finance
                                        </Link>
                                    </li>
                                </>
                            )}

                            <li className="label">Resources</li>
                            {
                                hasPermission('inventory', 'read') && (
                                    <li className={isActive("/frontdesk/inventory") ? "active" : ""}>
                                        <Link href="/frontdesk/inventory">
                                            <i className="ti-package"></i> Inventory
                                        </Link>
                                    </li>
                                )
                            }
                            {
                                hasPermission('purchase_orders', 'read') && (
                                    <li className={isActive("/frontdesk/purchase-orders") ? "active" : ""}>
                                        <Link href="/frontdesk/purchase-orders">
                                            <i className="ti-shopping-cart"></i>{" "}
                                            Purchase Orders
                                        </Link>
                                    </li>)
                            }
                        </ul> :
                        role === "Designer" ?
                            <ul>
                                <li className="label">Main Menu</li>
                                <li className={isActive("/designer/") ? "active" : ""}>
                                    <Link href="/designer/">
                                        <i className="ti-calendar"></i> Dashboard
                                    </Link>
                                </li>
                                {hasPermission('delivery', 'print') && (
                                    <li className={isActive("/delivery-receipts") ? "active" : ""}>
                                        <Link href="/delivery-receipts">
                                            <i className="ti-printer"></i> Delivery Receipts
                                        </Link>
                                    </li>
                                )}
                                <li className={isActive("/designer/mock-ups") ? "active" : ""}>
                                    <Link href="/designer/mock-ups">
                                        <i className="ti-user"></i> Mock-Ups
                                    </Link>
                                </li>
                            </ul> :
                            role === "Production" ?
                                <ul>
                                    <li className="label">Main Menu</li>
                                    <li className={isActive("/production/") ? "active" : ""}>
                                        <Link href="/production/">
                                            <i className="ti-calendar"></i> Dashboard
                                        </Link>
                                    </li>

                                    {/* Production Workflow Submenu - Only show if branch can produce */}
                                    {canProduce && (() => {

                                        const userWorkflowSteps = auth?.user?.workflow_steps || [];
                                        const isProductionHead = auth?.user?.is_head || false;
                                        const canOnlyPrint = auth?.user?.can_only_print || false;



                                        if (canOnlyPrint) {
                                            return (
                                                <>
                                                    <li className="label">Production Workflow</li>
                                                    <li className={isActive("/production/workflow/printing") ? "active" : ""}>
                                                        <Link href="/production/workflow/printing">
                                                            <i className="ti-printer"></i> Printing
                                                        </Link>
                                                    </li>
                                                </>);

                                        }


                                        const workflowSteps = [
                                            { key: 'printing', path: '/production/workflow/printing', icon: 'ti-printer', label: 'Printing' },
                                            { key: 'lamination_heatpress', path: '/production/workflow/lamination_heatpress', icon: 'ti-layers', label: 'Heatpress / Lamination' },
                                            { key: 'cutting', path: '/production/workflow/cutting', icon: 'ti-cut', label: 'Cutting' },
                                            { key: 'sewing', path: '/production/workflow/sewing', icon: 'ti-pin-alt', label: 'Sewing' },
                                            { key: 'dtf_press', path: '/production/workflow/dtf_press', icon: 'ti-stamp', label: 'DTF Press' },
                                            { key: 'embroidery', path: '/production/workflow/embroidery', icon: 'ti-pencil-alt', label: 'Embroidery' },
                                            { key: 'knitting', path: '/production/workflow/knitting', icon: 'ti-layout-grid2', label: 'Knitting' },
                                            { key: 'lasser_cutting', path: '/production/workflow/lasser_cutting', icon: 'ti-bolt', label: 'Laser Cutting' },
                                            { key: 'qa', path: '/production/workflow/qa', icon: 'ti-check-box', label: 'Quality Assurance' }];



                                        const visibleWorkflowSteps = workflowSteps.filter((step) => userWorkflowSteps.includes(step.key));

                                        return (
                                            <>
                                                {(visibleWorkflowSteps.length > 0 || isProductionHead) &&
                                                    <li className="label">Production Workflow</li>
                                                }

                                                {isProductionHead &&
                                                    <li className={isActive("/production/tickets/all") ? "active" : ""}>
                                                        <Link href="/production/tickets/all">
                                                            <i className="ti-layout-grid2"></i> All Tickets
                                                        </Link>
                                                    </li>
                                                }

                                                {visibleWorkflowSteps.map((step) =>
                                                    <li key={step.key} className={isActive(step.path) ? "active" : ""}>
                                                        <Link href={step.path}>
                                                            <i className={step.icon}></i> {step.label}
                                                        </Link>
                                                    </li>
                                                )}

                                                {visibleWorkflowSteps.length > 0 &&
                                                    <>
                                                        <li className={isActive("/production/completed") ? "active" : ""}>
                                                            <Link href="/production/completed">
                                                                <i className="ti-check"></i> Completed
                                                            </Link>
                                                        </li>

                                                        <li className={isActive("/production/reports") ? "active" : ""}>
                                                            <Link href="/production/reports">
                                                                <i className="ti-stats-up"></i> Reports
                                                            </Link>
                                                        </li>
                                                    </>
                                                }
                                            </>);

                                    })()}

                                    {/* Other Production Menu Items */}
                                    {
                                        (hasPermission('inventory', 'read') || hasPermission('purchase_orders', 'read')) && (
                                            <li className="label">Resources</li>
                                        )
                                    }

                                    {
                                        hasPermission('inventory', 'read') && (
                                            <li className={isActive("/production/inventory") ? "active" : ""}>
                                                <Link href="/production/inventory">
                                                    <i className="ti-package"></i> Inventory
                                                </Link>
                                            </li>
                                        )
                                    }
                                    {
                                        hasPermission('purchase_orders', 'read') && (
                                            <li className={isActive("/production/purchase-orders") ? "active" : ""}>
                                                <Link href="/production/purchase-orders">
                                                    <i className="ti-shopping-cart"></i>{" "}
                                                    Purchase Orders
                                                </Link>
                                            </li>)
                                    }
                                    {hasPermission('delivery', 'print') && (
                                        <li className={isActive("/delivery-receipts") ? "active" : ""}>
                                            <Link href="/delivery-receipts">
                                                <i className="ti-printer"></i> Delivery Receipts
                                            </Link>
                                        </li>
                                    )}
                                </ul> :
                                role === "Cashier" ?
                                    <ul>
                                        <li className="label">Main Menu</li>
                                        <li className={isActive("/cashier/") ? "active" : ""}>
                                            <Link href="/cashier/">
                                                <i className="ti-calendar"></i> Dashboard
                                            </Link>
                                        </li>
                                        {hasPermission('delivery', 'print') && (
                                            <li className={isActive("/delivery-receipts") ? "active" : ""}>
                                                <Link href="/delivery-receipts">
                                                    <i className="ti-printer"></i> Delivery Receipts
                                                </Link>
                                            </li>
                                        )}
                                        <li className="label">Financials</li>
                                        <li className={isActive("/cashier/finance") ? "active" : ""}>
                                            <Link href="/cashier/finance">
                                                <i className="ti-credit-card"></i> Payments & Finance
                                            </Link>
                                        </li>
                                    </ul> :

                                    role === "admin" &&
                                    <ul>
                                        <li className="label">Main Menu</li>
                                        <li className={isActive("/admin/") ? "active" : ""}>
                                            <Link href="/admin/">
                                                <i className="ti-calendar"></i>{" "}
                                                Dashboard
                                            </Link>
                                        </li>
                                        <li className={isActive("/admin/customers") ? "active" : ""}>
                                            <Link href="/admin/customers">
                                                <i className="ti-user"></i> Customers
                                            </Link>
                                        </li>
                                        <li className={isActive("/admin/tickets") ? "active" : ""}>
                                            <Link href="/admin/tickets">
                                                <i className="ti-ticket"></i> Job Tickets
                                            </Link>
                                        </li>
                                        <li className={isActive("/admin/mock-ups") ? "active" : ""}>
                                            <Link href="/designer/mock-ups">
                                                <i className="ti-image"></i> Mock-Ups
                                            </Link>
                                        </li>
                                        {hasPermission('delivery', 'print') && (
                                            <li className={isActive("/delivery-receipts") ? "active" : ""}>
                                                <Link href="/delivery-receipts">
                                                    <i className="ti-printer"></i> Delivery Receipts
                                                </Link>
                                            </li>
                                        )}

                                        <li className="label">Production & Inventory</li>

                                        <li className={isActive("/admin/job-types") ? "active" : ""}>
                                            <Link href="/admin/job-types">
                                                <i className="ti-stamp"></i> Job Types & Pricing
                                            </Link>
                                        </li>
                                        <li className={isActive("/admin/inventory") ? "active" : ""}>
                                            <Link href="/admin/inventory">
                                                <i className="ti-package"></i> Inventory
                                            </Link>
                                        </li>
                                        <li className={isActive("/admin/purchase-orders") ? "active" : ""}>
                                            <Link href="/admin/purchase-orders">
                                                <i className="ti-shopping-cart"></i>{" "}
                                                Purchase Orders
                                            </Link>
                                        </li>

                                        {/* Production Workflow Collapsible Submenu */}
                                        <li className={isActive("/production/") ? "active" : ""}>
                                            <a
                                                href="#"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setIsProductionWorkflowOpen(!isProductionWorkflowOpen);
                                                }}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <i className="ti-layout-grid2"></i> Production Workflow
                                                <i className={`ti-angle-${isProductionWorkflowOpen ? 'down' : 'right'}`} style={{ float: 'right', fontSize: '12px', marginTop: '4px' }}></i>
                                            </a>
                                        </li>
                                        {isProductionWorkflowOpen && (
                                            <>
                                                <li className={isActive("/production/tickets/all") ? "active" : ""} style={{ paddingLeft: '30px' }}>
                                                    <Link href="/production/tickets/all">
                                                        <i className="ti-layout-grid2"></i> All Tickets
                                                    </Link>
                                                </li>
                                                <li className={isActive("/production/workflow/printing") ? "active" : ""} style={{ paddingLeft: '30px' }}>
                                                    <Link href="/production/workflow/printing">
                                                        <i className="ti-printer"></i> Printing
                                                    </Link>
                                                </li>
                                                <li className={isActive("/production/workflow/lamination_heatpress") ? "active" : ""} style={{ paddingLeft: '30px' }}>
                                                    <Link href="/production/workflow/lamination_heatpress">
                                                        <i className="ti-layers"></i> Heatpress / Lamination
                                                    </Link>
                                                </li>
                                                <li className={isActive("/production/workflow/cutting") ? "active" : ""} style={{ paddingLeft: '30px' }}>
                                                    <Link href="/production/workflow/cutting">
                                                        <i className="ti-cut"></i> Cutting
                                                    </Link>
                                                </li>
                                                <li className={isActive("/production/workflow/sewing") ? "active" : ""} style={{ paddingLeft: '30px' }}>
                                                    <Link href="/production/workflow/sewing">
                                                        <i className="ti-pin-alt"></i> Sewing
                                                    </Link>
                                                </li>
                                                <li className={isActive("/production/workflow/dtf_press") ? "active" : ""} style={{ paddingLeft: '30px' }}>
                                                    <Link href="/production/workflow/dtf_press">
                                                        <i className="ti-stamp"></i> DTF Press
                                                    </Link>
                                                </li>
                                                <li className={isActive("/production/workflow/embroidery") ? "active" : ""} style={{ paddingLeft: '30px' }}>
                                                    <Link href="/production/workflow/embroidery">
                                                        <i className="ti-pencil-alt"></i> Embroidery
                                                    </Link>
                                                </li>
                                                <li className={isActive("/production/workflow/knitting") ? "active" : ""} style={{ paddingLeft: '30px' }}>
                                                    <Link href="/production/workflow/knitting">
                                                        <i className="ti-layout-grid2"></i> Knitting
                                                    </Link>
                                                </li>
                                                <li className={isActive("/production/workflow/lasser_cutting") ? "active" : ""} style={{ paddingLeft: '30px' }}>
                                                    <Link href="/production/workflow/lasser_cutting">
                                                        <i className="ti-bolt"></i> Laser Cutting
                                                    </Link>
                                                </li>
                                                <li className={isActive("/production/workflow/qa") ? "active" : ""} style={{ paddingLeft: '30px' }}>
                                                    <Link href="/production/workflow/qa">
                                                        <i className="ti-check-box"></i> Quality Assurance
                                                    </Link>
                                                </li>
                                                <li className={isActive("/production/completed") ? "active" : ""} style={{ paddingLeft: '30px' }}>
                                                    <Link href="/production/completed">
                                                        <i className="ti-check"></i> Completed
                                                    </Link>
                                                </li>
                                                <li className={isActive("/production/tvview") ? "active" : ""} style={{ paddingLeft: '30px' }}>
                                                    <Link href="/production/tvview">
                                                        <i className="ti-control-shuffle"></i> TV/Monitor View
                                                    </Link>
                                                </li>
                                            </>
                                        )}

                                        <li className="label">Financials</li>
                                        <li className={isActive("/admin/finance") ? "active" : ""}>
                                            <Link href="/admin/finance">
                                                <i className="ti-credit-card"></i>{" "}
                                                Payments & Finance
                                            </Link>
                                        </li>
                                        <li className={isActive("/admin/reports") ? "active" : ""}>
                                            <Link href="/admin/reports">
                                                <i className="ti-stats-up"></i> Reports & Analytics
                                            </Link>
                                        </li>

                                        <li className="label">Administration</li>
                                        <li className={isActive("/admin/users") ? "active" : ""}>
                                            <Link href="/admin/users">
                                                <i className="ti-id-badge"></i> Users Management
                                            </Link>
                                        </li>
                                        <li className={isActive("/admin/branches") ? "active" : ""}>
                                            <Link href="/admin/branches">
                                                <i className="ti-location-pin"></i> Branch Management
                                            </Link>
                                        </li>
                                        <li className={isActive("/admin/settings") ? "active" : ""}>
                                            <Link href="/admin/settings">
                                                <i className="ti-settings"></i> System Settings
                                            </Link>
                                        </li>
                                    </ul>

                    }
                </div>
            </div>
        </div>);

}