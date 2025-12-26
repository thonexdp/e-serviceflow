import React, { useState } from "react";

export default function Confirmation({
  label,
  loading,
  onCancel,
  onSubmit,
  description,
  subtitle,
  color = "primary",
  icon,
  cancelLabel = "Cancel",
  showIcon = true,
  showNotesField = false,
  notesLabel = "Reason / Notes",
  notesPlaceholder = "Enter reason or notes...",
  notesRequired = false,
  notesRows = 4
}) {
  const [notes, setNotes] = useState("");
  const [notesError, setNotesError] = useState("");

  const handleSubmit = () => {
    if (showNotesField && notesRequired && !notes.trim()) {
      setNotesError("This field is required");
      return;
    }
    onSubmit(notes);
  };


  const getDefaultIcon = () => {
    if (icon) return icon;

    switch (color) {
      case "danger":
        return "ti-alert";
      case "success":
        return "ti-check";
      case "warning":
        return "ti-alert";
      case "info":
        return "ti-info-alt";
      default:
        return "ti-check";
    }
  };

  const iconClass = getDefaultIcon();

















  return (
    <div className="text-center py-3">
            {/* Icon */}
            {showIcon &&
      <div className="mb-4">
                    <div
          className={`bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center`}
          style={{ width: "80px", height: "80px" }}>

                        <i
            className={`${iconClass} text-${color}`}
            style={{ fontSize: "2.5rem" }}>
          </i>
                    </div>
                </div>
      }

            {/* Title */}
            <h4 className="font-weight-bold mb-2 text-dark">
                {description}
            </h4>

            {/* Subtitle */}
            {subtitle &&
      <p className="text-muted mb-4" style={{ fontSize: "0.95rem" }}>
                    {subtitle}
                </p>
      }

            {/* Notes Field */}
            {showNotesField &&
      <div className="mb-4 text-left">
                    <label className="form-label font-weight-bold">
                        {notesLabel}
                        {notesRequired && <span className="text-danger ml-1">*</span>}
                    </label>
                    <textarea
          className={`form-control ${notesError ? 'is-invalid' : ''}`}
          rows={notesRows}
          style={{ height: 'auto' }}
          placeholder={notesPlaceholder}
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setNotesError("");
          }}
          disabled={loading} />

                    {notesError &&
        <div className="invalid-feedback d-block">
                            {notesError}
                        </div>
        }
                </div>
      }

            {/* Buttons */}
            <div className="mt-4 d-flex justify-content-center gap-2">
                <button
          type="button"
          onClick={onCancel}
          className="btn btn-light px-4"
          disabled={loading}>

                    <i className="ti-close mr-2"></i>
                    {cancelLabel}
                </button>
                <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className={`btn btn-${color} px-4`}>

                    {loading ?
          <span className="d-flex align-items-center">
                            <i className="ti-reload mr-2 animate-spin"></i>
                            {label} ...
                        </span> :

          <span className="d-flex align-items-center">
                            <i className={`${iconClass} mr-2`}></i>
                            {label}
                        </span>
          }
                </button>
            </div>
        </div>);

}