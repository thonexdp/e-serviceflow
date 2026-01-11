import React from "react";
import { formatPeso } from "@/Utils/currency";

export default function OfficialReceipt({ payment }) {
    if (!payment) return null;

    const formatDate = (dateString) => {
        if (!dateString) return "";
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    };


    const ticket = payment.ticket || {};
    const items = ticket.items || [];
    const hasItems = items.length > 0;

    // Check if ticket has discount
    const hasDiscount = ticket.job_type?.discount > 0 || ticket.discount_percentage > 0 || ticket.discount > 0;

    // Use ticket column data (total_invoiced/subtotal) for subtotal - refer to ticket column like BillingStatement
    // If total_invoiced is not available, calculate from items as fallback
    let originalSubtotal = 0;
    if (ticket.total_invoiced) {
        // Use total_invoiced from ticket column (preferred method)
        originalSubtotal = parseFloat(ticket.total_invoiced);
    } else if (hasItems && items.length > 0) {
        // Fallback: Calculate from items if ticket column data not available
        originalSubtotal = items.reduce((sum, item) => sum + parseFloat(item.total || 0), 0);
    } else {
        // Fallback: Use other ticket fields
        originalSubtotal = parseFloat(ticket.original_price || ticket.subtotal || ticket.total_amount || 0);
    }

    const discountPct = parseFloat(ticket.discount_percentage || ticket.job_type?.discount || ticket.discount || 0);
    const discountAmount = parseFloat(ticket.discount_amount || 0);
    const calculatedDiscount = discountAmount > 0 ? discountAmount : (originalSubtotal * (discountPct / 100));
    const totalAmount = originalSubtotal - calculatedDiscount; // This is the ticket total after discount

    const currentPaymentAmount = parseFloat(payment.amount || 0);

    const paymentMethod = payment.payment_method?.toLowerCase() || '';


    // Calculate partial payment (total paid BEFORE this current payment)
    // let partialPayment = 0;
    // const ticketAmountPaid = parseFloat(ticket.amount_paid || 0);
    const partialPayment = parseFloat(ticket.amount_paid || 0);

    // Check payment status - defaults to 'posted' if not set (for ledger payments)
    const paymentStatus = payment.status || 'posted';
    const isPaymentCleared = paymentStatus !== 'rejected' && paymentStatus !== 'pending';

    // // Method 1: Calculate from payments array (most accurate - shows actual payment records)
    // if (ticket.payments && Array.isArray(ticket.payments) && ticket.payments.length > 0) {
    //     const calculatedFromPayments = ticket.payments
    //         .filter(p => {
    //             // Include only cleared/posted payments (exclude rejected and pending)
    //             const pStatus = (p.status || 'posted').toLowerCase();
    //             const isCleared = pStatus !== 'rejected' && pStatus !== 'pending';

    //             // Exclude current payment being printed - check both ID and amount as fallback
    //             const isNotCurrent = p.id && payment.id &&
    //                 String(p.id) !== String(payment.id) &&
    //                 String(p.id) !== String(payment.ticket_id);

    //             // Additional check: if IDs match but amounts are same and date is same, it's the current payment
    //             const isSamePayment = p.amount === payment.amount &&
    //                 p.payment_date === payment.payment_date &&
    //                 p.id === payment.id;

    //             return isCleared && isNotCurrent && !isSamePayment;
    //         })
    //         .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

    //     if (calculatedFromPayments > 0) {
    //         partialPayment = calculatedFromPayments;
    //     }
    // }

    // // Method 2: Use ticket.amount_paid as fallback/primary source
    // // This is more reliable if payments array is incomplete or not loaded
    // if (ticketAmountPaid > 0) {
    //     if (isPaymentCleared) {
    //         // Payment is cleared/posted, already included in amount_paid
    //         // Partial payment = total paid (amount_paid) minus current payment
    //         const calculatedPartial = Math.max(0, ticketAmountPaid - currentPaymentAmount);

    //         // Use amount_paid calculation if it gives a higher value, or if payments array gave 0
    //         if (calculatedPartial > partialPayment || partialPayment === 0) {
    //             partialPayment = calculatedPartial;
    //         }
    //     } else {
    //         // Payment is pending/rejected, not yet in amount_paid
    //         // Partial payment = amount_paid (all previous payments)
    //         if (ticketAmountPaid > partialPayment || partialPayment === 0) {
    //             partialPayment = ticketAmountPaid;
    //         }
    //     }
    // }


    const balanceRemaining = paymentMethod === "check" || paymentMethod === "government_ar" ? totalAmount : Math.max(0, totalAmount - partialPayment); // currentPaymentAmount

    const capitalizeName = (name = '') => name.replace(/\b\w/g, char => char.toUpperCase());

    return (
        <div className="official-receipt-container bg-white text-black" style={{
            fontFamily: "'Inter', 'Segoe UI', Roboto, sans-serif",
            fontSize: '12px',
            lineHeight: '1.2',
            width: '100%',
            minHeight: 'auto',
            padding: '15mm 15mm', // Matched to reference photo spacing
            margin: '0',
            boxSizing: 'border-box',
            position: 'relative'
        }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Dancing+Script:wght@700&display=swap');
                
                .receipt-table th {
                    background-color: #e9ecef;
                    border: 1px solid #000;
                    padding: 4px 8px;
                    font-size: 12px;
                    font-weight: 900;
                    text-transform: capitalize;
                }
                .receipt-table td {
                    border-bottom: 1px solid #000;
                    padding: 8px 4px;
                    vertical-align: middle;
                }
                .row-number {
                    width: 20px;
                    height: 20px;
                    border: 1px solid #000;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    font-weight: bold;
                    margin-right: 10px;
                }
                .dot-separator {
                    display: flex;
                    gap: 7px;
                    margin: 7px 0;
                    width: 100%;
                    overflow: hidden;
                }
                .dot {
                    width: 7px;
                    height: 7px;
                    background-color: #000;
                    flex-shrink: 0;
                }
            `}</style>

            {/* Header Section */}
            <div style={{ width: '100%', marginBottom: '2mm' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', direction: 'ltr', padding: '0 8mm 0 2mm' }}>
                    {/* Logo */}
                    <img
                        src="/images/logo.jpg"
                        alt="Logo"
                        style={{ width: '22mm', height: '22mm', objectFit: 'contain', borderRadius: '50%', flexShrink: 0 }}
                    />

                    <div style={{ flexGrow: 1, marginLeft: '4mm', display: 'flex', flexDirection: 'column' }}>
                        {/* Upper row: Tagline and Title */}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                            <span style={{ fontSize: '7.5pt', fontWeight: 'bold' }}>"We PRINT what you think"</span>
                            <h1 style={{ fontSize: '24pt', fontWeight: 'bold', marginBottom: '35px', marginRight: '30px', lineHeight: '0.9', letterSpacing: '-0.5px' }}>Acknowledgement receipt</h1>
                        </div>

                        {/* Middle row: Dotted Separator */}
                        <div className="dot-separator mr-4">
                            {[...Array(55)].map((_, i) => <div key={i} className="dot"></div>)}
                        </div>

                        {/* Lower row: Company Info and Ticket No */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '2px' }}>
                            <div>
                                <h2 style={{ fontSize: '13pt', fontWeight: 'bold', margin: '0', textTransform: 'uppercase' }}>RC PRINTSHOPPE & GENERAL MERCHANDISE</h2>
                                <p style={{ fontSize: '8.5pt', fontStyle: 'italic', margin: '0' }}>Zone V, Sogod, Southern Leyte (Infront of Gaisano Sogod)</p>
                            </div>
                            <div className="mr-10" style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3mm' }}>
                                <span style={{ fontSize: '12pt', fontWeight: 'bold' }}>TICKET NO:</span>
                                <span style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid transparent', minWidth: '20mm' }}>
                                    {ticket.ticket_number || "---"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Thick Solid Line */}
                <div style={{ borderTop: '5px solid #000', marginTop: '2mm' }}></div>
            </div>

            {/* Sold To / Date Section */}
            <div className="grid grid-cols-2 gap-4 mb-3">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center">
                        <span style={{ fontWeight: 'bold', width: '20mm', fontSize: '9pt' }}>SOLD TO:</span>
                        <div
                            style={{
                                flexGrow: 1,
                                fontWeight: 'bold'
                            }}
                        >
                            {capitalizeName(
                                payment.payer_name ||
                                payment.customer?.full_name ||
                                'Walk-in Customer'
                            )}
                        </div>

                    </div>
                    <div className="flex items-center">
                        <span style={{ fontWeight: 'bold', width: '30mm', fontSize: '9pt' }}>CONTACT NO.</span>
                        <div style={{ flexGrow: 1 }}>
                            {payment.customer?.phone || ""}
                        </div>
                    </div>
                </div>
                <div className="flex items-start justify-end">
                    <span style={{ fontWeight: 'bold', marginRight: '5px' }}>DATE:</span>
                    <div style={{ minWidth: '40mm' }}>
                        {formatDate(payment.payment_date)}
                    </div>
                </div>
            </div>

            {/* Items Table */}
            <table className="receipt-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '3mm' }}>
                <thead>
                    <tr>
                        <th style={{ textAlign: 'left', borderTopLeftRadius: '10px', borderBottomLeftRadius: '10px' }}>Item Description</th>
                        <th style={{ width: '12mm', textAlign: 'center', borderRadius: '10px' }}>Qty</th>
                        <th style={{ width: '22mm', textAlign: 'center', borderRadius: '10px' }}>Unit Price</th>
                        <th style={{ width: '28mm', textAlign: 'center', borderTopRightRadius: '10px', borderBottomRightRadius: '10px' }}>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {[...Array(5)].map((_, i) => {
                        const item = items[i];
                        return (
                            <tr key={i} style={{ height: '9mm' }}>
                                <td>
                                    <div className="flex items-center">
                                        <div className="row-number">{i + 1}</div>
                                        <div style={{ fontWeight: item ? 'bold' : 'normal', fontSize: '8.5pt', display: 'flex', flexDirection: 'column' }}>
                                            <span>{item ? item.description : ''}</span>
                                            {i === 0 && !hasItems && (
                                                <>
                                                    <span>{ticket.job_type?.name || ticket.description || "Service"}</span>
                                                    {hasDiscount && (
                                                        <span style={{ fontSize: '7pt', color: '#28a745', fontWeight: 'bold', marginTop: '2px' }}>
                                                            Discount ({discountPct}%): -{formatPeso(calculatedDiscount)}
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td style={{ textAlign: 'center', fontSize: '8.5pt' }}>
                                    {item ? item.quantity : (i === 0 && !hasItems ? (ticket.quantity || 1) : '')}
                                </td>
                                <td style={{ textAlign: 'center', fontSize: '8.5pt' }}>
                                    {item ? formatPeso(item.unit_price) : (i === 0 && !hasItems && hasDiscount ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            <span style={{ textDecoration: 'line-through', fontSize: '7pt', color: '#999' }}>
                                                {formatPeso(originalSubtotal / (ticket.quantity || 1))}
                                            </span>
                                            <span style={{ color: '#28a745', fontWeight: 'bold' }}>
                                                {formatPeso(totalAmount / (ticket.quantity || 1))}
                                            </span>
                                        </div>
                                    ) : (i === 0 && !hasItems ? formatPeso(originalSubtotal / (ticket.quantity || 1)) : ''))}
                                </td>
                                <td style={{ textAlign: 'right', paddingRight: '5px', fontWeight: 'bold', fontSize: '8.5pt' }}>
                                    {item ? formatPeso(item.total) : (i === 0 && !hasItems ? (
                                        hasDiscount ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                <span style={{ textDecoration: 'line-through', fontSize: '7pt', color: '#999' }}>
                                                    {formatPeso(originalSubtotal)}
                                                </span>
                                                <span style={{ color: '#28a745' }}>
                                                    {formatPeso(totalAmount)}
                                                </span>
                                            </div>
                                        ) : formatPeso(originalSubtotal)
                                    ) : '')}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* Payment Method Section */}
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2" style={{ fontSize: '8pt' }}>
                    <span style={{ fontWeight: 'bold' }}>PAYMENT METHOD:</span>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" checked={paymentMethod === 'cash'} readOnly /> <span>CASH</span>
                        <input type="checkbox" checked={paymentMethod === 'check'} readOnly /> <span>CHECK</span>
                        <input type="checkbox" checked={paymentMethod === 'bank_transfer'} readOnly /> <span>BANK TRANSFER</span>
                        <input type="checkbox" checked={paymentMethod === 'gcash'} readOnly /> <span>GCASH</span>
                    </div>
                </div>
            </div>

            <div className="flex" style={{ width: '100%' }}>
                {/* Left Footer: QR Code and Branding */}
                <div style={{ width: '45%', display: 'flex', flexDirection: 'column' }}>
                    <div
                        style={{
                            display: 'flex',
                            gap: '10px',
                            border: '2px solid #f26522',
                            borderRadius: '10px',
                            padding: '10px',
                            width: 'fit-content',
                            backgroundColor: '#fff'
                        }}
                    >
                        <div
                            style={{
                                width: '26mm',      // ⬅️ bigger box
                                height: '26mm',
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}
                        >
                            <div style={{ position: 'absolute', top: -12, fontSize: '12pt' }}>↓</div>

                            <img
                                src="/images/qr/rcshoppe.png"
                                alt="QR Code"
                                style={{
                                    width: '22mm',    // ⬅️ bigger QR
                                    height: '22mm',
                                    objectFit: 'contain',
                                    border: '1px solid #ccc'
                                }}
                            />

                            <div style={{ position: 'absolute', bottom: -12, fontSize: '12pt' }}>↑</div>
                        </div>

                        <div
                            style={{
                                fontSize: '6pt',
                                color: '#000',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center'
                            }}
                        >
                            <span style={{ color: '#f26522', fontStyle: 'italic' }}>
                                Use the QR code to
                            </span>
                            <span style={{ color: '#f26522', fontStyle: 'italic' }}>
                                make a <strong style={{ textDecoration: 'underline' }}>ONLINE ORDER</strong> and
                            </span>
                            <strong style={{ color: '#f26522' }}>TRACK YOUR ORDER</strong>
                        </div>
                    </div>

                    <div style={{ fontSize: '6.5pt', marginTop: '3px' }}>
                        or visit this site : <strong>www.rcprintshoppe.com</strong>
                    </div>
                </div>



                {/* Center Footer: Quote */}
                <div style={{ width: '30%', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <h3 style={{ margin: '0', fontSize: '10pt', fontWeight: '900' }}>THANK FOR YOUR ORDER.</h3>
                    <p style={{
                        fontFamily: "'Dancing Script', cursive",
                        fontSize: '9pt',
                        margin: '0',
                        color: '#555'
                    }}>"God is good all the time"</p>
                </div>

                {/* Right Footer: Calculations */}
                <div style={{ width: '25%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <div style={{ width: '100%' }}>
                        <div className="flex justify-between mb-0.5" style={{ fontSize: '8.5pt' }}>
                            <span>Subtotal:</span>
                            <span>{formatPeso(originalSubtotal)}</span>
                        </div>
                        {hasDiscount && calculatedDiscount > 0 && (
                            <div className="flex justify-between mb-0.5" style={{ fontSize: '8.5pt' }}>
                                <span>Discount:</span>
                                <span>{formatPeso(calculatedDiscount)}</span>
                            </div>
                        )}
                        <div className="flex justify-between mb-0.5 font-bold" style={{ fontSize: '8.5pt', borderTop: '1px solid #000', paddingTop: '2px', marginTop: '2px' }}>
                            <span>Total Amount:</span>
                            <span>{formatPeso(totalAmount)}</span>
                        </div>
                        <div className="flex justify-between mb-0.5" style={{ fontSize: '8.5pt', marginTop: '4px' }}>
                            <span>Partial Payment:</span>
                            <span>{formatPeso(partialPayment)}</span>
                        </div>
                        <div className="flex justify-between mb-0.5 font-bold" style={{ fontSize: '8.5pt', borderTop: '1.5px solid #000', paddingTop: '2px', marginTop: '2px' }}>
                            <span>Balance:</span>
                            <span>{formatPeso(balanceRemaining)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Most: Socials */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '-10mm', gap: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #000', borderRadius: '5px', overflow: 'hidden' }}>
                    <div style={{ backgroundColor: '#000', color: '#fff', padding: '1px 8px', fontWeight: 'bold', fontSize: '7pt' }}>More Information</div>
                    <div style={{ padding: '1px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{ backgroundColor: '#1877f2', color: '#fff', width: '12px', height: '12px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px' }}>f</div>
                        <span style={{ fontWeight: 'bold', fontSize: '7.5pt' }}>RC Printshoppe</span>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <img src="https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg" style={{ width: '12px' }} alt="Gmail" />
                    <span style={{ fontSize: '7.5pt' }}>rcprintshoppe18@gmail.com</span>
                </div>
            </div>
        </div>
    );
}