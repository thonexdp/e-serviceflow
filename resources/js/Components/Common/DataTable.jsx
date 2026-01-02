import React from "react";
import { router } from "@inertiajs/react";

export default function DataTable({
  columns = [],
  data = [],
  pagination = null,
  onEdit = null,
  onDelete = null,
  actions = null,
  emptyMessage = "No data found.",
  getRowClassName = null,
  canDelete = null, // Function to determine if a row can be deleted
  currentUser = null, // Current user object for permission checks
  showDeleteForInProgress = false, // Show delete button for in-progress items (admin only)
}) {
  const handlePageChange = (url) => {
    if (url) {


      let finalUrl = url;
      if (typeof window !== 'undefined' && window.location.protocol === 'https:' && finalUrl.startsWith('http:')) {
        finalUrl = finalUrl.replace('http:', 'https:');
      }

      router.get(finalUrl, {}, {
        preserveState: true,
        preserveScroll: true
      });
    }
  };

  /**
   * Determine if delete button should be shown for a row
   */
  const shouldShowDeleteButton = (row) => {
    // Don't show delete for admin users
    if (row?.role === 'admin') {
      return false;
    }

    // If custom canDelete function provided, use it
    if (canDelete && typeof canDelete === 'function') {
      return canDelete(row);
    }

    // Check if user is admin
    const isAdmin = currentUser?.role === 'admin' || currentUser?.roles?.some(r => r.name === 'admin');

    // For in-progress items, only show to admins if showDeleteForInProgress is true
    const inProgressStatuses = ['in_designer', 'ready_to_print', 'in_production', 'pending'];
    if (row.status && inProgressStatuses.includes(row.status)) {
      return isAdmin && showDeleteForInProgress;
    }

    // Don't show delete for completed items
    if (row.status === 'completed') {
      return false;
    }

    // Default: show delete button
    return true;
  };

  return (
    <>
            <div className="table-responsive">
                <table className="table table-hover">
                    <thead>
                        <tr>
                            {columns.map((column, index) =>
              <th key={index}>{column.label}</th>
              )}
                            {(onEdit || onDelete || actions) && <th>Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {data && data.length > 0 ?
            data.map((row, rowIndex) =>
            <tr key={row.id || rowIndex} className={getRowClassName ? getRowClassName(row, rowIndex) : ''}>
                                    {columns.map((column, colIndex) =>
              <td key={colIndex}>
                                            {column.render ?
                column.render(row, rowIndex) :
                row[column.key]}
                                        </td>
              )}
                                    {(onEdit || onDelete || actions) &&
              <td>
                                            {actions ?
                actions(row) :

                <div className="btn-group">
                                                    {onEdit &&
                  <button
                    type="button"
                    className="btn btn-link btn-sm text-primary"
                    onClick={() => onEdit(row)}
                    title={`Edit ${row.status !== 'completed' ? 'Edit' : 'View'}`}>

                                                            <small>
                                                                {row.status !== 'completed' ? <i className="ti-pencil"></i> : <i className="ti-eye"></i>}

                                                                {row.status !== 'completed' ? ' Edit' : ' View'}</small>
                                                        </button>
                  }
                                                    {onDelete && shouldShowDeleteButton(row) &&
                  <button
                    type="button"
                    className="btn btn-link btn-sm text-danger"
                    onClick={() => onDelete(row.id)}
                    title="Delete">

                                                            <small> <i className="ti-trash"></i> Delete</small>
                                                        </button>
                  }
                                                </div>
                }
                                        </td>
              }
                                </tr>
            ) :

            <tr>
                                <td colSpan={columns.length + 1} className="text-center">
                                    {emptyMessage}
                                </td>
                            </tr>
            }
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.links && pagination.links.length > 3 &&
      <div className="mt-4">
                    <nav>
                        <ul className="pagination">
                            {pagination.links.map((link, index) =>
            <li
              key={index}
              className={`page-item ${link.active ? "active" : ""} ${!link.url ? "disabled" : ""}`
              }>

                                    {link.url ?
              <a
                className="page-link"
                href={link.url}
                onClick={(e) => {
                  e.preventDefault();
                  handlePageChange(link.url);
                }}>

                                            {link.label.
                replace("&laquo;", "«").
                replace("&raquo;", "»")}
                                        </a> :

              <span className="page-link">
                                            {link.label.
                replace("&laquo;", "«").
                replace("&raquo;", "»")}
                                        </span>
              }
                                </li>
            )}
                        </ul>
                    </nav>
                </div>
      }
        </>);

}