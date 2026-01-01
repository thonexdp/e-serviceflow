import React from "react";
import { formatPeso } from "@/Utils/currency";

export default function BillingStatement({ data }) {
    if (!data) return null;

    const {
        customerName,
        companyName,
        address,
        date = new Date().toLocaleDateString(),
        tickets = [],
        summary = {},
        paymentMethod = "Bank Transfer",
        bankName = data.bankName || "PNB Bank",
        accountName = data.accountName || "RC Printshoppe & Gen. Msde.",
        accountNo = data.accountNo || "312670002913",
        logoUrl = "/images/logo.jpg",
        qrCodeUrl = data.qrCodeUrl || "/images/qr/rcshoppe.png"
    } = data;


    const ticketNumbers = tickets.map(t => t.ticket_number || t.ticket_id).join(", ");

    // Group all items from all selected tickets/receivables
    const allItems = tickets.flatMap(t => {
        if (t.items && t.items.length > 0) {
            return t.items.map(item => ({
                date: t.created_at ? new Date(t.created_at).toLocaleDateString() : "",
                description: item.description || t.description || "Service",
                qty: item.quantity,
                price: item.unit_price,
                total: item.total
            }));
        } else {
            return [{
                date: t.created_at ? new Date(t.created_at).toLocaleDateString() : "",
                description: t.description || "Service",
                qty: t.quantity || 1,
                price: t.total_invoiced || t.amount || 0,
                total: t.total_invoiced || t.amount || 0
            }];
        }
    });

    const subtotal = allItems.reduce((sum, item) => sum + parseFloat(item.total || 0), 0);
    const totalBalanceDue = summary.totalBalanceDue || subtotal;

    return (
        <div className="billing-statement-container bg-white text-black" style={{
            fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
            fontSize: '10pt',
            lineHeight: '1.4',
            width: 'auto',
            minHeight: 'calc(148.5mm - 40px)',
            padding: '10mm',
            margin: '40px',
            boxSizing: 'border-box',
            border: '2px solid #808080'
        }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700&display=swap');
                
                .billing-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 15px;
                }
                .logo-section {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }
                .logo-img {
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    border: 3px solid #f26522;
                }
                .company-info h1 {
                    margin: 0;
                    font-size: 16pt;
                    font-weight: 900;
                    color: #000;
                }
                .company-info p {
                    margin: 0;
                    font-size: 8pt;
                    font-weight: bold;
                }
                .statement-title {
                    font-family: 'Orbitron', sans-serif;
                    font-size: 24pt;
                    letter-spacing: 2px;
                    margin: 0;
                }
                .divider-dots {
                    border-top: 5px dotted #000;
                    margin: 10px 0;
                }
                .bill-to-section {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 15px;
                }
                .bill-to-box {
                    width: 55%;
                }
                .label-orange {
                    background-color: #f26522;
                    color: white;
                    padding: 2px 15px;
                    border-radius: 10px;
                    font-weight: bold;
                    display: inline-block;
                    margin-bottom: 10px;
                }
                .info-row {
                    display: flex;
                    margin-bottom: 5px;
                }
                .info-label {
                    width: 100px;
                    font-weight: bold;
                }
                .info-value {
                    flex: 1;
                    border-bottom: 1px solid #999;
                }
                .date-ticket-box {
                    width: 25%;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }
                .summary-box {
                    width: 35%;
                    font-size: 9pt;
                }
                .summary-table {
                    width: 100%;
                }
                .summary-table td {
                    padding: 2px 0;
                }
                .summary-table .amount-col {
                    text-align: right;
                    border-bottom: none;
                }
                .items-table {
                    width: 100%;
                    border-collapse: collapse;
                    border: 2px solid #000;
                    border-radius: 15px;
                    overflow: hidden;
                    margin-bottom: 15px;
                }
                .items-table th {
                    color: #f26522;
                    text-align: left;
                    padding: 8px;
                    border-bottom: 2px solid #000;
                }
                .items-table td {
                    padding: 6px 8px;
                    border-bottom: 1px solid #ccc;
                }
                .items-table tr:last-child td {
                    border-bottom: none;
                }
                .footer-section {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                }
                .qr-section {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    width: auto;
                }
                .qr-img {
                    width: 140px;
                    height: 140px;
                    border: 1px solid #ccc;
                }
                .payment-method-section {
                    width: auto;
                    font-size: 9pt;
                }
                .totals-box {
                    width: 30%;
                    border: 2px solid #000;
                    border-radius: 15px;
                    padding: 10px;
                }
                .total-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 5px;
                }
                .grand-total {
                    font-weight: bold;
                    font-size: 11pt;
                    margin-top: 5px;
                }
                .thanks-msg {
                    text-align: center;
                    font-style: italic;
                    margin-top: 15px;
                    font-weight: bold;
                }
                .inquiries-msg {
                    text-align: right;
                    font-size: 7pt;
                    font-style: italic;
                    margin-top: 5px;
                }
            `}</style>

            <div className="billing-header">
                <div className="logo-section">
                    <img src={logoUrl} alt="Logo" className="logo-img" />
                    <div className="company-info">
                        <h1>RC PRINTSHOPPE</h1>
                        <p>& GENERAL MERCHANDISE</p>
                    </div>
                </div>
                <h2 className="statement-title">BILLING STATEMENT</h2>
            </div>

            <div className="divider-dots"></div>

            <div className="bill-to-section">
                <div className="bill-to-box">
                    <div className="label-orange">Bill to:</div>
                    <div className="info-row">
                        <span className="info-label">Name :</span>
                        <span className="info-value">{customerName}</span>
                    </div>
                    <div className="info-row">
                        <span className="info-label">Company Name:</span>
                        <span className="info-value">{companyName}</span>
                    </div>
                    <div className="info-row">
                        <span className="info-label">Address:</span>
                        <span className="info-value">{address}</span>
                    </div>
                </div>

                <div className="date-ticket-box">
                    <div className="info-row">
                        <span className="info-label" style={{ width: '60px' }}>Date :</span>
                        <span className="info-value">{date}</span>
                    </div>
                    <div className="info-row">
                        <span className="info-label" style={{ width: '60px' }}>Ticket no. :</span>
                        <span className="info-value">{ticketNumbers}</span>
                    </div>
                </div>

                <div className="summary-box">
                    <div className="label-orange" style={{ marginLeft: '20px' }}>Account Summary</div>
                    <table className="summary-table">
                        <tbody>
                            <tr>
                                <td style={{ fontStyle: 'italic' }}>Description</td>
                                <td style={{ fontStyle: 'italic', textAlign: 'right' }}>Amount</td>
                            </tr>
                            <tr>
                                <td>Previous Balance :</td>
                                <td className="amount-col">{formatPeso(summary.previousBalance || 0)}</td>
                            </tr>
                            <tr>
                                <td>Credits :</td>
                                <td className="amount-col">{formatPeso(summary.credits || 0)}</td>
                            </tr>
                            <tr>
                                <td>Total Balance Due :</td>
                                <td className="amount-col">{formatPeso(totalBalanceDue)}</td>
                            </tr>
                            <tr>
                                <td>Payment Due Date :</td>
                                <td className="amount-col">{summary.dueDate || "---"}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="divider-dots"></div>

            <table className="items-table">
                <thead>
                    <tr>
                        <th style={{ width: '40px' }}>No</th>
                        <th style={{ width: '90px' }}>Date</th>
                        <th>Description</th>
                        <th style={{ width: '50px' }}>Qty</th>
                        <th style={{ width: '80px' }}>Price</th>
                        <th style={{ width: '90px' }}>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {[...Array(Math.max(5, allItems.length))].map((_, i) => {
                        const item = allItems[i];

                        return (
                            <tr key={i} style={{ height: '25px' }}>
                                <td>{i + 1}</td>
                                <td>{item?.date || ""}</td>
                                <td>{item?.description || ""}</td>
                                <td>{item?.qty || ""}</td>
                                <td>{item ? formatPeso(item.price) : ""}</td>
                                <td>{item ? formatPeso(item.total) : ""}</td>
                            </tr>
                        );
                    })}

                </tbody>
            </table>

            <div className="footer-section">
                <div style={{ display: 'flex', gap: '25px', alignItems: 'flex-start' }}>
                    <div className="qr-section">
                        <img src={qrCodeUrl} alt="QR Code" className="qr-img" />
                    </div>

                    <div className="payment-method-section">
                        <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>Payment Method: {paymentMethod}</p>
                        <p style={{ margin: '0' }}>{bankName}</p>
                        <p style={{ margin: '0' }}>Account Name : {accountName}</p>
                        <p style={{ margin: '0' }}>Account No. : {accountNo}</p>
                        <p style={{ fontSize: '7pt', marginTop: '10px' }}>*Please confirm your payment after transfer.</p>
                    </div>
                </div>

                <div className="totals-box">
                    <div className="total-row">
                        <span>Subtotal</span>
                        <span>{formatPeso(subtotal)}</span>
                    </div>
                    <div className="total-row">
                        <span>downpayment</span>
                        <span>{formatPeso(summary.credits || 0)}</span>
                    </div>
                    <div className="total-row grand-total">
                        <span>Grand Total</span>
                        <span>{formatPeso(totalBalanceDue)}</span>
                    </div>
                </div>
            </div>

            <div className="thanks-msg">Thank you for your business!</div>
            <div className="inquiries-msg">Should you have any inquiries concerning this statement, please contact to our Facebook page</div>
        </div>
    );
}
