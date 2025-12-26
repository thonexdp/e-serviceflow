import React from "react";
import { router } from "@inertiajs/react";

export default function DataTable({
  columns = [],
  data = [],
  pagination = null,
  onEdit = null,
  onDelete = null,
  actions = null,
  emptyMessage = "No data found."
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
            <tr key={row.id || rowIndex}>
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
                                                    {onDelete && row.status !== 'completed' && row?.role !== 'admin' &&
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