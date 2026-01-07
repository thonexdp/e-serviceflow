import React from "react";
import { formatPeso } from "@/Utils/currency";

export default function Quotation({ ticket, customerOrderQrcode, customData = {} }) {
    if (!ticket) return null;

    const formatDate = (dateString) => {
        if (!dateString) return new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    };

    const items = ticket.items || [];
    const hasItems = items.length > 0;

    // Use custom data from modal if provided, otherwise fallback to ticket/customer data
    const displayData = {
        name: customData.name || (ticket.customer ? `${ticket.customer.firstname} ${ticket.customer.lastname}` : ''),
        companyName: customData.companyName || (ticket.customer?.company_name || ''),
        address: customData.address || (ticket.customer?.address || ''),
        validUntil: customData.validUntil || '',
        quotationNo: customData.quotationNo || ticket.ticket_number || '',
        projectDescription: customData.projectDescription || ticket.description || '',
        valueAddedTax: parseFloat(customData.valueAddedTax || 0),
        others: parseFloat(customData.others || 0),
        date: customData.date || formatDate(new Date()),
    };

    const subtotal = parseFloat(ticket.total_amount || 0);
    const total = subtotal + displayData.valueAddedTax + displayData.others;

    return (
        <div className="quotation-print-container bg-white text-black" style={{
            fontFamily: "'Inter', 'Segoe UI', Roboto, sans-serif",
            fontSize: '11pt',
            lineHeight: '1.4',
            width: '210mm',
            padding: '20mm',
            margin: '0 auto',
            boxSizing: 'border-box',
            position: 'relative',
            color: '#333',
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact'
        }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
                
                .quotation-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }
                .quotation-table th {
                    background-color: #F27121;
                    color: white;
                    text-align: center;
                    padding: 10px;
                    font-weight: 700;
                    border: 1px solid #fff;
                }
                .quotation-table td {
                    padding: 12px 10px;
                    border: 1px solid #eee;
                    background-color: #f9f9f9;
                }
                .line-under {
                    border-bottom: 1px solid #333;
                    display: inline-block;
                    min-width: 250px;
                    margin-left: 5px;
                }
                .section-header {
                    color: #000;
                    font-weight: 800;
                    text-transform: uppercase;
                    margin-bottom: 5px;
                }
            `}</style>

            {/* Header Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <img
                        src="/images/logo.png"
                        alt="Logo"
                        style={{ width: '85px', height: '85px', borderRadius: '50%', marginRight: '15px', marginTop: '-10mm' }}
                    />
                    <div>
                        <h1 style={{ fontSize: '18pt', fontWeight: '800', margin: '0', color: '#000', lineHeight: '1.1' }}>
                            RC PRINTSHOPPE
                        </h1>
                        <h2 style={{ fontSize: '10pt', fontWeight: '700', margin: '0', color: '#000' }}>
                            & GENERAL MERCHANDISE
                        </h2>
                        <div style={{ fontSize: '8pt', marginTop: '5px', color: '#000' }}>
                            Zone V, Sogod Southern Leyte<br />
                            rcprintshoppe18@gmail.com<br />
                            FB Page: RC Printshoppe<br />
                            rcprintshoppe.com
                        </div>
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <h1 style={{ fontSize: '42pt', fontWeight: '400', margin: '0', color: '#000', fontFamily: 'serif', letterSpacing: '1px' }}>
                        QUOTATION
                    </h1>
                </div>
            </div>

            {/* Client and Quote Info Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', marginTop: '60px' }}>
                <div style={{ width: '60%' }}>
                    <div style={{ marginBottom: '4px', display: 'flex', alignItems: 'flex-end' }}>
                        <span style={{ fontWeight: '600', width: '130px', flexShrink: 0 }}>Customer :</span>
                        <div style={{ borderBottom: '1px solid #999', flexGrow: 1, paddingLeft: '5px', minHeight: '1.2em' }}>{displayData.name}</div>
                    </div>
                    <div style={{ marginBottom: '4px', display: 'flex', alignItems: 'flex-end' }}>
                        <span style={{ fontWeight: '600', width: '130px', flexShrink: 0 }}>Company Name :</span>
                        <div style={{ borderBottom: '1px solid #999', flexGrow: 1, paddingLeft: '5px', minHeight: '1.2em' }}>{displayData.companyName}</div>
                    </div>
                    <div style={{ marginBottom: '4px', display: 'flex', alignItems: 'flex-end' }}>
                        <span style={{ fontWeight: '600', width: '130px', flexShrink: 0 }}>Address :</span>
                        <div style={{ borderBottom: '1px solid #999', flexGrow: 1, paddingLeft: '5px', minHeight: '1.2em' }}>{displayData.address}</div>
                    </div>
                    <div style={{ marginBottom: '4px', display: 'flex', alignItems: 'flex-end' }}>
                        <span style={{ fontWeight: '600', width: '130px', flexShrink: 0 }}>Contact no. :</span>
                        <div style={{ borderBottom: '1px solid #999', flexGrow: 1, paddingLeft: '5px', minHeight: '1.2em' }}>{ticket.customer?.phone || ''}</div>
                    </div>
                </div>
                <div style={{ width: '30%' }}>
                    <div style={{ marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: '600' }}>Quotation No :</span>
                        <span>{displayData.quotationNo}</span>
                    </div>
                    <div style={{ marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: '600' }}>Date :</span>
                        <span>{displayData.date}</span>
                    </div>
                    <div style={{ marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: '600' }}>Valid Until :</span>
                        <span>{displayData.validUntil}</span>
                    </div>
                    <div style={{ marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: '600' }}>Ticket No. :</span>
                        <span>{ticket.ticket_number}</span>
                    </div>
                </div>
            </div>

            {/* Green Separator */}
            <div style={{ height: '4px', backgroundColor: '#3B8255', width: '100%', marginBottom: '15px' }}></div>

            {/* Project Description */}
            <div style={{ display: 'flex', marginBottom: '15px', alignItems: 'center' }}>
                <div style={{ width: '25%', fontWeight: '800', fontSize: '11pt', color: '#000' }}>
                    PROJECT DESCRIPTION
                </div>
                <div style={{ width: '75%', fontSize: '11pt', color: '#000', paddingLeft: '10px' }}>
                    {displayData.projectDescription || "Add a brief and concise description of the project, item, or service here."}
                </div>
            </div>

            {/* Items Table */}
            <table className="quotation-table">
                <thead style={{ backgroundColor: '#F27121', color: '#fff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                    <tr>
                        <th style={{ width: '45%', textAlign: 'left', border: 'none' }}>Description</th>
                        <th style={{ width: '15%', border: 'none' }}>Quantity</th>
                        <th style={{ width: '20%', border: 'none' }}>Price</th>
                        <th style={{ width: '20%', border: 'none' }}>Total</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style={{ height: '20mm' }}>
                        <td style={{ verticalAlign: 'top' }}>
                            {ticket.job_type?.name || 'Service'}<br />
                            <small style={{ color: '#666' }}>{ticket.description}</small>
                        </td>
                        <td style={{ textAlign: 'center', verticalAlign: 'top' }}>{ticket.quantity}</td>
                        <td style={{ textAlign: 'center', verticalAlign: 'top' }}>{formatPeso(ticket.total_amount / ticket.quantity)}</td>
                        <td style={{ textAlign: 'right', verticalAlign: 'top', fontWeight: '700' }}>{formatPeso(ticket.total_amount)}</td>
                    </tr>
                    {/* Add empty rows to fill space matching the photo */}
                    {[...Array(4)].map((_, i) => (
                        <tr key={i} style={{ height: '12mm' }}>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Footer calculations and QR */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px' }}>
                <div style={{ width: '50%', textAlign: 'left' }}>
                    {customerOrderQrcode && (
                        <div style={{ textAlign: 'left' }}>
                            <img
                                src={customerOrderQrcode}
                                alt="QR Code"
                                style={{ width: '120px', height: '120px', border: 'none', marginLeft: '10px' }}
                            />
                            <div style={{ marginTop: '5px', fontSize: '11pt', fontWeight: '800', color: '#F27121', textAlign: 'left', textTransform: 'uppercase' }}>SCAN TO ORDER ONLINE</div>
                        </div>
                    )}
                </div>
                <div style={{ width: '35%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '700', color: '#000' }}>Subtotal</span>
                        <span>{formatPeso(subtotal)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '700', color: '#000' }}>Value-Added Tax</span>
                        <span>{formatPeso(displayData.valueAddedTax)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '700', color: '#000' }}>Others</span>
                        <span>{formatPeso(displayData.others)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', backgroundColor: '#F27121', color: '#fff', padding: '8px 12px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                        <span style={{ fontWeight: '800', fontSize: '12pt' }}>Total</span>
                        <span style={{ fontWeight: '800', fontSize: '12pt' }}>{formatPeso(total)}</span>
                    </div>
                </div>
            </div>

            {/* Green Separator */}
            <div style={{ height: '4px', backgroundColor: '#3B8255', width: '100%', marginTop: '20px', marginBottom: '15px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}></div>

            {/* Terms and Conditions */}
            <div style={{ display: 'flex', marginBottom: '15px' }}>
                <div style={{ width: '25%', fontWeight: '800', fontSize: '11pt', color: '#000' }}>
                    TERMS & CONDITIONS
                </div>
                <div style={{ width: '75%', fontSize: '9pt', color: '#000', paddingLeft: '10px' }}>
                    Above information is not an invoice and only an estimate of goods/services. Payment will be due prior to provision or delivery of goods/services.
                </div>
            </div>

            <div style={{ textAlign: 'center', fontSize: '8pt', color: '#000', fontWeight: '800', margin: '20px 0 0 20px', textTransform: 'uppercase' }}>
                "THIS QUOTATION IS NOT A SALES INVOICE. PRICES ARE SUBJECT TO CHANGE AND PRODUCTION WILL COMMENCE UPON APPROVAL AND DOWNPAYMENT."
            </div>

            {/* Signatures */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', width: '60%' }}>
                        <span style={{ fontSize: '10pt', whiteSpace: 'nowrap' }}>Prepared by:</span>
                        <div style={{ borderBottom: '1px solid #999', flexGrow: 1, marginLeft: '5px', minHeight: '1.2em' }}></div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', width: '35%' }}>
                        <span style={{ fontSize: '10pt', whiteSpace: 'nowrap' }}>Date:</span>
                        <div style={{ borderBottom: '1px solid #999', flexGrow: 1, marginLeft: '5px', minHeight: '1.2em' }}></div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-end', width: '60%' }}>
                    <span style={{ fontSize: '10pt', whiteSpace: 'nowrap' }}>Approved by (Client):</span>
                    <div style={{ borderBottom: '1px solid #999', flexGrow: 1, marginLeft: '5px', minHeight: '1.2em' }}></div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', width: '45%' }}>
                        <span style={{ fontSize: '10pt', whiteSpace: 'nowrap' }}>Signature:</span>
                        <div style={{ borderBottom: '1px solid #999', flexGrow: 1, marginLeft: '5px', minHeight: '1.2em' }}></div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', width: '35%' }}>
                        <span style={{ fontSize: '10pt', whiteSpace: 'nowrap' }}>Date:</span>
                        <div style={{ borderBottom: '1px solid #999', flexGrow: 1, marginLeft: '5px', minHeight: '1.2em' }}></div>
                    </div>
                </div>
            </div>

            <div style={{ textAlign: 'center', fontWeight: '800', fontSize: '11pt', color: '#000', marginTop: '30px' }}>
                PLEASE CONFIRM YOUR ACCEPTANCE OF THIS QUOTE
            </div>
        </div>
    );
}
