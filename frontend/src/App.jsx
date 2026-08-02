import { useState, useEffect, useRef } from 'react';
import { Package, PlusCircle, ArrowUpRight, ArrowDownRight, LayoutDashboard, ScanBarcode, AlertTriangle, Search, Sparkles, X, Printer, CheckSquare, Square } from 'lucide-react';
import Barcode from 'react-barcode';
import API from './api';

export default function App() {
  const [activeTab, setActiveTab] = useState('scan'); // 'scan' | 'dashboard'
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Products for Batch Printing (Set of product IDs)
  const [selectedProductIds, setSelectedProductIds] = useState(new Set());

  // Modal State for Manual / Barcodeless Product Creation
  const [showAddModal, setShowAddModal] = useState(false);
  const [isAutoBarcode, setIsAutoBarcode] = useState(true);
  const [customProduct, setCustomProduct] = useState({ barcode: '', name: '', price: '', stock_quantity: '0', low_stock_threshold: '10' });

  // Scanner State
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scannedProduct, setScannedProduct] = useState(null);
  const [notFoundBarcode, setNotFoundBarcode] = useState(null);
  const [newProduct, setNewProduct] = useState({ name: '', price: '', stock_quantity: '', low_stock_threshold: '10' });
  const inputRef = useRef(null);

  // Fetch all products
  const fetchProducts = async () => {
    try {
      const res = await API.get('/products');
      if (res.data && res.data.success && Array.isArray(res.data.products)) {
        setProducts(res.data.products);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      setProducts([]);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (activeTab === 'scan' && !showAddModal) {
      inputRef.current?.focus();
    }
  }, [activeTab, showAddModal]);

  // Toggle selection of a single product
  const toggleSelectProduct = (id) => {
    const updated = new Set(selectedProductIds);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setSelectedProductIds(updated);
  };

  // Toggle Select All filtered products
  const toggleSelectAll = () => {
    if (selectedProductIds.size === filteredProducts.length && filteredProducts.length > 0) {
      setSelectedProductIds(new Set());
    } else {
      const allIds = new Set(filteredProducts.map(p => p.id));
      setSelectedProductIds(allIds);
    }
  };

  // Trigger print preview for selected products
  const handlePrintSelected = () => {
    if (selectedProductIds.size === 0) {
      alert('Please select at least one barcode to print.');
      return;
    }
    setTimeout(() => {
      window.print();
    }, 200);
  };

  // Handle Barcode Scan
  const handleScan = async (e) => {
    e.preventDefault();
    const trimmedBarcode = barcodeInput.trim();
    if (!trimmedBarcode) return;

    try {
      const res = await API.get(`/products/scan/${trimmedBarcode}`);
      if (res.data && res.data.found) {
        setScannedProduct(res.data.product);
        setNotFoundBarcode(null);
      } else {
        setNotFoundBarcode(trimmedBarcode);
        setScannedProduct(null);
      }
    } catch (err) {
      console.error('Scan error:', err);
      alert('Failed to connect to server while scanning.');
    } finally {
      setBarcodeInput('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // Handle Adding Product from Scanned Not-Found Barcode
  const handleAddProductFromScan = async (e) => {
    e.preventDefault();
    if (!notFoundBarcode) return;

    try {
      await API.post('/products', {
        barcode: notFoundBarcode,
        name: newProduct.name,
        price: parseFloat(newProduct.price) || 0,
        stock_quantity: parseInt(newProduct.stock_quantity) || 0,
        low_stock_threshold: parseInt(newProduct.low_stock_threshold) || 10
      });

      const res = await API.get(`/products/scan/${notFoundBarcode}`);
      if (res.data && res.data.found) {
        setScannedProduct(res.data.product);
      }

      setNotFoundBarcode(null);
      setNewProduct({ name: '', price: '', stock_quantity: '', low_stock_threshold: '10' });
      fetchProducts();
    } catch (err) {
      console.error('Add product error:', err);
      alert('Failed to save product.');
    } finally {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // Handle Adding Custom/Barcodeless Product via Modal
  const handleAddCustomProduct = async (e) => {
    e.preventDefault();
    try {
      if (isAutoBarcode) {
        const res = await API.post('/products/auto-generate', {
          name: customProduct.name,
          price: parseFloat(customProduct.price) || 0,
          stock_quantity: parseInt(customProduct.stock_quantity) || 0,
          low_stock_threshold: parseInt(customProduct.low_stock_threshold) || 10
        });

        alert(`Product added! Generated Barcode: ${res.data.barcode}`);
      } else {
        if (!customProduct.barcode.trim()) {
          alert('Please enter a barcode or switch to Auto-Generate.');
          return;
        }

        await API.post('/products', {
          barcode: customProduct.barcode.trim(),
          name: customProduct.name,
          price: parseFloat(customProduct.price) || 0,
          stock_quantity: parseInt(customProduct.stock_quantity) || 0,
          low_stock_threshold: parseInt(customProduct.low_stock_threshold) || 10
        });

        alert('Product added successfully!');
      }

      setShowAddModal(false);
      setCustomProduct({ barcode: '', name: '', price: '', stock_quantity: '0', low_stock_threshold: '10' });
      fetchProducts();
    } catch (err) {
      console.error('Add custom product error:', err);
      alert('Failed to add product. Make sure the barcode is unique.');
    }
  };

  // Handle Stock Adjustment
  const handleStockAdjust = async (type, amount = 1) => {
    if (!scannedProduct) return;

    try {
      await API.post('/products/stock-adjust', {
        productId: scannedProduct.id,
        type,
        quantity: amount
      });

      const res = await API.get(`/products/scan/${scannedProduct.barcode}`);
      if (res.data && res.data.found) {
        setScannedProduct(res.data.product);
      }

      fetchProducts();
    } catch (err) {
      console.error('Stock adjustment error:', err);
      alert('Failed to update stock quantity.');
    } finally {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // Safe Filtered products
  const filteredProducts = (products || []).filter((p) => {
    const query = searchQuery.toLowerCase();
    const nameMatch = p.name ? p.name.toLowerCase().includes(query) : false;
    const barcodeMatch = p.barcode ? String(p.barcode).includes(query) : false;
    return nameMatch || barcodeMatch;
  });

  // Selected products object list for printing
  const selectedProductsToPrint = products.filter(p => selectedProductIds.has(p.id));

  return (
    <div style={{ maxWidth: '1000px', margin: '30px auto', padding: '0 20px', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* Printable Barcodes Area (Hidden on screen, visible ONLY during printing) */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-batch-labels, #printable-batch-labels * {
            visibility: visible !important;
          }
          #printable-batch-labels {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 15px !important;
            padding: 10px !important;
          }
          .printable-card {
            border: 1px solid #000 !important;
            padding: 10px !important;
            border-radius: 6px !important;
            text-align: center !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Hidden printable barcode container for selected batch */}
      <div id="printable-batch-labels" style={{ display: 'none' }}>
        {selectedProductsToPrint.map((p) => (
          <div key={p.id} className="printable-card">
            <h4 style={{ margin: '0 0 4px 0', fontSize: '15px' }}>{p.name}</h4>
            <p style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 'bold' }}>Price: ${p.price}</p>
            <Barcode value={String(p.barcode)} width={1.4} height={45} fontSize={13} margin={0} />
          </div>
        ))}
      </div>

      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#0f172a', margin: 0 }}>
            <Package size={36} color="#2563eb" /> ScanStock
          </h1>
          <p style={{ color: '#64748b', margin: '5px 0 0 0' }}>Smart Barcode & Inventory Management</p>
        </div>

        <button onClick={() => setShowAddModal(true)} style={accentBtnStyle}>
          <PlusCircle size={18} /> Add New Item
        </button>
      </header>

      {/* Navigation Tabs */}
      <nav style={{ display: 'flex', gap: '10px', borderBottom: '2px solid #e2e8f0', marginBottom: '25px', paddingBottom: '10px' }}>
        <button 
          onClick={() => setActiveTab('scan')} 
          style={{ ...tabBtnStyle, borderBottom: activeTab === 'scan' ? '3px solid #2563eb' : 'none', color: activeTab === 'scan' ? '#2563eb' : '#64748b' }}
        >
          <ScanBarcode size={18} /> Scanner
        </button>
        <button 
          onClick={() => { setActiveTab('dashboard'); fetchProducts(); }} 
          style={{ ...tabBtnStyle, borderBottom: activeTab === 'dashboard' ? '3px solid #2563eb' : 'none', color: activeTab === 'dashboard' ? '#2563eb' : '#64748b' }}
        >
          <LayoutDashboard size={18} /> Inventory Dashboard
        </button>
      </nav>

      {/* TAB 1: SCANNER */}
      {activeTab === 'scan' && (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <form onSubmit={handleScan} style={{ display: 'flex', gap: '10px', marginBottom: '25px' }}>
            <input
              ref={inputRef}
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder="Scan barcode or type and press Enter..."
              style={inputStyle}
            />
            <button type="submit" style={primaryBtnStyle}>
              <ScanBarcode size={20} /> Scan
            </button>
          </form>

          {scannedProduct && (
            <div style={{ padding: '20px', border: '2px solid #16a34a', borderRadius: '10px', backgroundColor: '#f0fdf4' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ margin: '0 0 10px 0', color: '#15803d' }}>{scannedProduct.name}</h2>
                  <p style={{ margin: '5px 0' }}><strong>Barcode:</strong> <code>{scannedProduct.barcode}</code></p>
                  <p style={{ margin: '5px 0' }}><strong>Price:</strong> ${scannedProduct.price}</p>
                  <p style={{ fontSize: '20px', margin: '10px 0' }}>
                    <strong>Stock Quantity:</strong>{' '}
                    <span style={{ color: Number(scannedProduct.stock_quantity) <= Number(scannedProduct.low_stock_threshold) ? '#dc2626' : '#15803d', fontWeight: 'bold' }}>
                      {scannedProduct.stock_quantity}
                    </span>
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setSelectedProductIds(new Set([scannedProduct.id]));
                    setTimeout(() => window.print(), 200);
                  }} 
                  style={outlineBtnStyle}
                >
                  <Printer size={16} /> Print Barcode
                </button>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <button onClick={() => handleStockAdjust('IN', 1)} style={successBtnStyle}>
                  <ArrowUpRight size={18} /> Stock IN (+1)
                </button>
                <button onClick={() => handleStockAdjust('OUT', 1)} style={dangerBtnStyle}>
                  <ArrowDownRight size={18} /> Stock OUT (-1)
                </button>
              </div>
            </div>
          )}

          {notFoundBarcode && (
            <div style={{ padding: '20px', border: '2px solid #eab308', borderRadius: '10px', backgroundColor: '#fefce8' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#a16207', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PlusCircle size={20} /> Product Not Found
              </h3>
              <p>Barcode <code>{notFoundBarcode}</code> isn't in inventory yet. Add details below:</p>

              <form onSubmit={handleAddProductFromScan} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input type="text" placeholder="Product Name" required value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} style={inputStyle} />
                <input type="number" step="0.01" placeholder="Price ($)" value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })} style={inputStyle} />
                <input type="number" placeholder="Initial Stock Quantity" value={newProduct.stock_quantity} onChange={(e) => setNewProduct({ ...newProduct, stock_quantity: e.target.value })} style={inputStyle} />
                <input type="number" placeholder="Low Stock Threshold" value={newProduct.low_stock_threshold} onChange={(e) => setNewProduct({ ...newProduct, low_stock_threshold: e.target.value })} style={inputStyle} />
                <button type="submit" style={warningBtnStyle}>Save Product to MySQL</button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: INVENTORY DASHBOARD WITH MULTI-SELECT PRINTING */}
      {activeTab === 'dashboard' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <div style={{ position: 'relative', width: '300px' }}>
              <input
                type="text"
                placeholder="Search products or barcodes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ ...inputStyle, width: '100%', paddingLeft: '35px' }}
              />
              <Search size={18} style={{ position: 'absolute', left: '10px', top: '12px', color: '#94a3b8' }} />
            </div>

            {/* Print Selected Barcodes Button */}
            <button 
              onClick={handlePrintSelected} 
              disabled={selectedProductIds.size === 0}
              style={{
                ...primaryBtnStyle,
                backgroundColor: selectedProductIds.size > 0 ? '#2563eb' : '#94a3b8',
                cursor: selectedProductIds.size > 0 ? 'pointer' : 'not-allowed'
              }}
            >
              <Printer size={18} /> Print Selected ({selectedProductIds.size})
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                <th style={{ ...thStyle, width: '40px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={filteredProducts.length > 0 && selectedProductIds.size === filteredProducts.length}
                    onChange={toggleSelectAll}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                </th>
                <th style={thStyle}>Barcode</th>
                <th style={thStyle}>Product Name</th>
                <th style={thStyle}>Price</th>
                <th style={thStyle}>Stock</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length > 0 ? (
                filteredProducts.map((p) => {
                  const isSelected = selectedProductIds.has(p.id);
                  const isLowStock = Number(p.stock_quantity) <= Number(p.low_stock_threshold || 10);
                  
                  return (
                    <tr 
                      key={p.id} 
                      style={{ 
                        borderBottom: '1px solid #f1f5f9', 
                        backgroundColor: isSelected ? '#eff6ff' : 'transparent' 
                      }}
                    >
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectProduct(p.id)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                      </td>
                      <td style={tdStyle}><code>{p.barcode}</code></td>
                      <td style={{ ...tdStyle, fontWeight: '600' }}>{p.name}</td>
                      <td style={tdStyle}>${p.price}</td>
                      <td style={{ ...tdStyle, fontWeight: 'bold' }}>{p.stock_quantity}</td>
                      <td style={tdStyle}>
                        {isLowStock ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#fef2f2', color: '#dc2626', padding: '4px 8px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold' }}>
                            <AlertTriangle size={14} /> Low Stock (≤{p.low_stock_threshold || 10})
                          </span>
                        ) : (
                          <span style={{ backgroundColor: '#f0fdf4', color: '#16a34a', padding: '4px 8px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold' }}>
                            In Stock
                          </span>
                        )}
                      </td>
                     
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                    No products found in database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: ADD PRODUCT */}
      {showAddModal && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PlusCircle size={22} color="#2563eb" /> Add New Item to Inventory
              </h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '6px' }}>
              <button
                onClick={() => setIsAutoBarcode(true)}
                style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: isAutoBarcode ? '#fff' : 'transparent', color: isAutoBarcode ? '#2563eb' : '#64748b', boxShadow: isAutoBarcode ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
              >
                <Sparkles size={14} style={{ marginRight: '5px' }} /> Auto Barcode
              </button>
              <button
                onClick={() => setIsAutoBarcode(false)}
                style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: !isAutoBarcode ? '#fff' : 'transparent', color: !isAutoBarcode ? '#2563eb' : '#64748b', boxShadow: !isAutoBarcode ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
              >
                Manual Barcode
              </button>
            </div>

            <form onSubmit={handleAddCustomProduct} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {!isAutoBarcode && (
                <div>
                  <label style={labelStyle}>Barcode / SKU</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., 890123456"
                    value={customProduct.barcode}
                    onChange={(e) => setCustomProduct({ ...customProduct, barcode: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              )}

             {isAutoBarcode && (
  <div style={{ backgroundColor: '#eff6ff', padding: '10px', borderRadius: '6px', fontSize: '13px', color: '#1e40af' }}>
    ℹ️ Pure numeric barcode like <code>890482910482</code> will be assigned automatically.
  </div>
)}

              <div>
                <label style={labelStyle}>Product Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Mechanical RGB Keyboard"
                  value={customProduct.name}
                  onChange={(e) => setCustomProduct({ ...customProduct, name: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={customProduct.price}
                  onChange={(e) => setCustomProduct({ ...customProduct, price: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Initial Stock Quantity</label>
                <input
                  type="number"
                  placeholder="0"
                  value={customProduct.stock_quantity}
                  onChange={(e) => setCustomProduct({ ...customProduct, stock_quantity: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Low Stock Alert Threshold</label>
                <input
                  type="number"
                  placeholder="10"
                  value={customProduct.low_stock_threshold}
                  onChange={(e) => setCustomProduct({ ...customProduct, low_stock_threshold: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ ...tabBtnStyle, flex: 1, border: '1px solid #cbd5e1', justifyContent: 'center' }}>
                  Cancel
                </button>
                <button type="submit" style={{ ...primaryBtnStyle, flex: 1, justifyContent: 'center' }}>
                  Save Product
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}

// Styles
const tabBtnStyle = { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'none', border: 'none', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' };
const inputStyle = { width: '100%', padding: '10px 14px', fontSize: '15px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' };
const primaryBtnStyle = { display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' };
const accentBtnStyle = { display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' };
const outlineBtnStyle = { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: '#fff', color: '#2563eb', border: '1px solid #2563eb', borderRadius: '6px', fontWeight: '600', fontSize: '13px', cursor: 'pointer' };
const successBtnStyle = { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' };
const dangerBtnStyle = { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' };
const warningBtnStyle = { padding: '10px', backgroundColor: '#ca8a04', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' };
const thStyle = { padding: '12px 16px', fontSize: '14px' };
const tdStyle = { padding: '12px 16px', fontSize: '14px' };
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContentStyle = { backgroundColor: '#fff', padding: '25px', borderRadius: '12px', width: '420px', maxWidth: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' };