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
  const hasItems = ticket.items && ticket.items.length > 0;


  const grandTotal = parseFloat(ticket.total_amount || payment.amount || 0);
  const subTotal = parseFloat(ticket.subtotal || grandTotal);
  const discountAmount = Math.max(0, subTotal - grandTotal);
  const discountPercent = parseFloat(ticket.discount || 0);

  const currentPaymentAmount = parseFloat(payment.amount || 0);


  const successfulPayments = (ticket.payments || []).filter((p) =>
  p.status !== 'rejected' && p.status !== 'pending'
  );


  const isCurrentPaymentInList = successfulPayments.some((p) => p.id === payment.id);

  const totalPaidSoFar = successfulPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0) + (
  isCurrentPaymentInList ? 0 : currentPaymentAmount);

  const previousPayments = Math.max(0, totalPaidSoFar - currentPaymentAmount);


  const balanceRemaining = ticket.payment_status === 'paid' ? 0 : Math.max(0, grandTotal - totalPaidSoFar);

  return (
    <div className="official-receipt-container font-sans text-sm p-4 max-w-full mx-auto bg-white text-black">

            {/* Header */}
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                    {/* Logo Area */}
                    <div className="w-12 h-12 bg-gray-100 flex items-center justify-center rounded-sm border border-gray-300 overflow-hidden">
                        <img
              src="/images/logo.jpg"
              alt="Logo"
              className="w-full h-full object-cover"
              onError={(e) => e.target.style.display = "none"} />

                    </div>
                    <div>
                        <h1 className="text-base font-extrabold tracking-tight text-gray-900 uppercase leading-tight">
                            RC PrintShoppe
                        </h1>
                        <div className="text-[10px] text-gray-600 leading-tight">
                            <p>123 Business St., City Name</p>
                            <p>Tel: (02) 1234-5678</p>
                            <p>VAT Reg. TIN: 000-000-000-000</p>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wide leading-tight">
                        Official Receipt
                    </h2>
                    <div className="text-red-600 text-sm font-mono font-bold mt-0.5">
                        NO. {payment.official_receipt_number || "_______"}
                    </div>
                </div>
            </div>

            {/* Customer & Info */}
            <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div className="flex">
                    <span className="font-bold w-24">Date:</span>
                    <span className="border-b border-gray-300 flex-1 px-2">
                        {formatDate(payment.payment_date)}
                    </span>
                </div>
                <div className="flex">
                    <span className="font-bold w-24">Ticket #:</span>
                    <span className="border-b border-gray-300 flex-1 px-2 font-semibold">
                        {ticket.ticket_number || payment.ticket?.ticket_number || "—"}
                    </span>
                </div>
                <div className="flex">
                    <span className="font-bold w-24">TIN:</span>
                    <span className="border-b border-gray-300 flex-1 px-2">
                        {payment.customer?.tin || ""}
                    </span>
                </div>
                <div className="flex col-span-2">
                    <span className="font-bold w-24">Received From:</span>
                    <span className="border-b border-gray-300 flex-1 px-2 font-semibold uppercase">
                        {payment.payer_name || payment.customer?.full_name || "Walk-in Customer"}
                    </span>
                </div>
                <div className="flex col-span-2">
                    <span className="font-bold w-24">Address:</span>
                    <span className="border-b border-gray-300 flex-1 px-2">
                        {payment.customer?.address || ""}
                    </span>
                </div>
            </div>

            {/* Items Table */}
            <div className="border border-gray-800 mb-3">
                <table className="w-full text-xs" style={{ pageBreakInside: 'avoid' }}>
                    <thead className="bg-gray-100 border-b border-gray-800">
                        <tr>
                            <th className="py-1 px-1 text-center border-r border-gray-400" style={{ width: '8%' }}>#</th>
                            <th className="py-1 px-1 text-left border-r border-gray-400" style={{ width: '40%' }}>Description</th>
                            <th className="py-1 px-1 text-right border-r border-gray-400" style={{ width: '20%' }}>Unit Price</th>
                            <th className="py-1 px-1 text-center border-r border-gray-400" style={{ width: '12%' }}>Qty</th>
                            <th className="py-1 px-1 text-right" style={{ width: '20%' }}>Line Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {hasItems ?
            ticket.items.map((item, index) =>
            <tr key={index} className="border-b border-gray-200">
                                    <td className="py-1 px-1 text-center border-r border-gray-300">{index + 1}</td>
                                    <td className="py-1 px-1 border-r border-gray-300">
                                        <div className="font-medium text-[9px] leading-tight">{item.description}</div>
                                        {/* Optional details if any */}
                                    </td>
                                    <td className="py-1 px-1 text-right border-r border-gray-300 text-[9px]">
                                        {formatPeso(item.unit_price)}
                                    </td>
                                    <td className="py-1 px-1 text-center border-r border-gray-300 text-[9px]">
                                        {item.quantity}
                                    </td>
                                    <td className="py-1 px-1 text-right text-[9px]">
                                        {formatPeso(item.unit_price * item.quantity)}
                                    </td>
                                </tr>
            ) :

            <tr className="border-b border-gray-200">
                                <td className="py-1 px-1 text-center border-r border-gray-300">1</td>
                                <td className="py-1 px-1 border-r border-gray-300">
                                    <div className="font-medium text-[9px] leading-tight">
                                        {ticket.job_type?.name || ticket.job_type || payment.notes || ticket.description || "Service Rendered"}
                                    </div>
                                    {ticket.ticket_number && (
                                        <div className="text-[8px] text-gray-500 mt-0.5">
                                            Ticket #: {ticket.ticket_number}
                                        </div>
                                    )}
                                </td>
                                <td className="py-1 px-1 text-right border-r border-gray-300 text-[9px]">
                                    {(() => {
                                        const ticketQty = ticket.total_quantity || ticket.quantity || 1;
                                        const unitPrice = ticketQty > 0 ? (grandTotal / ticketQty) : grandTotal;
                                        return formatPeso(unitPrice);
                                    })()}
                                </td>
                                <td className="py-1 px-1 text-center border-r border-gray-300 text-[9px]">
                                    {ticket.total_quantity || ticket.quantity || 1}
                                </td>
                                <td className="py-1 px-1 text-right text-[9px]">{formatPeso(grandTotal)}</td>
                            </tr>
            }

                        {/* Minimum height filler if needed, or just let it collapse */}
                    </tbody>
                    <tfoot className="bg-gray-50 font-bold">
                        {/* Subtotal */}
                        <tr className="border-b border-gray-300">
                            <td colSpan="3" className="border-r border-gray-300"></td>
                            <td className="py-1 px-3 text-right border-r border-gray-300">Subtotal:</td>
                            <td className="py-1 px-3 text-right">{formatPeso(subTotal)}</td>
                        </tr>
                        {/* Discount */}
                        {discountAmount > 0 &&
            <tr className="border-b border-gray-300 text-red-600">
                                <td colSpan="3" className="border-r border-gray-300"></td>
                                <td className="py-1 px-3 text-right border-r border-gray-300">Discount:</td>
                                <td className="py-1 px-3 text-right">-{formatPeso(discountAmount)}</td>
                            </tr>
            }
                        {/* Grand Total */}
                        <tr className="bg-gray-200 border-t-2 border-gray-800">
                            <td colSpan="3" className="border-r border-gray-400 bg-white"></td>
                            <td className="py-2 px-3 text-right border-r border-gray-400 uppercase text-[10px]">Grand Total:</td>
                            <td className="py-2 px-3 text-right text-sm">{formatPeso(grandTotal)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Payment Breakdown Section */}
            <div className="flex justify-end mb-3" style={{ pageBreakInside: 'avoid' }}>
                <div className="w-full border border-gray-800">
                    <div className="bg-gray-800 text-white text-center py-1 font-bold text-xs uppercase tracking-wider">
                        Payment Breakdown
                    </div>
                    <div className="p-3 bg-gray-50 text-xs">
                        <div className="flex justify-between items-center mb-1">
                            <span className="font-semibold text-gray-600 uppercase">Grand Total Due</span>
                            <span className="font-bold">{formatPeso(grandTotal)}</span>
                        </div>
                        <div className="flex justify-between items-center mb-1 text-gray-500">
                            <span>Less: Previous Payments</span>
                            <span>{previousPayments > 0 ? `-${formatPeso(previousPayments)}` : formatPeso(0)}</span>
                        </div>
                        <div className="flex justify-between items-center mb-2 pt-2 border-t border-gray-300 text-orange-900">
                            <span className="font-bold uppercase">Less: Amount Paid (Current)</span>
                            <span className="font-bold text-sm">-{formatPeso(payment.amount)}</span>
                        </div>

                        <div className="ml-4 pl-4 border-l-2 border-gray-300 mb-2 italic text-gray-500 text-[10px]">
                            <div>Method: <span className="font-semibold text-black">{payment.payment_method?.replace("_", " ")}</span></div>
                            {payment.payment_reference &&
              <div>Ref: {payment.payment_reference}</div>
              }
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t-2 border-gray-400 text-red-600">
                            <span className="font-bold uppercase text-[11px]">Balance Remaining</span>
                            <span className="font-bold text-base">{formatPeso(balanceRemaining)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer / Signature */}
            <div className="grid grid-cols-2 gap-6 mt-3 text-xs" style={{ pageBreakInside: 'avoid' }}>
                <div className="pt-8">
                    <div className="border-b border-black mb-1 p-2"></div>
                    <div className="font-bold uppercase text-center">Received By</div>
                    <div className="text-center italic text-[10px] text-gray-500">Signature Over Printed Name</div>
                </div>
                <div className="pt-8 text-center text-[10px] text-gray-400 flex flex-col justify-end">
                    <p>“Thank you for your business!”</p>
                    <p className="uppercase tracking-wider mt-1">System Generated Receipt</p>
                </div>
            </div>
        </div>);

}