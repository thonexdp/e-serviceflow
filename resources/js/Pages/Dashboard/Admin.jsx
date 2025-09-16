import React, { useEffect, useMemo, useRef, useState } from "react";
import AdminLayout from "@/Components/Layouts/AdminLayout";
import { Head } from "@inertiajs/react";
import Footer from "@/Components/Layouts/Footer";
import Modal from "@/Components/Main/Modal";
import { LineChart } from "@mui/x-charts/LineChart";
import {
    Box,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Typography,
} from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";

const sampleData = [
    { date: "2023-01-01", value: 30 },
    { date: "2023-01-02", value: 45 },
    { date: "2023-01-03", value: 57 },
    { date: "2023-01-04", value: 89 },
    { date: "2023-01-05", value: 47 },
    { date: "2023-01-06", value: 90 },
    { date: "2023-01-07", value: 10 },
    { date: "2023-01-08", value: 69 },
    { date: "2023-01-09", value: 5 },
    { date: "2023-01-10", value: 140 },
    { date: "2023-01-11", value: 30 },
    { date: "2023-01-12", value: 45 },
    { date: "2023-01-13", value: 57 },
    { date: "2023-01-14", value: 89 },
    { date: "2023-01-15", value: 47 },
    { date: "2023-01-16", value: 90 },
    { date: "2023-01-17", value: 10 },
    { date: "2023-01-18", value: 69 },
    { date: "2023-01-19", value: 5 },
    { date: "2023-01-20", value: 140 },
    { date: "2023-01-21", value: 30 },
    { date: "2023-01-22", value: 45 },
    { date: "2023-01-23", value: 57 },
    { date: "2023-01-24", value: 89 },
    { date: "2023-01-25", value: 47 },
    { date: "2023-01-26", value: 90 },
    { date: "2023-01-27", value: 10 },
    { date: "2023-01-28", value: 69 },
    { date: "2023-01-29", value: 5 },
    { date: "2023-01-30", value: 140 },

    { date: "2023-02-01", value: 50 },
    { date: "2023-02-02", value: 45 },
    { date: "2024-01-01", value: 60 },
    { date: "2024-01-02", value: 70 },
    { date: "2024-02-01", value: 80 },
    { date: "2024-02-02", value: 75 },
];

const getRandomValue = (min = 2000, max = 40000) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

let saleData = [
    { date: "2023-01-01" },
    { date: "2023-01-02" },
    { date: "2023-01-03" },
    { date: "2023-01-04" },
    { date: "2023-01-05" },
    { date: "2023-01-06" },
    { date: "2023-01-07" },
    { date: "2023-01-08" },
    { date: "2023-01-09" },
    { date: "2023-01-10" },
    { date: "2023-01-11" },
    { date: "2023-01-12" },
    { date: "2023-01-13" },
    { date: "2023-01-14" },
    { date: "2023-01-15" },
    { date: "2023-01-16" },
    { date: "2023-01-17" },
    { date: "2023-01-18" },
    { date: "2023-01-19" },
    { date: "2023-01-20" },
    { date: "2023-01-21" },
    { date: "2023-01-22" },
    { date: "2023-01-23" },
    { date: "2023-01-24" },
    { date: "2023-01-25" },
    { date: "2023-01-26" },
    { date: "2023-01-27" },
    { date: "2023-01-28" },
    { date: "2023-01-29" },
    { date: "2023-01-30" },
    { date: "2023-02-01" },
    { date: "2023-02-02" },
    { date: "2024-01-01" },
    { date: "2024-01-02" },
    { date: "2024-02-01" },
    { date: "2024-02-02" },
];

saleData = saleData.map((item) => ({
    ...item,
    value: getRandomValue(2000, 1400000), 
}));

