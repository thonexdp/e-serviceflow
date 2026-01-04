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
            fontSize: '12pt',
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <img
                        src="/images/logo.jpg"
                        alt="Logo"
                        style={{ width: '100px', height: '100px', borderRadius: '50%', marginRight: '15px' }}
                    />
                    <div>
                        <h1 style={{ fontSize: '18pt', fontWeight: '800', margin: '0', color: '#000', lineHeight: '1.1' }}>
                            RC PRINTSHOPPE
                        </h1>
                        <h2 style={{ fontSize: '10pt', fontWeight: '700', margin: '0', color: '#000' }}>
                            & GENERAL MERCHANDISE
                        </h2>
                        <div style={{ fontSize: '8pt', marginTop: '5px', color: '#666' }}>
                            Zone V, Sogod Southern Leyte<br />
                            rcprintshoppe18@gmail.com<br />
                            FB Page: RC Printshoppe<br />
                            www.rcprintshoppe.com
                        </div>
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <h1 style={{ fontSize: '48pt', fontWeight: '400', margin: '0', color: '#000', fontFamily: 'serif', letterSpacing: '2px' }}>
                        QUOTATION
                    </h1>
                </div>
            </div>

            {/* Client and Quote Info Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', marginTop: '20px' }}>
                <div style={{ width: '60%' }}>
                    <div style={{ marginBottom: '5px' }}>
                        <span style={{ fontWeight: '600' }}>Name :</span>
                        <span className="line-under" style={{ minWidth: '350px' }}>{displayData.name}</span>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                        <span style={{ fontWeight: '600' }}>Company Name:</span>
                        <span className="line-under" style={{ minWidth: '300px' }}>{displayData.companyName}</span>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                        <span style={{ fontWeight: '600' }}>Address:</span>
                        <span className="line-under" style={{ minWidth: '344px' }}>{displayData.address}</span>
                    </div>
                </div>
                <div style={{ width: '35%' }}>
                    <div style={{ marginBottom: '5px', display: 'flex', justifyContent: 'flex-start' }}>
                        <span style={{ fontWeight: '600', width: '120px' }}>Quotation No :</span>
                        <span>{displayData.quotationNo}</span>
                    </div>
                    <div style={{ marginBottom: '5px', display: 'flex', justifyContent: 'flex-start' }}>
                        <span style={{ fontWeight: '600', width: '120px' }}>Date :</span>
                        <span>{displayData.date}</span>
                    </div>
                    <div style={{ marginBottom: '5px', display: 'flex', justifyContent: 'flex-start' }}>
                        <span style={{ fontWeight: '600', width: '120px' }}>Valid Until :</span>
                        <span>{displayData.validUntil}</span>
                    </div>
                    <div style={{ marginBottom: '5px', display: 'flex', justifyContent: 'flex-start' }}>
                        <span style={{ fontWeight: '600', width: '120px' }}>Ticket No. :</span>
                        <span>{ticket.ticket_number}</span>
                    </div>
                </div>
            </div>

            {/* Green Separator */}
            <div style={{ height: '4px', backgroundColor: '#3B8255', width: '100%', marginBottom: '15px' }}></div>

            {/* Project Description */}
            <div style={{ display: 'flex', marginBottom: '15px' }}>
                <div style={{ width: '30%', fontWeight: '800', fontSize: '12pt' }}>
                    PROJECT DESCRIPTION
                </div>
                <div style={{ width: '70%', fontSize: '11pt', color: '#444' }}>
                    {displayData.projectDescription}
                </div>
            </div>

            {/* Items Table */}
            <table className="quotation-table">
                <thead style={{ backgroundColor: '#3B8255', color: '#fff', height: '20px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                    <tr>
                        <th style={{ width: '45%', textAlign: 'left' }}>Description</th>
                        <th style={{ width: '15%' }}>Quantity</th>
                        <th style={{ width: '20%' }}>Price</th>
                        <th style={{ width: '20%' }}>Total</th>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                <div style={{ width: '40%', textAlign: 'center' }}>
                    {customerOrderQrcode && (
                        <div style={{ display: 'inline-block', textAlign: 'center' }}>
                            <img
                                src={customerOrderQrcode}
                                alt="QR Code"
                                style={{ width: '120px', height: '120px', border: '1px solid #ddd', padding: '5px' }}
                            />
                            <div style={{ marginTop: '5px', fontSize: '10pt', fontWeight: '600' }}>scan me to order</div>
                        </div>
                    )}
                </div>
                <div style={{ width: '40%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontWeight: '700' }}>Subtotal</span>
                        <span>{formatPeso(subtotal)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontWeight: '700' }}>Value-Added Tax</span>
                        <span>{formatPeso(displayData.valueAddedTax)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontWeight: '700' }}>Others</span>
                        <span>{formatPeso(displayData.others)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', backgroundColor: '#F27121', color: '#fff', padding: '10px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                        <span style={{ fontWeight: '800', fontSize: '13pt' }}>Total</span>
                        <span style={{ fontWeight: '800', fontSize: '13pt' }}>{formatPeso(total)}</span>
                    </div>
                </div>
            </div>

            {/* Green Separator */}
            <div style={{ height: '4px', backgroundColor: '#3B8255', width: '100%', marginTop: '20px', marginBottom: '15px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}></div>

            {/* Terms and Conditions */}
            <div style={{ display: 'flex', marginBottom: '40px' }}>
                <div style={{ width: '30%', fontWeight: '800', fontSize: '11pt' }}>
                    TERMS & CONDITIONS
                </div>
                <div style={{ width: '70%', fontSize: '9pt', lineHeight: '1.5', color: '#444' }}>
                    Above information is not an invoice and only an estimate of goods/services. Payment will be due prior to provision or delivery of goods/services.
                    <br /><br />
                    <div style={{ fontWeight: '800', fontSize: '11pt', color: '#000' }}>
                        PLEASE CONFIRM YOUR ACCEPTANCE OF THIS QUOTE
                    </div>
                </div>
            </div>

            {/* Signatures */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '50px', marginTop: '30px' }}>
                <div style={{ textAlign: 'center', width: '250px' }}>
                    <div style={{ borderTop: '1px solid #000', marginBottom: '5px' }}></div>
                    <div style={{ fontSize: '10pt' }}>Signature over printed name</div>
                </div>
                <div style={{ textAlign: 'center', width: '150px' }}>
                    <div style={{ borderTop: '1px solid #000', marginBottom: '5px' }}></div>
                    <div style={{ fontSize: '10pt' }}>Date signed</div>
                </div>
            </div>
        </div>
    );
}
