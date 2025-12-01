import React, { useState, useEffect } from "react";
import axios from "axios";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Title,
  Filler
} from "chart.js";

// Register ChartJS components
ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Title,
  Filler
);

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

// --- Custom CSS for Material Design Tweaks ---
const customStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&display=swap');

  :root {
    --primary-color: #4F46E5; /* Indigo */
    --primary-light: #EEF2FF;
    --bg-color: #F3F4F6;
    --card-radius: 16px;
  }

  body {
    font-family: 'Inter', sans-serif;
    background-color: var(--bg-color);
    color: #1F2937;
  }

  .navbar {
    background: white !important;
    backdrop-filter: blur(10px);
    border-bottom: 1px solid #E5E7EB;
  }

  .material-card {
    background: white;
    border-radius: var(--card-radius);
    border: none;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .material-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
  }

  .history-item {
    cursor: pointer;
    transition: background-color 0.2s;
    border-left: 3px solid transparent;
  }
  
  .history-item:hover {
    background-color: var(--primary-light);
  }

  .history-item.active {
    background-color: var(--primary-light);
    border-left-color: var(--primary-color);
  }

  .btn-primary {
    background-color: var(--primary-color);
    border-color: var(--primary-color);
    border-radius: 8px;
    padding: 10px 20px;
    font-weight: 500;
  }

  .btn-primary:hover {
    background-color: #4338CA;
    border-color: #4338CA;
  }

  .form-control:focus {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
  }

  /* Custom Scrollbar for history */
  .custom-scroll::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scroll::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scroll::-webkit-scrollbar-thumb {
    background-color: #D1D5DB;
    border-radius: 20px;
  }
