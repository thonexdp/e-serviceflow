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

    const currentPaymentAmount = parseFloat(payment.amount || 0);
    const subTotal = parseFloat(ticket.subtotal || ticket.total_amount || 0);
    const totalPaidSoFar = (ticket.payments || [])
        .filter(p => p.status !== 'rejected' && p.status !== 'pending')
        .reduce((sum, p) => sum + parseFloat(p.amount), 0);

    // If the current payment is already in the list, don't add it again
    const isCurrentInList = (ticket.payments || []).some(p => p.id === payment.id);
    const totalPaidIncludingCurrent = isCurrentInList ? totalPaidSoFar : totalPaidSoFar + currentPaymentAmount;

    const balanceRemaining = Math.max(0, parseFloat(ticket.total_amount || 0) - totalPaidIncludingCurrent);
    const partialPayment = isCurrentInList ? totalPaidSoFar - currentPaymentAmount : totalPaidSoFar;

    const paymentMethod = payment.payment_method?.toLowerCase() || '';
    const capitalizeName = (name = '') => name.replace(/\b\w/g, char => char.toUpperCase());

    return (
        <div className="official-receipt-container bg-white text-black" style={{
            fontFamily: "'Inter', 'Segoe UI', Roboto, sans-serif",
            fontSize: '9pt',
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
                    font-size: 8pt;
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
                    font-size: 7pt;
                    font-weight: bold;
                    margin-right: 10px;
                }
                .dot-separator {
                    display: flex;
                    gap: 2px;
                    margin: 4px 0;
                    width: 100%;
                    overflow: hidden;
                }
                .dot {
                    width: 4px;
                    height: 4px;
                    background-color: #000;
                    flex-shrink: 0;
                }
            `}</style>

            {/* Header Section */}
            <div style={{ width: '100%', padding: '0 2mm' }}>
                <div className="flex justify-between items-start mb-2" style={{ width: '100%' }}>
                    <div className="flex items-center gap-2" style={{ maxWidth: '65%' }}>
                        <img
                            src="/images/logo.jpg"
                            alt="Logo"
                            style={{ width: '18mm', height: '18mm', objectFit: 'contain', borderRadius: '50%' }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <span style={{ fontSize: '6.5pt', fontStyle: 'italic', fontWeight: 'bold', whiteSpace: 'nowrap' }}>"We PRINT what you think"</span>
                            <div className="dot-separator">
                                {[...Array(60)].map((_, i) => <div key={i} className="dot"></div>)}
                            </div>
                            <h2 style={{ fontSize: '11pt', fontWeight: '900', margin: '0', padding: '0', whiteSpace: 'nowrap' }}>RC PRINTSHOPPE & GENERAL MERCHANDISE</h2>
                            <span style={{ fontSize: '7pt', fontStyle: 'italic', whiteSpace: 'nowrap' }}>Zone V, Sogod, Southern Leyte (Infront of Gaisano Sogod)</span>
                        </div>
                    </div>
                    <div className="text-right" style={{ maxWidth: '35%' }}>
                        <h1 style={{ fontSize: '15pt', fontWeight: '900', margin: '0', lineHeight: '1' }}>Acknowledgement receipt</h1>
                        <div className="flex items-end justify-end mt-2">
                            <span style={{ fontWeight: 'bold', marginRight: '5px', fontSize: '8pt' }}>TICKET NO:</span>
                            <div style={{ borderBottom: '1px solid #000', minWidth: '30mm', textAlign: 'center', fontWeight: 'bold', fontSize: '10pt' }}>
                                {ticket.ticket_number || "---"}
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ borderTop: '4px solid #000', margin: '1mm 0' }}></div>

                {/* Sold To / Date Section */}
                <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center">
                            <span style={{ fontWeight: 'bold', width: '20mm', fontSize: '9pt' }}>SOLD TO:</span>
                            <div
                                style={{
                                    borderBottom: '1px solid #000',
                                    flexGrow: 1,
                                    paddingLeft: '2mm',
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
                            <span style={{ fontWeight: 'bold', width: '20mm', fontSize: '9pt' }}>CONTACT NO.</span>
                            <div style={{ borderBottom: '1px solid #000', flexGrow: 1, paddingLeft: '2mm' }}>
                                {payment.customer?.phone || ""}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-start justify-end">
                        <span style={{ fontWeight: 'bold', marginRight: '5px' }}>DATE:</span>
                        <div style={{ borderBottom: '1px solid #000', minWidth: '40mm', textAlign: 'center' }}>
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
                                            <div style={{ fontWeight: item ? 'bold' : 'normal', fontSize: '8.5pt' }}>
                                                {item ? item.description : ''}
                                                {i === 0 && !hasItems && (ticket.job_type?.name || ticket.description || "Service")}
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'center', fontSize: '8.5pt' }}>
                                        {item ? item.quantity : (i === 0 && !hasItems ? (ticket.quantity || 1) : '')}
                                    </td>
                                    <td style={{ textAlign: 'center', fontSize: '8.5pt' }}>
                                        {item ? formatPeso(item.unit_price) : ''}
                                    </td>
                                    <td style={{ textAlign: 'right', paddingRight: '5px', fontWeight: 'bold', fontSize: '8.5pt' }}>
                                        {item ? formatPeso(item.total) : (i === 0 && !hasItems ? formatPeso(ticket.total_amount) : '')}
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
                                <span>Subtotal</span>
                                <span>: {formatPeso(subTotal)}</span>
                            </div>
                            <div className="flex justify-between mb-0.5" style={{ fontSize: '8.5pt' }}>
                                <span>PARTIAL PAYMENT</span>
                                <span>: {formatPeso(partialPayment)}</span>
                            </div>
                            <div className="flex justify-between mb-0.5" style={{ fontSize: '8.5pt' }}>
                                <span>BALANCE</span>
                                <span>: {formatPeso(balanceRemaining)}</span>
                            </div>
                            <div style={{ borderTop: '1.5px solid #000', margin: '1px 0' }}></div>
                            <div className="flex justify-between font-bold" style={{ fontSize: '9pt' }}>
                                <span>Total</span>
                                <span>: {formatPeso(currentPaymentAmount)}</span>
                            </div>
                            <div style={{ borderTop: '1.5px solid #000', margin: '1px 0' }}></div>
                        </div>
                    </div>
                </div>

                {/* Bottom Most: Socials */}
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '5mm', gap: '15px' }}>
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
        </div>
    );
}