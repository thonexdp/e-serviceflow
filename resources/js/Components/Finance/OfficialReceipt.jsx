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
    <div className="official-receipt-container font-sans text-sm p-8 max-w-3xl mx-auto bg-white text-black">

            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                    {/* Logo Area */}
                    <div className="w-16 h-16 bg-gray-100 flex items-center justify-center rounded-sm border border-gray-300 overflow-hidden">
                        <img
              src="/images/logo.jpg"
              alt="Logo"
              className="w-full h-full object-cover"
              onError={(e) => e.target.style.display = "none"} />

                    </div>
                    <div>
                        <h1 className="text-xl font-extrabold tracking-tight text-gray-900 uppercase">
                            RC PrintShoppe
                        </h1>
                        <div className="text-xs text-gray-600 leading-tight">
                            <p>123 Business St., City Name</p>
                            <p>Tel: (02) 1234-5678</p>
                            <p>VAT Reg. TIN: 000-000-000-000</p>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <h2 className="text-2xl font-bold text-gray-800 uppercase tracking-wide">
                        Official Receipt
                    </h2>
                    <div className="text-red-600 text-lg font-mono font-bold mt-1">
                        NO. {payment.official_receipt_number || "_______"}
                    </div>
                </div>
            </div>

            {/* Customer & Info */}
            <div className="mb-6 grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
                <div className="flex">
                    <span className="font-bold w-24">Date:</span>
                    <span className="border-b border-gray-300 flex-1 px-2">
                        {formatDate(payment.payment_date)}
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
            <div className="border border-gray-800 mb-6">
                <table className="w-full text-xs">
                    <thead className="bg-gray-100 border-b border-gray-800">
                        <tr>
                            <th className="py-2 px-3 text-center border-r border-gray-400 w-12">#</th>
                            <th className="py-2 px-3 text-left border-r border-gray-400">Description</th>
                            <th className="py-2 px-3 text-right border-r border-gray-400 w-24">Unit Price</th>
                            <th className="py-2 px-3 text-center border-r border-gray-400 w-16">Qty</th>
                            <th className="py-2 px-3 text-right w-28">Line Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {hasItems ?
            ticket.items.map((item, index) =>
            <tr key={index} className="border-b border-gray-200">
                                    <td className="py-2 px-3 text-center border-r border-gray-300">{index + 1}</td>
                                    <td className="py-2 px-3 border-r border-gray-300">
                                        <div className="font-medium">{item.description}</div>
                                        {/* Optional details if any */}
                                    </td>
                                    <td className="py-2 px-3 text-right border-r border-gray-300">
                                        {formatPeso(item.unit_price)}
                                    </td>
                                    <td className="py-2 px-3 text-center border-r border-gray-300">
                                        {item.quantity}
                                    </td>
                                    <td className="py-2 px-3 text-right">
                                        {formatPeso(item.unit_price * item.quantity)}
                                    </td>
                                </tr>
            ) :

            <tr className="border-b border-gray-200">
                                <td className="py-4 px-3 text-center border-r border-gray-300">1</td>
                                <td className="py-4 px-3 border-r border-gray-300 italic text-gray-500">
                                    {ticket.job_type?.name || ticket.job_type || payment.notes || (ticket.ticket_number ? `Payment for Ticket #${ticket.ticket_number}` : "Service Rendered")}
                                </td>
                                <td className="py-4 px-3 text-right border-r border-gray-300">—</td>
                                <td className="py-4 px-3 text-center border-r border-gray-300">—</td>
                                <td className="py-4 px-3 text-right">{formatPeso(payment.amount)}</td>
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
            <div className="flex justify-end mb-8">
                <div className="w-full md:w-2/3 border border-gray-800">
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
            <div className="grid grid-cols-2 gap-12 mt-4 text-xs">
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