`;

function App() {
  const [query, setQuery] = useState("");
  const [summary, setSummary] = useState("");
  const [chartConfig, setChartConfig] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [history, setHistory] = useState([]);

  // Inject styles on mount
  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = customStyles;
    document.head.appendChild(styleSheet);
    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  const exampleQueries = [
    'Give me analysis of Wakad',
    'Show price growth for Akurdi over the last 3 years',
  ];

  const handleExampleClick = (q) => {
    setQuery(q);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setErrorMsg("Please enter a query.");
      return;
    }

    setErrorMsg("");
    setSummary("");
    setChartConfig(null);
    setTableData([]);
    setLoading(true);

    try {
      const res = await axios.post(`${BACKEND_URL}/api/query/`, {
        query: trimmed,
      });

      const data = res.data;

      setSummary(data.summary || "");

      if (data.charts && data.charts.length > 0) {
        const chart = data.charts[0];
        const labels = chart.data.map((d) => d.year);
        const values = chart.data.map((d) => d.value);

        setChartConfig({
          labels,
          datasets: [
            {
              label: `${chart.metric.toUpperCase()} trend`,
              data: values,
              tension: 0.4, // Smoother curve
              borderColor: '#4F46E5', // Indigo
              backgroundColor: (context) => {
                const ctx = context.chart.ctx;
                const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                gradient.addColorStop(0, "rgba(79, 70, 229, 0.3)");
                gradient.addColorStop(1, "rgba(79, 70, 229, 0.0)");
                return gradient;
              },
              fill: true,
              pointBackgroundColor: '#FFFFFF',
              pointBorderColor: '#4F46E5',
              pointRadius: 5,
              pointHoverRadius: 7,
              borderWidth: 3,
            },
          ],
        });
      }

      setTableData(data.table || []);

      // Update chat-like history
      setHistory((prev) => [
        {
          id: Date.now(),
          query: trimmed,
          summary: data.summary || "",
        },
        ...prev,
      ]);
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data) {
        const serverErr = err.response.data;
        setErrorMsg(
          serverErr.error ||
            serverErr.detail ||
            "Something went wrong while processing your request."
        );
      } else {
        setErrorMsg("Failed to reach backend. Is the server running?");
      }
    } finally {
      setLoading(false);
    }
  };

  const tableColumns = tableData.length > 0 ? Object.keys(tableData[0]) : [];

  // Function to download table data as CSV
  const downloadCSV = () => {
    if (!tableData.length) return;

    const headers = tableColumns.join(",");
    const rows = tableData.map((row) =>
      tableColumns
        .map((col) => {
          let cell = row[col] === null || row[col] === undefined ? "" : row[col];
          cell = cell.toString().replace(/"/g, '""'); // Escape double quotes
          if (cell.search(/("|,|\n)/g) >= 0) cell = `"${cell}"`; // Quote cell if needed
          return cell;
        })
        .join(",")
    );

    const csvContent = [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `real_estate_data_${Date.now()}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-vh-100 d-flex flex-column">
      {/* 1. Navbar: Clean & White with subtle border */}
      <nav className="navbar navbar-expand-lg sticky-top shadow-sm py-3">
        <div className="container">
          <a className="navbar-brand d-flex align-items-center gap-2 fw-bold text-dark" href="#">
            <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style={{width: 40, height: 40}}>
              🏙️
            </div>
            <span>Real Estate Insights</span>
          </a>
          <span className="badge bg-light text-primary border border-primary-subtle rounded-pill px-3 py-2">
            Dataset Loaded • Active
          </span>
        </div>
      </nav>

      {/* 2. Main Content Area */}
      <div className="container py-5 flex-grow-1">
        <div className="row g-4 h-100">
          
          {/* LEFT SIDEBAR: Controls & History */}
          <div className="col-lg-4 d-flex flex-column gap-4">
            
            {/* Query Input Card */}
            <div className="material-card shadow p-4">
              <h5 className="fw-bold mb-3">Analysis Control</h5>
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label text-muted small fw-semibold">ENTER YOUR QUERY</label>
                  <textarea
                    className="form-control form-control-lg bg-light border-0"
                    rows={3}
                    placeholder="e.g. Analyze price trend in Wakad"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={{ resize: "none" }}
                  />
                </div>
                
                <div className="mb-4">
                  <label className="form-label text-muted small fw-semibold">QUICK TRY</label>
                  <div className="d-flex flex-wrap gap-2">
                    {exampleQueries.map((q, i) => (
                      <button
                        key={i}
                        type="button"
                        className="btn btn-sm btn-outline-secondary rounded-pill"
                        onClick={() => handleExampleClick(q)}
                      >
                        {q.split(' ').slice(0, 3).join(' ')}...
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100 py-3 shadow-sm d-flex align-items-center justify-content-center gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      Running Analysis...
                    </>
                  ) : (
                    <>
                      <span>🚀</span> Generate Insights
                    </>
                  )}
                </button>
              </form>
              
              {errorMsg && (
                <div className="alert alert-danger mt-3 mb-0 rounded-3 small border-0 bg-danger-subtle text-danger">
                  <i className="bi bi-exclamation-circle me-2"></i>
                  {errorMsg}
                </div>
              )}
            </div>

            {/* History Card */}
            <div className="material-card shadow p-0 flex-grow-1 d-flex flex-column" style={{minHeight: '300px'}}>
              <div className="p-4 border-bottom">
                <h6 className="fw-bold m-0">Recent Activity</h6>
              </div>
              <div className="custom-scroll p-3 flex-grow-1 overflow-auto" style={{maxHeight: '400px'}}>
                {history.length === 0 ? (
                  <div className="text-center text-muted py-5">
                    <p className="mb-0">No history yet.</p>
                    <small>Your analysis results will appear here.</small>
                  </div>
                ) : (
                  history.map((item) => (
                    <div key={item.id} className="history-item p-3 rounded-3 mb-2">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="badge bg-primary-subtle text-primary rounded-pill">Query</span>
                        <small className="text-muted">{new Date(item.id).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</small>
                      </div>
                      <p className="mb-0 fw-medium text-dark small">"{item.query}"</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* RIGHT CONTENT: Dashboard Results */}
          <div className="col-lg-8">
            {/* Empty State */}
            {!summary && !chartConfig && !tableData.length && !loading && (
              <div className="h-100 d-flex flex-column align-items-center justify-content-center text-center opacity-50 py-5">
                <div style={{fontSize: '4rem'}}>📊</div>
                <h3 className="mt-3 fw-bold text-dark">Ready to Analyze</h3>
                <p className="text-muted" style={{maxWidth: '400px'}}>
                  Select a locality or type a custom query to view real-time market trends, pricing analysis, and data tables.
                </p>
              </div>
            )}

            {/* 1. Summary Card */}
            {summary && (
              <div className="material-card shadow p-4 mb-4 animate__animated animate__fadeIn">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <span className="bg-success-subtle text-success rounded p-1">📝</span>
                  <h5 className="fw-bold m-0">Executive Summary</h5>
                </div>
                <div className="p-3 bg-light rounded-3 border-start border-4 border-success">
                  <p className="mb-0 fs-5 text-secondary" style={{lineHeight: '1.6'}}>
                    {summary}
                  </p>
                </div>
              </div>
            )}

            {/* 2. Chart Card */}
            {chartConfig && (
              <div className="material-card shadow p-4 mb-4 animate__animated animate__fadeInUp">
                <div className="d-flex align-items-center justify-content-between mb-4">
                  <div className="d-flex align-items-center gap-2">
                    <span className="bg-primary-subtle text-primary rounded p-1">📈</span>
                    <h5 className="fw-bold m-0">Market Trend Analysis</h5>
                  </div>
                </div>
                <div style={{ height: 350, width: '100%' }}>
                  <Line
                    data={chartConfig}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          backgroundColor: '#1F2937',
                          padding: 12,
                          cornerRadius: 8,
                          displayColors: false,
                        }
                      },
                      scales: {
                        x: { grid: { display: false }, ticks: { font: { size: 12 } } },
                        y: { 
                          border: { display: false }, 
                          grid: { color: '#F3F4F6' },
                          ticks: { font: { size: 12 } } 
                        },
                      },
                    }}
                  />
                </div>
              </div>
            )}

            {/* 3. Table Card */}
            {tableData.length > 0 && (
              <div className="material-card shadow p-0 overflow-hidden animate__animated animate__fadeInUp">
                <div className="p-4 border-bottom bg-white d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center gap-2">
                    <span className="bg-warning-subtle text-warning rounded p-1">🔢</span>
                    <h5 className="fw-bold m-0">Raw Data Extract</h5>
                  </div>
                  <button 
                    onClick={downloadCSV} 
                    className="btn btn-sm btn-outline-primary d-flex align-items-center gap-2"
                  >
                    <span>⬇️</span> Download CSV
                  </button>
                </div>
                <div className="table-responsive">
                  <table className="table table-hover mb-0 align-middle">
                    <thead className="bg-light">
                      <tr>
                        {tableColumns.map((col) => (
                          <th key={col} className="px-4 py-3 text-uppercase small text-muted fw-bold border-0">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.map((row, idx) => (
                        <tr key={idx}>
                          {tableColumns.map((col) => (
                            <td key={col} className="px-4 py-3 text-secondary border-bottom-0">
                                {row[col] !== null && row[col] !== undefined ? String(row[col]) : "-"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-3 bg-light border-top text-center">
                  <small className="text-muted">Showing {tableData.length} records based on your query</small>
                </div>
              </div>
            )}
            
            {loading && (
              <div className="py-5 text-center">
                 <div className="spinner-border text-primary" style={{width: '3rem', height: '3rem'}} role="status"></div>
                 <p className="mt-3 text-muted">Processing thousands of real estate records...</p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

export default App;