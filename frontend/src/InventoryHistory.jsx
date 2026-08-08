
import React, { useEffect, useState } from 'react';
import {
  RefreshCw,
  Download,
  FileSpreadsheet,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Settings2
} from 'lucide-react';

import API from './api';

export default function InventoryHistory() {
  const [history, setHistory] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);

  // =====================================================
  // FETCH HISTORY
  // =====================================================

  const fetchHistory = async () => {
    try {
      setLoading(true);

      const res = await API.get('/inventory-history');

      if (
        res.data &&
        res.data.success &&
        Array.isArray(res.data.history)
      ) {
        setHistory(res.data.history);
      } else if (Array.isArray(res.data)) {
        setHistory(res.data);
      } else {
        setHistory([]);
      }
    } catch (error) {
      console.error('Error fetching inventory history:', error);

      alert('Failed to load inventory history.');

      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // LOAD HISTORY
  // =====================================================

  useEffect(() => {
    fetchHistory();
  }, []);

  // =====================================================
  // FILTER
  // =====================================================

  const filteredHistory = history.filter((item) => {
    const query = searchQuery.toLowerCase().trim();

    const matchesType =
      typeFilter === 'ALL' ||
      String(item.type || '').toUpperCase() === typeFilter;

    if (!matchesType) {
      return false;
    }

    if (!query) {
      return true;
    }

    const productName = String(
      item.product_name || ''
    ).toLowerCase();

    const articleNumber = String(
      item.article_number || ''
    ).toLowerCase();

    const barcode = String(
      item.barcode || ''
    ).toLowerCase();

    const username = String(
      item.username || ''
    ).toLowerCase();

    const notes = String(
      item.notes || ''
    ).toLowerCase();

    return (
      productName.includes(query) ||
      articleNumber.includes(query) ||
      barcode.includes(query) ||
      username.includes(query) ||
      notes.includes(query)
    );
  });

  // =====================================================
  // CSV DOWNLOAD
  // =====================================================

  const downloadCSV = () => {
    if (filteredHistory.length === 0) {
      alert('There is no history to download.');
      return;
    }

    const headers = [
      'Date & Time',
      'Product',
      'Article Number',
      'Barcode',
      'Type',
      'Quantity',
      'Previous Stock',
      'New Stock',
      'User',
      'Notes'
    ];

    const rows = filteredHistory.map((item) => [
      item.created_at || '',
      item.product_name || '',
      item.article_number || '',
      item.barcode || '',
      item.type || '',
      item.quantity ?? 0,
      item.previous_stock ?? 0,
      item.new_stock ?? 0,
      item.username || '',
      item.notes || ''
    ]);

    const csvContent = [
      headers,
      ...rows
    ]
      .map((row) =>
        row
          .map((value) =>
            `"${String(value).replace(/"/g, '""')}"`
          )
          .join(',')
      )
      .join('\n');

    const blob = new Blob(
      [csvContent],
      {
        type: 'text/csv;charset=utf-8;'
      }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');

    link.href = url;

    link.download =
      `inventory-history-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  // =====================================================
  // EXCEL DOWNLOAD
  // =====================================================

  const downloadExcel = async () => {
    if (filteredHistory.length === 0) {
      alert('There is no history to download.');
      return;
    }

    try {
      const XLSX = await import('xlsx');

      const excelData = filteredHistory.map((item) => ({
        'Date & Time': item.created_at || '',
        'Product': item.product_name || '',
        'Article Number': item.article_number || '',
        'Barcode': item.barcode || '',
        'Type': item.type || '',
        'Quantity': item.quantity ?? 0,
        'Previous Stock': item.previous_stock ?? 0,
        'New Stock': item.new_stock ?? 0,
        'User': item.username || '',
        'Notes': item.notes || ''
      }));

      const worksheet =
        XLSX.utils.json_to_sheet(excelData);

      const workbook =
        XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        'Inventory History'
      );

      XLSX.writeFile(
        workbook,
        `inventory-history-${new Date()
          .toISOString()
          .slice(0, 10)}.xlsx`
      );
    } catch (error) {
      console.error(
        'Excel download error:',
        error
      );

      alert(
        'Excel export failed. Make sure the xlsx package is installed.'
      );
    }
  };

  // =====================================================
  // TYPE BADGE
  // =====================================================

  const getTypeBadge = (type) => {
    const normalizedType =
      String(type || '').toUpperCase();

    if (normalizedType === 'IN') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#dcfce7',
            color: '#15803d',
            padding: '5px 9px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 'bold'
          }}
        >
          <ArrowUpRight size={14} />
          STOCK IN
        </span>
      );
    }

    if (normalizedType === 'OUT') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            padding: '5px 9px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 'bold'
          }}
        >
          <ArrowDownRight size={14} />
          STOCK OUT
        </span>
      );
    }

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          backgroundColor: '#fef3c7',
          color: '#b45309',
          padding: '5px 9px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: 'bold'
        }}
      >
        <Settings2 size={14} />
        ADJUSTMENT
      </span>
    );
  };

  // =====================================================
  // DATE FORMAT
  // =====================================================

  const formatDate = (date) => {
    if (!date) {
      return '-';
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleString();
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div>

      {/* HEADER */}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          gap: '15px',
          flexWrap: 'wrap'
        }}
      >

        <div>
          <h2
            style={{
              margin: 0,
              color: '#0f172a'
            }}
          >
            📋 Inventory History
          </h2>

          <p
            style={{
              margin: '5px 0 0',
              color: '#64748b',
              fontSize: '14px'
            }}
          >
            View all stock IN and stock OUT transactions.
          </p>
        </div>

        {/* BUTTONS */}

        <div
          style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap'
          }}
        >

          <button
            onClick={fetchHistory}
            style={outlineBtnStyle}
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            onClick={downloadCSV}
            style={csvBtnStyle}
          >
            <Download size={16} />
            CSV
          </button>

          <button
            onClick={downloadExcel}
            style={excelBtnStyle}
          >
            <FileSpreadsheet size={16} />
            Excel
          </button>

        </div>

      </div>

      {/* SEARCH + FILTER */}

      <div
        style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '15px',
          flexWrap: 'wrap'
        }}
      >

        <div
          style={{
            position: 'relative',
            width: '350px'
          }}
        >

          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '10px',
              top: '11px',
              color: '#94a3b8'
            }}
          />

          <input
            type="text"
            placeholder="Search product, article, barcode..."
            value={searchQuery}
            onChange={(e) =>
              setSearchQuery(e.target.value)
            }
            style={{
              ...inputStyle,
              paddingLeft: '35px'
            }}
          />

        </div>

        <select
          value={typeFilter}
          onChange={(e) =>
            setTypeFilter(e.target.value)
          }
          style={filterStyle}
        >
          <option value="ALL">
            All Transactions
          </option>

          <option value="IN">
            Stock IN
          </option>

          <option value="OUT">
            Stock OUT
          </option>

          <option value="ADJUSTMENT">
            Adjustment
          </option>

        </select>

      </div>

      {/* COUNT */}

      <div
        style={{
          marginBottom: '12px',
          color: '#64748b',
          fontSize: '14px'
        }}
      >
        Showing {filteredHistory.length} of{' '}
        {history.length} transactions
      </div>

      {/* TABLE */}

      <div
        style={{
          overflowX: 'auto',
          backgroundColor: '#fff',
          borderRadius: '8px',
          boxShadow:
            '0 1px 3px rgba(0,0,0,0.1)'
        }}
      >

        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left'
          }}
        >

          <thead>

            <tr
              style={{
                backgroundColor: '#f8fafc',
                borderBottom:
                  '2px solid #e2e8f0'
              }}
            >

              <th style={thStyle}>
                Date & Time
              </th>

              <th style={thStyle}>
                Product
              </th>

              <th style={thStyle}>
                Article No.
              </th>

              <th style={thStyle}>
                Barcode
              </th>

              <th style={thStyle}>
                Type
              </th>

              <th style={thStyle}>
                Quantity
              </th>

              <th style={thStyle}>
                Previous Stock
              </th>

              <th style={thStyle}>
                New Stock
              </th>

              <th style={thStyle}>
                User
              </th>

              <th style={thStyle}>
                Notes
              </th>

            </tr>

          </thead>

          <tbody>

            {loading ? (

              <tr>
                <td
                  colSpan="10"
                  style={emptyStyle}
                >
                  Loading inventory history...
                </td>
              </tr>

            ) : filteredHistory.length > 0 ? (

              filteredHistory.map((item) => (

                <tr
                  key={item.id}
                  style={{
                    borderBottom:
                      '1px solid #f1f5f9'
                  }}
                >

                  <td style={tdStyle}>
                    {formatDate(item.created_at)}
                  </td>

                  <td
                    style={{
                      ...tdStyle,
                      fontWeight: '600'
                    }}
                  >
                    {item.product_name || '-'}
                  </td>

                  <td style={tdStyle}>
                    {item.article_number || '-'}
                  </td>

                  <td style={tdStyle}>
                    <code>
                      {item.barcode || '-'}
                    </code>
                  </td>

                  <td style={tdStyle}>
                    {getTypeBadge(item.type)}
                  </td>

                  <td
                    style={{
                      ...tdStyle,
                      fontWeight: 'bold',
                      textAlign: 'center'
                    }}
                  >
                    {item.quantity ?? 0}
                  </td>

                  <td
                    style={{
                      ...tdStyle,
                      textAlign: 'center'
                    }}
                  >
                    {item.previous_stock ?? 0}
                  </td>

                  <td
                    style={{
                      ...tdStyle,
                      textAlign: 'center',
                      fontWeight: 'bold',
                      color:
                        Number(item.new_stock) <
                        Number(item.previous_stock)
                          ? '#dc2626'
                          : '#15803d'
                    }}
                  >
                    {item.new_stock ?? 0}
                  </td>

                  <td style={tdStyle}>
                    {item.username || '-'}
                  </td>

                  <td
                    style={{
                      ...tdStyle,
                      maxWidth: '200px',
                      whiteSpace: 'normal'
                    }}
                  >
                    {item.notes || '-'}
                  </td>

                </tr>

              ))

            ) : (

              <tr>
                <td
                  colSpan="10"
                  style={emptyStyle}
                >
                  No inventory history found.
                </td>
              </tr>

            )}

          </tbody>

        </table>

      </div>

    </div>
  );
}

// =====================================================
// STYLES
// =====================================================

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  fontSize: '14px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  outline: 'none',
  boxSizing: 'border-box'
};

const filterStyle = {
  padding: '10px 14px',
  fontSize: '14px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  backgroundColor: '#fff',
  cursor: 'pointer'
};

const outlineBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '9px 13px',
  backgroundColor: '#fff',
  color: '#2563eb',
  border: '1px solid #2563eb',
  borderRadius: '6px',
  fontWeight: '600',
  fontSize: '13px',
  cursor: 'pointer'
};

const csvBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '9px 13px',
  backgroundColor: '#475569',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  fontWeight: '600',
  fontSize: '13px',
  cursor: 'pointer'
};

const excelBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '9px 13px',
  backgroundColor: '#16a34a',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  fontWeight: '600',
  fontSize: '13px',
  cursor: 'pointer'
};

const thStyle = {
  padding: '12px 14px',
  fontSize: '13px',
  whiteSpace: 'nowrap',
  color: '#475569'
};

const tdStyle = {
  padding: '11px 14px',
  fontSize: '13px',
  whiteSpace: 'nowrap'
};

const emptyStyle = {
  textAlign: 'center',
  padding: '40px',
  color: '#64748b'
};

