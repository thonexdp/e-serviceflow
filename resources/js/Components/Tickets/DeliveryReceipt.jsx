import React, { useEffect } from "react";
import { formatPeso } from "@/Utils/currency";

const ORBITRON_FONT_URL = "https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap";

export default function DeliveryReceipt({ data = {} }) {
    useEffect(() => {
        // Dynamically add Orbitron font if not already present
        if (!document.getElementById("orbitron-font")) {
            const link = document.createElement("link");
            link.id = "orbitron-font";
            link.rel = "stylesheet";
            link.href = ORBITRON_FONT_URL;
            document.head.appendChild(link);
        }
    }, []);

    const MIN_ROWS = 5;
    const ROWS_PER_PAGE = 8;
    const LAST_PAGE_ROWS = 6;
    const items = Array.isArray(data.items) ? data.items : [];
    const effectiveRowCount = Math.max(MIN_ROWS, items.length);

    const pageCount = (() => {
        if (effectiveRowCount <= LAST_PAGE_ROWS) return 1;
        const remainingBeforeLast = effectiveRowCount - LAST_PAGE_ROWS;
        const fullPages = Math.ceil(remainingBeforeLast / ROWS_PER_PAGE);
        return fullPages + 1;
    })();

    const pages = Array.from({ length: pageCount }, (_, pageIndex) => {
        const isLastPage = pageIndex === pageCount - 1;
        const rowsPerThisPage = isLastPage ? Math.max(LAST_PAGE_ROWS, MIN_ROWS) : ROWS_PER_PAGE;
        const start = pageIndex * ROWS_PER_PAGE;
        const slice = items.slice(start, start + rowsPerThisPage);

        return Array.from({ length: rowsPerThisPage }, (_, i) => ({
            no: start + i + 1,
            description: slice[i]?.description || "",
            qty: slice[i]?.qty || "",
            price: slice[i]?.price || "",
            total: slice[i]?.total || ""
        }));
    });

    return (
        <div className="delivery-receipt-container bg-white text-black" style={{
            fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
            fontSize: '11pt',
            boxSizing: 'border-box',
            position: 'relative',
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact'
        }}>
            <style>{`
                @media print {
                    @page {
                        size: A4 landscape;
                        margin: 0; /* Important: removes browser headers/footers */
                    }
                    body {
                        margin: 0;
                        padding: 0;
                    }
                    .delivery-receipt-container {
                        width: 297mm;
                        padding: 0 !important;
                        position: relative;
                        overflow: visible;
                        box-sizing: border-box;
                    }
                    .dr-page {
                        width: 297mm;
                        height: 209mm;
                        padding: 0 10mm;
                        box-sizing: border-box;
                        page-break-after: always;
                        break-after: page;
                        overflow: hidden;
                    }
                    .dr-page:last-child {
                        page-break-after: auto;
                        break-after: auto;
                    }
                    .dr-table {
                        page-break-inside: auto;
                    }
                    .dr-table tr {
                        page-break-inside: avoid;
                        page-break-after: auto;
                    }
                    .dr-footer-section {
                        page-break-inside: avoid;
                    }
                }
                .dr-page {
                    width: 297mm;
                    min-height: 209mm;
                    padding: 0 10mm;
                    box-sizing: border-box;
                    display: flex;
                    flex-direction: column;
                }
                .dr-page + .dr-page {
                    margin-top: 12px;
                }
                .dr-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 10px;
                }
                .dr-table th {
                    color: #F27121;
                    text-align: left;
                    padding: 8px 10px;
                    font-weight: 700;
                    border-bottom: 2px solid #333;
                }
                .dr-table td {
                    padding: 6px 10px;
                    border-bottom: 2px solid #333;
                    height: 25px;
                }
                .line-fill {
                    border-bottom: 1px solid #333;
                    display: inline-block;
                    min-width: 100px;
                    margin-left: 5px;
                }
                .checkbox-item {
                    display: flex;
                    align-items: center;
                    margin-right: 15px;
                    font-size: 10pt;
                }
                .checkbox-box {
                    width: 12px;
                    height: 12px;
                    border: 1px solid #333;
                    margin-right: 5px;
                    display: inline-block;
                    position: relative;
                }
                .checkbox-box.checked::after {
                    content: '✓';
                    position: absolute;
                    top: -4px;
                    left: 1px;
                    font-size: 10px;
                }
                .dr-header-title {
                    font-family: 'Orbitron', 'Eurostile', 'Bank Gothic', sans-serif;
                    font-size: 34pt;
                    font-weight: 800;
                    color: #F27121;
                    letter-spacing: 2px;
                    margin: 0;
                    margin-left: 20px;
                    text-transform: uppercase;
                }
            `}</style>
            {pages.map((rows, pageIndex) => {
                const isLastPage = pageIndex === pages.length - 1;

                return (
                    <div key={pageIndex} className="dr-page">
                        {/* Header Section */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h1 className="dr-header-title">DELIVERY RECEIPT</h1>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <img
                                    src="/images/logo.png"
                                    alt="Logo"
                                    style={{ width: '80px', height: '80px', borderRadius: '50%', marginRight: '15px' }}
                                />
                                <div style={{ textAlign: 'left' }}>
                                    <h2 style={{ fontSize: '18pt', fontWeight: '800', margin: '0', color: '#000', lineHeight: '1.1' }}>
                                        RC PRINTSHOPPE
                                    </h2>
                                    <h3 style={{ fontSize: '10pt', fontWeight: '700', margin: '0', color: '#000' }}>
                                        & GENERAL MERCHANDISE
                                    </h3>
                                    <div style={{ fontSize: '9pt', color: '#333' }}>
                                        Zone V, Sogod Southern Leyte
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Dotted Separator */}
                        <div style={{ borderTop: '4px dotted #000', width: '100%', marginBottom: '10px' }}></div>

                        {/* Client Info Row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <div style={{ width: '55%' }}>
                                <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'flex-end' }}>
                                    <span style={{ fontWeight: '600', whiteSpace: 'nowrap' }}>Delivered to :</span>
                                    <div style={{ borderBottom: '1px solid #333', flexGrow: 1, marginLeft: '5px', minHeight: '1.2em', paddingLeft: '5px' }}>{data.deliveredTo}</div>
                                </div>
                                <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'flex-end' }}>
                                    <span style={{ fontWeight: '600', whiteSpace: 'nowrap' }}>Company Name:</span>
                                    <div style={{ borderBottom: '1px solid #333', flexGrow: 1, marginLeft: '5px', minHeight: '1.2em', paddingLeft: '5px' }}>{data.companyName}</div>
                                </div>
                                <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'flex-end' }}>
                                    <span style={{ fontWeight: '600', whiteSpace: 'nowrap' }}>Address:</span>
                                    <div style={{ borderBottom: '1px solid #333', flexGrow: 1, marginLeft: '5px', minHeight: '1.2em', paddingLeft: '5px' }}>{data.address}</div>
                                </div>
                            </div>
                            <div style={{ width: '35%' }}>
                                <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'flex-end' }}>
                                    <span style={{ fontWeight: '600', whiteSpace: 'nowrap' }}>DELIVERY RECEIPT NO.:</span>
                                    <div style={{ borderBottom: '1px solid #333', flexGrow: 1, marginLeft: '5px', minHeight: '1.2em', paddingLeft: '5px' }}>{data.drNo}</div>
                                </div>
                                <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'flex-end' }}>
                                    <span style={{ fontWeight: '600', whiteSpace: 'nowrap' }}>Date:</span>
                                    <div style={{ borderBottom: '1px solid #333', flexGrow: 1, marginLeft: '5px', minHeight: '1.2em', paddingLeft: '5px' }}>{data.date}</div>
                                </div>
                                <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'flex-end' }}>
                                    <span style={{ fontWeight: '600', whiteSpace: 'nowrap' }}>Ticket no.:</span>
                                    <div style={{ borderBottom: '1px solid #333', flexGrow: 1, marginLeft: '5px', minHeight: '1.2em', paddingLeft: '5px' }}>{data.ticketNo}</div>
                                </div>
                            </div>
                        </div>

                        {/* Dotted Separator */}
                        <div style={{ borderTop: '4px dotted #000', width: '100%', marginBottom: '10px' }}></div>

                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            {/* Items Table */}
                            <table className="dr-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '60px', textAlign: 'center' }}>No</th>
                                        <th style={{ width: '45%' }}>Description</th>
                                        <th style={{ width: '12%', textAlign: 'center' }}>Qty</th>
                                        <th style={{ width: '18%', textAlign: 'center' }}>Unit Price</th>
                                        <th style={{ width: '20%', textAlign: 'center' }}>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row, index) => (
                                        <tr key={index}>
                                            <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{row.no}</td>
                                            <td>{row.description}</td>
                                            <td style={{ textAlign: 'center' }}>{row.qty}</td>
                                            <td style={{ textAlign: 'center' }}>{row.price ? (isNaN(row.price) ? row.price : formatPeso(row.price)) : ""}</td>
                                            <td style={{ textAlign: 'center' }}>{row.total ? (isNaN(row.total) ? row.total : formatPeso(row.total)) : ""}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {isLastPage ? (
                                <>
                                    {/* Totals Section */}
                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        <div style={{ width: '250px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ fontWeight: '600' }}>Subtotal:</span>
                                                <span style={{ borderBottom: '1px solid #333', minWidth: '100px', textAlign: 'right' }}>{data.subtotal ? formatPeso(data.subtotal) : "₱0.00"}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ fontWeight: '600' }}>Downpayment:</span>
                                                <span style={{ borderBottom: '1px solid #333', minWidth: '100px', textAlign: 'right' }}>{data.downpayment ? formatPeso(data.downpayment) : "₱0.00"}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ fontWeight: '700', color: '#F27121' }}>BALANCE DUE:</span>
                                                <span style={{ borderBottom: '2px solid #F27121', minWidth: '100px', textAlign: 'right', fontWeight: '800', color: '#F27121' }}>{data.balance ? formatPeso(data.balance) : "₱0.00"}</span>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : null}
                        </div>

                        {/* Footer Section */}
                        <div className="dr-footer-section" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                            {/* Left Side: Delivery Details */}
                            <div style={{ width: '45%' }}>
                                <h4 style={{ fontWeight: '800', fontStyle: 'italic', marginBottom: '10px', fontSize: '10pt' }}>DELIVERY DETAILS</h4>
                                <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'flex-end' }}>
                                    <span style={{ fontSize: '10pt' }}>Delivered By:</span>
                                    <div style={{ borderBottom: '1px solid #333', flexGrow: 1, marginLeft: '5px', minHeight: '1.2em' }}>{data.deliveredBy}</div>
                                </div>
                                <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '10pt', marginRight: '5px' }}>Mode of Delivery:</span>
                                    <div className="checkbox-item">
                                        <div className={`checkbox-box ${data.modeOfDelivery === 'Pick-up' ? 'checked' : ''}`}></div>
                                        Pick-up
                                    </div>
                                    <div className="checkbox-item">
                                        <div className={`checkbox-box ${data.modeOfDelivery === 'Courier' ? 'checked' : ''}`}></div>
                                        Courier
                                    </div>
                                    <div className="checkbox-item">
                                        <div className={`checkbox-box ${data.modeOfDelivery === 'In-house' ? 'checked' : ''}`}></div>
                                        In-house office/ Delivery
                                    </div>
                                </div>
                                <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'flex-end' }}>
                                    <span style={{ fontSize: '10pt' }}>Delivery Date & Time:</span>
                                    <div style={{ borderBottom: '1px solid #333', flexGrow: 1, marginLeft: '5px', minHeight: '1.2em' }}>{data.deliveryDateTime}</div>
                                </div>

                                <div style={{ textAlign: 'center', marginTop: '10px' }}>
                                    <p style={{ fontWeight: '700', fontSize: '14pt', margin: '0' }}>Thank you for your business!</p>
                                    <p style={{ fontSize: '8pt', fontStyle: 'italic', maxWidth: '300px', margin: '10px auto' }}>
                                        Should you have any inquiries concerning this statement, please contact to our Facebook page RC Printshoppe & General Merchandise
                                    </p>
                                </div>
                            </div>

                            {/* Right Side: Received By */}
                            <div style={{ width: '45%' }}>
                                <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'flex-end' }}>
                                    <span style={{ fontSize: '14pt', fontWeight: '600', fontStyle: 'italic' }}>Received by:</span>
                                    <div style={{ borderBottom: '1px solid #333', flexGrow: 1, marginLeft: '5px', minHeight: '1.2em' }}></div>
                                </div>
                                <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'flex-end' }}>
                                    <span style={{ fontSize: '14pt', fontWeight: '600', fontStyle: 'italic' }}>Signature:</span>
                                    <div style={{ borderBottom: '1px solid #333', flexGrow: 1, marginLeft: '5px', minHeight: '1.2em' }}></div>
                                </div>
                                <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'flex-end' }}>
                                    <span style={{ fontSize: '10pt' }}>Date Received:</span>
                                    <div style={{ borderBottom: '1px solid #333', flexGrow: 1, marginLeft: '5px', minHeight: '1.2em' }}></div>
                                </div>
                                <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'flex-end' }}>
                                    <span style={{ fontSize: '10pt' }}>Contact No.:</span>
                                    <div style={{ borderBottom: '1px solid #333', flexGrow: 1, marginLeft: '5px', minHeight: '1.2em' }}></div>
                                </div>
                                <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'flex-end' }}>
                                    <span style={{ fontSize: '10pt' }}>Position:</span>
                                    <div style={{ borderBottom: '1px solid #333', flexGrow: 1, marginLeft: '5px', minHeight: '1.2em' }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