export default function Dashboard({
    user = {},
    notifications = [],
    messages = [],
}) {
    const [openPaymentModal, setPaymentModalOpen] = useState(false);

    const handleSave = () => {
        console.log("save");
    };

    const [year, setYear] = useState("2023");
    const [month, setMonth] = useState("01");

    // 🔹 Filter data based on year + month
    const filteredData = useMemo(() => {
        return sampleData.filter(
            (d) => d.date.startsWith(year) && d.date.split("-")[1] === month
        );
    }, [year, month]);

    const filteredDataSale = useMemo(() => {
        return saleData.filter(
            (d) => d.date.startsWith(year) && d.date.split("-")[1] === month
        );
    }, [year, month]);

    const xData = filteredData.map((d) => d.date.split("-")[2]); // use day number only
    const yData = filteredData.map((d) => d.value);

    // Extract days + revenue values
    const xDataR = filteredDataSale.map((d) => d.date.split("-")[2]); // day numbers
    const yDataR = filteredDataSale.map((d) => d.value);

    const pesoFormatter = (value) => {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  } else if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  } else if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return `${value}`;
};

    return (
        <AdminLayout
            user={user}
            notifications={notifications}
            messages={messages}
        >
            <Head title="Dashboard" />

            <div className="row">
                <div className="col-lg-8 p-r-0 title-margin-right">
                    <div className="page-header">
                        <div className="page-title">
                            <h1>
                                Hello, <span>Welcome Here</span>
                            </h1>
                        </div>
                    </div>
                </div>
                <div className="col-lg-4 p-l-0 title-margin-left">
                    <div className="page-header">
                        <div className="page-title">
                            <ol className="breadcrumb">
                                <li className="breadcrumb-item">
                                    <a href="#">Dashboard</a>
                                </li>
                                <li className="breadcrumb-item active">Home</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>

            <Modal
                title="Payments"
                isOpen={openPaymentModal}
                onClose={() => setPaymentModalOpen(false)}
                onSave={handleSave}
                size="3xl"
                submitButtonText="Record Payment"
            >
                <form>
                    <div className="mb-4">
                        <h3 className="mb-4">
                            {" "}
                            Record Payment for Ticket #20454-12
                        </h3>
                        <hr />
                    </div>

                    <div>
                        <label className="block text-sm font-medium">
                            Customer : <b>John Doe</b>
                        </label>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">
                            Amount Due : <b> P 2,000.00</b>
                        </label>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                        <div>
                            <label className="block text-sm font-medium">
                                Paymeny Amount :
                            </label>
                            <input
                                type="text"
                                className="mt-1 w-full border"
                                placeholder="0.00"
                                value=""
                                // value={forms.ticket.due_date}

                                // onChange={(e) =>
                                //     setForms({
                                //         ...forms,
                                //         ticket: {
                                //             ...forms.ticket,
                                //             due_date: e.target.value,
                                //         },
                                //     })
                                // }
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">
                                Payment Method
                            </label>
                            <select class name="" id="">
                                <option value="cash">Cash</option>
                                <option value="cash">Card</option>
                                <option value="cash">Gcash</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 mt-2">
                        <div>
                            <label className="block text-sm font-medium">
                                Notes
                            </label>
                            <input
                                type="text"
                                className="mt-1 w-full border rounded-md p-2" // fixed small width
                                placeholder=""
                                value=""
                                // value={forms.ticket.quantity}
                                // onChange={(e) =>
                                //     setForms({
                                //         ...forms,
                                //         ticket: {
                                //             ...forms.ticket,
                                //             quantity: e.target.value,
                                //         },
                                //     })
                                // }
                            />
                        </div>
                    </div>
                </form>
            </Modal>

            <section id="main-content">
                <div className="row">
                    <div className="col-lg-3">
                        <div className="card p-0">
                            <div className="stat-widget-three home-widget-three">
                                <div className="stat-icon bg-facebook">
                                    <i className="ti-write"></i>
                                </div>
                                <div className="stat-content">
                                    <div className="stat-digit">120</div>
                                    <div className="stat-text">Total Jobs</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-3">
                        <div className="card p-0">
                            <div className="stat-widget-three home-widget-three">
                                <div className="stat-icon bg-youtube">
                                    <i className="ti-receipt"></i>
                                </div>
                                <div className="stat-content">
                                    <div className="stat-digit">45</div>
                                    <div className="stat-text">
                                        Pending Approvals
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-3">
                        <div className="card p-0">
                            <div className="stat-widget-three home-widget-three">
                                <div className="stat-icon bg-twitter">
                                    <i className="ti-check-box"></i>
                                </div>
                                <div className="stat-content">
                                    <div className="stat-digit"> 34</div>
                                    <div className="stat-text">
                                        Complete Orders
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-3">
                        <div className="card p-0">
                            <div className="stat-widget-three home-widget-three">
                                <div className="stat-icon bg-danger">
                                    <i className="ti-angle-double-right"></i>
                                </div>
                                <div className="stat-content">
                                    <div className="stat-digit">₱ 23,909.89</div>
                                    <div className="stat-text">
                                        Revenue Today
                                    </div>
                                    
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="row">
                    <div className="col-lg-6">
                        <div className="card">
                            <div className="card-body">
                                <Box sx={{ p: 1 }}>
                                    <Typography variant="h6" gutterBottom>
                                        Daily Orders
                                    </Typography>

                                    {/* 🔹 Year and Month selectors */}
                                    <Box
                                        sx={{ display: "flex", gap: 1, mb: 2 }}
                                    >
                                        <FormControl size="small">
                                            <InputLabel>Year</InputLabel>
                                            <Select
                                                value={year}
                                                label="Year"
                                                onChange={(e) =>
                                                    setYear(e.target.value)
                                                }
                                                sx={{ minWidth: 100 }}
                                            >
                                                <MenuItem value="2023">
                                                    2023
                                                </MenuItem>
                                                <MenuItem value="2024">
                                                    2024
                                                </MenuItem>
                                            </Select>
                                        </FormControl>

                                        <FormControl size="small">
                                            <InputLabel>Month</InputLabel>
                                            <Select
                                                value={month}
                                                label="Month"
                                                onChange={(e) =>
                                                    setMonth(e.target.value)
                                                }
                                                sx={{ minWidth: 100 }}
                                            >
                                                <MenuItem value="01">
                                                    January
                                                </MenuItem>
                                                <MenuItem value="02">
                                                    February
                                                </MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Box>

                                    {/* 🔹 Chart */}
                                    <LineChart
                                        xAxis={[
                                            {
                                                data: xData,
                                                label: "Day",
                                                scaleType: "band",
                                            },
                                        ]}
                                          yAxis={[
                                        {
                                            label: "Orders",
                                        },
                                    ]}
                                        series={[
                                            {
                                                data: yData,
                                                label: "Value",
                                                color: "#0b84ff",
                                            },
                                        ]}
                                        width={800}
                                        height={400}
                                    />
                                </Box>
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-6">
                        <div className="card">
                            <div className="card-body"></div>
                            <Box sx={{ p: 1 }}>
                                <Typography variant="h6" gutterBottom>
                                    Daily Revenue
                                </Typography>

                                {/* 🔹 Year & Month selectors */}
                                <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                                    <FormControl size="small">
                                        <InputLabel>Year</InputLabel>
                                        <Select
                                        size="small"
                                            value={year}
                                            label="Year"
                                            onChange={(e) =>
                                                setYear(e.target.value)
                                            }
                                            sx={{ minWidth: 100 }}
                                        >
                                            <MenuItem value="2023">
                                                2023
                                            </MenuItem>
                                            <MenuItem value="2024">
                                                2024
                                            </MenuItem>
                                        </Select>
                                    </FormControl>

                                    <FormControl size="small">
                                        <InputLabel>Month</InputLabel>
                                        <Select
                                         size="small" 
                                            value={month}
                                            label="Month"
                                            onChange={(e) =>
                                                setMonth(e.target.value)
                                            }
                                            sx={{ minWidth: 120 }}
                                        >
                                            <MenuItem value="01">
                                                January
                                            </MenuItem>
                                            <MenuItem value="02">
                                                February
                                            </MenuItem>
                                        </Select>
                                    </FormControl>
                                </Box>

                                {/* 🔹 Bar Chart */}
                                <BarChart
                                    xAxis={[
                                        {
                                            data: xDataR,
                                            label: "Day",
                                            scaleType: "band",
                                        },
                                    ]}
                                    yAxis={[
                                        {
                                            label: "Revenue (₱)",
                                             valueFormatter: pesoFormatter,
                                        },
                                    ]}
                                    series={[
                                        {
                                            data: yDataR,
                                            label: "Revenue (PHP)",
                                            color: "#1da1f2",
                                           
                                        },
                                    ]}
                                    width={800}
                                    height={400}
                                    
                                />
                            </Box>
                        </div>
                    </div>
                </div>
                {/* <div className="row">
                    <div className="col-lg-3">
                        <div className="card">
                            <div className="card-body">
                                <div className="table-responsive">
                                    <table className="table w-full">
                                        <thead>
                                            <tr>
                                                <th className="text-center">
                                                    Pending Payment
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <th>
                                                    {" "}
                                                    <a
                                                        href="/"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-500 underline"
                                                    >
                                                        {" "}
                                                        #3424234243
                                                    </a>
                                                </th>
                                            </tr>
                                            <tr>
                                                <th>
                                                    <a
                                                        href="/"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-500 underline"
                                                    >
                                                        #3424234243
                                                    </a>
                                                </th>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-3">
                        <div className="card">

                            <div className="card-body">
                                <div className="table-responsive">
                                    <table className="table w-full">
                                        <thead>
                                            <tr>
                                                <th className="text-center">
                                                    In Progress
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <th>
                                                    <a
                                                        href="/"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-500 underline"
                                                    >
                                                        #TRE234FDF34
                                                    </a>
                                                </th>
                                            </tr>
                                            <tr>
                                                <th>
                                                    <a
                                                        href="/"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-500 underline"
                                                    >
                                                        #ERTEW235346
                                                    </a>
                                                </th>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-3">
                        <div className="card">

                            <div className="card-body">
                                <div className="table-responsive">
                                    <table className="table w-full">
                                        <thead>
                                            <tr>
                                                <th className="text-center">
                                                    Ready for Pick Up
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <th>
                                                    <a
                                                        href="/"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-500 underline"
                                                    >
                                                        #FGDG6456DFD
                                                    </a>
                                                </th>
                                            </tr>
                                            <tr>
                                                <th>
                                                    <a
                                                        href="/"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-500 underline"
                                                    >
                                                        #SDFSDFSD35345
                                                    </a>
                                                </th>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-3">
                        <div className="card">

                            <div className="card-body">
                                <div className="table-responsive">
                                    <table className="table w-full">
                                        <thead>
                                            <tr>
                                                <th className="text-center">
                                                    Completed
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <th>
                                                    <a
                                                        href="/"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-500 underline"
                                                    >
                                                        #345345DSFSD
                                                    </a>
                                                </th>
                                            </tr>
                                            <tr>
                                                <th>
                                                    <a
                                                        href="/"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-500 underline"
                                                    >
                                                        #DFGDFG3253
                                                    </a>
                                                </th>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div> */}
                <div className="row">
                    <div className="col-lg-6">
                        <div className="card">
                            <div className="card-title pr">
                                <h4>All Tickets</h4>
                            </div>
                            <div className="card-body">
                                <div className="table-responsive">
                                    <table className="table student-data-table m-t-20">
                                        <thead>
                                            <tr>
                                                <th>Ticket ID</th>
                                                <th>Customer</th>
                                                <th>Description</th>
                                                <th>Due Date</th>
                                                <th>Status</th>
                                                <th>Payment</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td>#43242</td>
                                                <td>John Doe</td>
                                                <td>Print 30 tshirt</td>
                                                <td>Sept. 23, 2025</td>
                                                <td>
                                                    <span className="badge badge-primary">
                                                        Pending
                                                    </span>
                                                </td>
                                                <td>
                                                    <b>P 2400.00</b>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>#7456345</td>
                                                <td>Jan Dela Cruz</td>
                                                <td>Print Mugs</td>
                                                <td>Sept. 30, 2025</td>
                                                <td>
                                                    <span className="badge badge-success">
                                                        Approve
                                                    </span>
                                                </td>
                                                <td>
                                                    <b> P 335.00</b>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>#54653232</td>
                                                <td>John Doe</td>
                                                <td>Print 30 tshirt</td>
                                                <td>Sept. 23, 2025</td>
                                                <td>
                                                    <span className="badge badge-primary badge-outline">
                                                        Pending
                                                    </span>
                                                </td>
                                                <td>
                                                    <b>P 2400.00</b>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>#2436754</td>
                                                <td>Jan Dela Cruz</td>
                                                <td>Print Mugs</td>
                                                <td>Sept. 30, 2025</td>
                                                <td>
                                                    <span className="badge badge-success">
                                                        Approve
                                                    </span>
                                                </td>
                                                <td>
                                                    <b> P 335.00</b>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                      <div className="col-lg-6">
                        <div className="card">
                            <div className="card-title pr">
                                <h4>Payments</h4>
                            </div>
                            <div className="card-body">
                                <div className="table-responsive">
                                    <table className="table student-data-table m-t-20">
                                        <thead>
                                            <tr>
                                                <th>Ticket ID</th>
                                                <th>Customer</th>
                                                <th>Description</th>
                                                <th>Due Date</th>
                                                <th>Status</th>
                                                <th>Payment</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td>#43242</td>
                                                <td>John Doe</td>
                                                <td>Print 30 tshirt</td>
                                                <td>Sept. 23, 2025</td>
                                                <td>
                                                    <span className="badge badge-primary">
                                                        Pending
                                                    </span>
                                                </td>
                                                <td>
                                                    <b>P 2400.00</b>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>#7456345</td>
                                                <td>Jan Dela Cruz</td>
                                                <td>Print Mugs</td>
                                                <td>Sept. 30, 2025</td>
                                                <td>
                                                    <span className="badge badge-success">
                                                        Approve
                                                    </span>
                                                </td>
                                                <td>
                                                    <b> P 335.00</b>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>#54653232</td>
                                                <td>John Doe</td>
                                                <td>Print 30 tshirt</td>
                                                <td>Sept. 23, 2025</td>
                                                <td>
                                                    <span className="badge badge-primary badge-outline">
                                                        Pending
                                                    </span>
                                                </td>
                                                <td>
                                                    <b>P 2400.00</b>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>#2436754</td>
                                                <td>Jan Dela Cruz</td>
                                                <td>Print Mugs</td>
                                                <td>Sept. 30, 2025</td>
                                                <td>
                                                    <span className="badge badge-success">
                                                        Approve
                                                    </span>
                                                </td>
                                                <td>
                                                    <b> P 335.00</b>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                {/* <div className="row">
                    <div className="col-lg-4">
                        <div className="card">
                            <div className="card-body">
                                <div className="year-calendar"></div>
                            </div>
                        </div>

                    </div>
                    <div className="col-lg-4">
                        <div className="card">
                            <div className="card-title">
                                <h4>Notice Board </h4>

                            </div>
                            <div className="recent-comment m-t-15">
                                <div className="media">
                                    <div className="media-left">
                                        <a href="#"><img className="media-object" src="images/avatar/1.jpg"
                                            alt="..." /></a>
                                    </div>
                                    <div className="media-body">
                                        <h4 className="media-heading color-primary">john doe</h4>
                                        <p>Cras sit amet nibh libero, in gravida nulla.</p>
                                        <p className="comment-date">10 min ago</p>
                                    </div>
                                </div>
                                <div className="media">
                                    <div className="media-left">
                                        <a href="#"><img className="media-object" src="images/avatar/2.jpg"
                                            alt="..." /></a>
                                    </div>
                                    <div className="media-body">
                                        <h4 className="media-heading color-success">Mr. John</h4>
                                        <p>Cras sit amet nibh libero, in gravida nulla.</p>
                                        <p className="comment-date">1 hour ago</p>
                                    </div>
                                </div>
                                <div className="media">
                                    <div className="media-left">
                                        <a href="#"><img className="media-object" src="images/avatar/3.jpg"
                                            alt="..." /></a>
                                    </div>
                                    <div className="media-body">
                                        <h4 className="media-heading color-danger">Mr. John</h4>
                                        <p>Cras sit amet nibh libero, in gravida nulla.</p>
                                        <div className="comment-date">Yesterday</div>
                                    </div>
                                </div>
                                <div className="media">
                                    <div className="media-left">
                                        <a href="#"><img className="media-object" src="images/avatar/1.jpg"
                                            alt="..." /></a>
                                    </div>
                                    <div className="media-body">
                                        <h4 className="media-heading color-primary">john doe</h4>
                                        <p>Cras sit amet nibh libero, in gravida nulla.</p>
                                        <p className="comment-date">10 min ago</p>
                                    </div>
                                </div>
                                <div className="media">
                                    <div className="media-left">
                                        <a href="#"><img className="media-object" src="images/avatar/2.jpg"
                                            alt="..." /></a>
                                    </div>
                                    <div className="media-body">
                                        <h4 className="media-heading color-success">Mr. John</h4>
                                        <p>Cras sit amet nibh libero, in gravida nulla.</p>
                                        <p className="comment-date">1 hour ago</p>
                                    </div>
                                </div>
                                <div className="media no-border">
                                    <div className="media-left">
                                        <a href="#"><img className="media-object" src="images/avatar/3.jpg"
                                            alt="..." /></a>
                                    </div>
                                    <div className="media-body">
                                        <h4 className="media-heading color-info">Mr. John</h4>
                                        <p>Cras sit amet nibh libero, in gravida nulla.</p>
                                        <div className="comment-date">Yesterday</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-4">
                        <div className="card">
                            <div className="card-title">
                                <h4>Timeline</h4>

                            </div>
                            <div className="card-body">
                                <ul className="timeline">
                                    <li>
                                        <div className="timeline-badge primary"><i className="fa fa-smile-o"></i></div>
                                        <div className="timeline-panel">
                                            <div className="timeline-heading">
                                                <h5 className="timeline-title">School promote video sharing</h5>
                                            </div>
                                            <div className="timeline-body">
                                                <p>10 minutes ago</p>
                                            </div>
                                        </div>
                                    </li>
                                    <li>
                                        <div className="timeline-badge warning"><i className="fa fa-sun-o"></i></div>
                                        <div className="timeline-panel">
                                            <div className="timeline-heading">
                                                <h5 className="timeline-title">Ready our school website and online
                                                    service</h5>
                                            </div>
                                            <div className="timeline-body">
                                                <p>20 minutes ago</p>
                                            </div>
                                        </div>
                                    </li>
                                    <li>
                                        <div className="timeline-badge danger"><i className="fa fa-times-circle-o"></i>
                                        </div>
                                        <div className="timeline-panel">
                                            <div className="timeline-heading">
                                                <h5 className="timeline-title">Routine pubish our website form
                                                    10/03/2017 </h5>
                                            </div>
                                            <div className="timeline-body">
                                                <p>30 minutes ago</p>
                                            </div>
                                        </div>
                                    </li>
                                    <li>
                                        <div className="timeline-badge success"><i className="fa fa-check-circle-o"></i>
                                        </div>
                                        <div className="timeline-panel">
                                            <div className="timeline-heading">
                                                <h5 className="timeline-title">Principle quotation publish our website
                                                </h5>
                                            </div>
                                            <div className="timeline-body">
                                                <p>15 minutes ago</p>
                                            </div>
                                        </div>
                                    </li>
                                    <li>
                                        <div className="timeline-badge warning"><i className="fa fa-sun-o"></i></div>
                                        <div className="timeline-panel">
                                            <div className="timeline-heading">
                                                <h5 className="timeline-title">Class schedule publish our website</h5>
                                            </div>
                                            <div className="timeline-body">
                                                <p>20 minutes ago</p>
                                            </div>
                                        </div>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div> */}
            </section>

            <Footer />
        </AdminLayout>
    );
}
