import React, { useEffect, useState, useMemo } from "react";

const WORKFLOW_STEPS = [

{ key: 'printing', label: 'Printing', icon: 'ti-printer', color: '#2196F3' },
{ key: 'lamination_heatpress', label: 'Lamination/Heatpress', icon: 'ti-layers', color: '#FF9800' },
{ key: 'cutting', label: 'Cutting', icon: 'ti-cut', color: '#F44336' },
{ key: 'sewing', label: 'Sewing', icon: 'ti-pin-alt', color: '#E91E63' },
{ key: 'dtf_press', label: 'DTF Press', icon: 'ti-stamp', color: '#673AB7' }];




export default function ProductionBoard({ tickets = [], isFullscreen = false }) {
  const [highlightedTickets, setHighlightedTickets] = useState(new Set());
  const [previousTickets, setPreviousTickets] = useState({});


  useEffect(() => {
    const newHighlighted = new Set();
    const currentTickets = {};

    tickets.forEach((ticket) => {
      currentTickets[ticket.id] = {
        workflow_step: ticket.current_workflow_step,
        quantity: ticket.produced_quantity,
        status: ticket.status
      };

      const prev = previousTickets[ticket.id];
      if (prev) {

        if (prev.workflow_step !== ticket.current_workflow_step ||
        prev.quantity !== ticket.produced_quantity ||
        prev.status !== ticket.status) {
          newHighlighted.add(ticket.id);
        }
      }
    });

    if (newHighlighted.size > 0) {
      setHighlightedTickets(newHighlighted);


      setTimeout(() => {
        setHighlightedTickets(new Set());
      }, 2000);
    }

    setPreviousTickets(currentTickets);
  }, [tickets]);

  const groupTicketsByWorkflow = () => {
    const grouped = {};


    WORKFLOW_STEPS.forEach((step) => {
      grouped[step.key] = [];
    });


    grouped['completed'] = [];

    tickets.forEach((ticket) => {
      if (ticket.status === 'completed') {
        grouped['completed'].push(ticket);
      } else if (ticket.current_workflow_step && grouped[ticket.current_workflow_step]) {
        grouped[ticket.current_workflow_step].push(ticket);
      } else if (ticket.job_type?.workflow_steps) {

        const workflowSteps = ticket.job_type.workflow_steps;
        const firstStep = WORKFLOW_STEPS.find((step) => workflowSteps[step.key]);
        if (firstStep && grouped[firstStep.key]) {
          grouped[firstStep.key].push(ticket);
        }
      }
    });

    return grouped;
  };

  const groupedTickets = groupTicketsByWorkflow();


  const displaySteps = WORKFLOW_STEPS;

  const getProgressPercentage = (ticket) => {
    if (!ticket.job_type?.workflow_steps) return 0;

    const workflowSteps = ticket.job_type.workflow_steps;
    const activeSteps = WORKFLOW_STEPS.filter((step) => workflowSteps[step.key]);

    if (activeSteps.length === 0) return 0;

    const currentStepIndex = activeSteps.findIndex(
      (step) => step.key === ticket.current_workflow_step
    );

    if (currentStepIndex === -1) return 0;

    return Math.round((currentStepIndex + 1) / activeSteps.length * 100);
  };

  const TicketCard = ({ ticket }) => {

    const totalQty = ticket.total_quantity || (ticket.quantity || 0) + (ticket.free_quantity || 0);
    const currentQty = ticket.produced_quantity || 0;
    const quantityProgress = totalQty > 0 ? Math.round(currentQty / totalQty * 100) : 0;

    const isOverdue = ticket.due_date && new Date(ticket.due_date) < new Date() && ticket.status !== 'completed';
    const isHighlighted = highlightedTickets.has(ticket.id);


    const currentStep = ticket.current_workflow_step;
    const stepLabel = currentStep ?
    WORKFLOW_STEPS.find((s) => s.key === currentStep)?.label || currentStep :
    ticket.status === 'completed' ? 'Completed' : 'Not Started';

    return (
      <div
        className="card mb-2 shadow-sm"
        style={{
          borderLeft: `4px solid ${isOverdue ? '#F44336' : '#2196F3'}`,
          transition: 'all 0.3s ease',
          transform: isFullscreen ? 'scale(1.02)' : 'none',
          backgroundColor: isHighlighted ? '#fff3cd' : 'white',
          boxShadow: isHighlighted ?
          '0 4px 12px rgba(255, 193, 7, 0.4), 0 0 0 3px rgba(255, 193, 7, 0.2)' :
          undefined,
          animation: isHighlighted ? 'pulseUpdate 0.6s ease-in-out' : 'none'
        }}>

                <div className={`card-body ${isFullscreen ? 'p-3' : 'p-2'}`}>
                    <div className="d-flex justify-content-between align-items-start mb-1">
                        <h6 className="mb-0 font-weight-bold" style={{ fontSize: isFullscreen ? '1.1rem' : '0.9rem' }}>
                            {ticket.ticket_number}
                            {isHighlighted &&
              <span className="ml-2">
                                    <i className="ti-reload animate-spin" style={{ color: '#ffc107', fontSize: '0.8rem' }}></i>
                                </span>
              }
                        </h6>
                        {isOverdue &&
            <span className="badge badge-danger" style={{ fontSize: '0.7rem' }}>
                                <i className="ti-alert"></i> Overdue
                            </span>
            }
                    </div>
                    <p className="mb-1 text-muted" style={{ fontSize: isFullscreen ? '0.9rem' : '0.75rem' }}>
                        {ticket.description || ticket.job_type?.name || 'N/A'}
                    </p>

                    {/* Assigned User */}
                    {ticket.assigned_to_user &&
          <div className="mb-1">
                            <small className="text-info" style={{ fontSize: isFullscreen ? '0.85rem' : '0.75rem' }}>
                                <i className="ti-user mr-1"></i>
                                <strong>{ticket.assigned_to_user.name}</strong>
                            </small>
                        </div>
          }

                    {/* Workflow Status
            <div className="mb-1">
               <small className={ticket.status === 'completed' ? "badge badge-success" : "badge badge-info"} style={{ fontSize: isFullscreen ? '0.85rem' : '0.75rem' }}>
                   <i className={ticket.status === 'completed' ? "ti-check mr-1" : "ti-layout-list-thumb mr-1"}></i>
                   {stepLabel}
               </small>
            </div> */}

                    <div className="d-flex justify-content-between align-items-center mb-1">
                        <small className="text-muted" style={{ fontSize: isFullscreen ? '0.85rem' : '0.75rem' }}>
                            <i className="ti-package"></i> {currentQty}/{totalQty}
                        </small>
                        <small className="text-muted" style={{ fontSize: isFullscreen ? '0.85rem' : '0.75rem' }}>
                            {ticket.due_date ? new Date(ticket.due_date).toLocaleDateString() : 'No due date'}
                        </small>
                    </div>
                    <div className="progress" style={{ height: isFullscreen ? '6px' : '4px' }}>
                        <div
              className={`progress-bar ${quantityProgress >= 100 ? 'bg-success' : isOverdue ? 'bg-danger' : 'bg-warning'}`}
              role="progressbar"
              style={{
                width: `${Math.min(quantityProgress, 100)}%`,
                transition: 'width 0.5s ease'
              }}>
            </div>
                    </div>
                    <small className="text-muted d-block mt-1" style={{ fontSize: isFullscreen ? '0.8rem' : '0.7rem' }}>
                        {quantityProgress}% Complete
                    </small>
                </div>
            </div>);

  };

  return (
    <div className="production-board" style={{ overflowX: 'auto', height: isFullscreen ? 'calc(100vh - 100px)' : 'auto' }}>
            <div className="d-flex" style={{ minWidth: 'max-content', gap: isFullscreen ? '1.5rem' : '1rem', paddingBottom: '1rem' }}>
                {displaySteps.map((step) => {
          const stepTickets = groupedTickets[step.key] || [];

          return (
            <div
              key={step.key}
              className="workflow-column"
              style={{
                minWidth: isFullscreen ? '350px' : '280px',
                maxWidth: isFullscreen ? '400px' : '320px',
                flex: '0 0 auto'
              }}>

                            <div
                className="card shadow-sm mb-0"
                style={{
                  borderTop: `4px solid ${step.color}`,
                  height: '100%',
                  backgroundColor: isFullscreen ? '#f4f6f9' : '#fff'
                }}>

                                <div
                  className="card-header text-white"
                  style={{
                    backgroundColor: step.color,
                    padding: isFullscreen ? '1rem' : '0.75rem'
                  }}>

                                    <div className="d-flex justify-content-between align-items-center">
                                        <h5 className="mb-0 d-flex align-items-center text-white" style={{ fontSize: isFullscreen ? '1.2rem' : '1rem' }}>
                                            <i className={`${step.icon} mr-2`}></i>
                                            {step.label}
                                        </h5>
                                        <span
                      className="badge badge-light"
                      style={{
                        fontSize: isFullscreen ? '1rem' : '0.85rem',
                        color: step.color,
                        fontWeight: 'bold'
                      }}>

                                            {stepTickets.length}
                                        </span>
                                    </div>
                                </div>
                                <div
                  className="card-body"
                  style={{
                    maxHeight: isFullscreen ? 'calc(100vh - 180px)' : '70vh',
                    overflowY: 'auto',
                    padding: isFullscreen ? '1rem' : '0.75rem',
                    backgroundColor: '#f8f9fa'
                  }}>

                                    {stepTickets.length > 0 ?
                  stepTickets.map((ticket) =>
                  <TicketCard key={ticket.id} ticket={ticket} />
                  ) :

                  <div className="text-center text-muted py-4">
                                            <i className={`${step.icon} mb-2`} style={{ fontSize: '2rem', opacity: 0.3 }}></i>
                                            <p style={{ fontSize: '0.85rem' }}>No items</p>
                                        </div>
                  }
                                </div>
                            </div>
                        </div>);

        })}
            </div>

            <style>{`
                .production-board::-webkit-scrollbar {
                    height: ${isFullscreen ? '0' : '8px'};
                    display: ${isFullscreen ? 'none' : 'block'};
                }
                .production-board::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 10px;
                }
                .production-board::-webkit-scrollbar-thumb {
                    background: #888;
                    border-radius: 10px;
                }
                .production-board::-webkit-scrollbar-thumb:hover {
                    background: #555;
                }
                .workflow-column .card-body::-webkit-scrollbar {
                    width: ${isFullscreen ? '0' : '6px'};
                    display: ${isFullscreen ? 'none' : 'block'};
                }
                .workflow-column .card-body::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 10px;
                }
                .workflow-column .card-body::-webkit-scrollbar-thumb {
                    background: #ccc;
                    border-radius: 10px;
                }
                ${isFullscreen ? `
                    .production-board {
                        -ms-overflow-style: none;
                        scrollbar-width: none;
                    }
                    .workflow-column .card-body {
                        -ms-overflow-style: none;
                        scrollbar-width: none;
                    }
                ` : ''}
                .workflow-column .card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
                }
                
                @keyframes pulseUpdate {
                    0%, 100% {
                        transform: scale(1);
                    }
                    50% {
                        transform: scale(1.02);
                    }
                }
                
                @keyframes spin {
                    from {
                        transform: rotate(0deg);
                    }
                    to {
                        transform: rotate(360deg);
                    }
                }
                
                .animate-spin {
                    animation: spin 1s linear infinite;
                    display: inline-block;
                }
            `}</style>
        </div>);

}