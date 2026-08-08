import { useState, useEffect, useRef } from 'react';
import InventoryHistory from './InventoryHistory';

import {
  Package,
  PlusCircle,
  ArrowUpRight,
  ArrowDownRight,
  LayoutDashboard,
  ScanBarcode,
  AlertTriangle,
  Search,
  X,
  Printer,
  RefreshCw,
  History

} from 'lucide-react';

import Barcode from 'react-barcode';
import API from './api';

export default function App() {
  const [activeTab, setActiveTab] = useState('scan');

  // =========================
  // DATA
  // =========================
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // =========================
  // SCANNER
  // =========================
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scannedProduct, setScannedProduct] = useState(null);
  const [notFoundBarcode, setNotFoundBarcode] = useState(null);

  const inputRef = useRef(null);

  // =========================
  // ADD PRODUCT
  // =========================
  const [showAddModal, setShowAddModal] = useState(false);

  const emptyProduct = {
    article_number: '',
    barcode: '',
    name: '',
    category_id: '',
    part_number: '',
    price: '',
    stock_quantity: '0',
    low_stock_threshold: '10',
    special_notes: ''
  };

  const [newProduct, setNewProduct] = useState(emptyProduct);

  // =========================
  // STOCK ADJUSTMENT MODAL
  // =========================
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockAction, setStockAction] = useState(null);
  const [stockAmount, setStockAmount] = useState('1');

  // =========================
  // PRINTING
  // =========================
  const [selectedProductIds, setSelectedProductIds] = useState(
    new Set()
  );

  // =========================
  // FETCH PRODUCTS
  // =========================
  const fetchProducts = async () => {
    try {
      const res = await API.get('/products');

      if (
        res.data &&
        res.data.success &&
        Array.isArray(res.data.products)
      ) {
        setProducts(res.data.products);
      } else if (Array.isArray(res.data)) {
        setProducts(res.data);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      setProducts([]);
    }
  };

  // =========================
  // FETCH CATEGORIES
  // =========================
  const fetchCategories = async () => {
    try {
      const res = await API.get('/categories');

      if (
        res.data &&
        res.data.success &&
        Array.isArray(res.data.categories)
      ) {
        setCategories(res.data.categories);
      } else if (Array.isArray(res.data)) {
        setCategories(res.data);
      } else {
        setCategories([]);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
      setCategories([]);
    }
  };

  // =========================
  // INITIAL LOAD
  // =========================
  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  // =========================
  // KEEP SCANNER FOCUSED
  // =========================
  useEffect(() => {
    if (
      activeTab === 'scan' &&
      !showAddModal &&
      !showStockModal
    ) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [activeTab, showAddModal, showStockModal]);

  // =========================
  // SELECT PRODUCT
  // =========================
  const toggleSelectProduct = (id) => {
    const updated = new Set(selectedProductIds);

    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }

    setSelectedProductIds(updated);
  };

  // =========================
  // SELECT ALL
  // =========================
  const toggleSelectAll = () => {
    if (
      selectedProductIds.size === filteredProducts.length &&
      filteredProducts.length > 0
    ) {
      setSelectedProductIds(new Set());
    } else {
      const allIds = new Set(
        filteredProducts.map((product) => product.id)
      );

      setSelectedProductIds(allIds);
    }
  };

  // =========================
  // PRINT SELECTED
  // =========================
  const handlePrintSelected = () => {
    if (selectedProductIds.size === 0) {
      alert('Please select at least one product.');
      return;
    }

    setTimeout(() => {
      window.print();
    }, 200);
  };

  // =========================
  // SCAN BARCODE
  // =========================
  const handleScan = async (e) => {
    e.preventDefault();

    const trimmedBarcode = barcodeInput.trim();

    if (!trimmedBarcode) return;

    try {
      const res = await API.get(
        `/products/scan/${encodeURIComponent(trimmedBarcode)}`
      );

      if (res.data && res.data.found) {
        setScannedProduct(res.data.product);
        setNotFoundBarcode(null);
      } else {
        setScannedProduct(null);
        setNotFoundBarcode(trimmedBarcode);
      }
    } catch (err) {
      console.error('Scan error:', err);

      alert(
        'Failed to connect to the server while scanning.'
      );
    } finally {
      setBarcodeInput('');

      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  // =========================
  // OPEN ADD PRODUCT MODAL
  // =========================
  const openAddProductModal = () => {
    setNewProduct(emptyProduct);
    setShowAddModal(true);
  };

  // =========================
  // ADD PRODUCT
  // =========================
  const handleAddProduct = async (e) => {
    e.preventDefault();

    if (!newProduct.article_number.trim()) {
      alert('Please enter an article number.');
      return;
    }

    if (!newProduct.barcode.trim()) {
      alert('Please enter a barcode.');
      return;
    }

    if (!newProduct.name.trim()) {
      alert('Please enter the product name.');
      return;
    }

    if (!newProduct.category_id) {
      alert('Please select a category.');
      return;
    }

    try {
      const payload = {
        article_number: newProduct.article_number.trim(),
        barcode: newProduct.barcode.trim(),
        name: newProduct.name.trim(),
        category_id: Number(newProduct.category_id),
        part_number:
          newProduct.part_number.trim() || null,
        price: parseFloat(newProduct.price) || 0,
        stock_quantity:
          parseInt(newProduct.stock_quantity) || 0,
        low_stock_threshold:
          parseInt(newProduct.low_stock_threshold) || 10,
        special_notes:
          newProduct.special_notes.trim() || null
      };

      const res = await API.post('/products', payload);

      if (res.data && res.data.success === false) {
        throw new Error(
          res.data.message || 'Failed to add product.'
        );
      }

      alert('Product added successfully.');

      setShowAddModal(false);
      setNewProduct(emptyProduct);

      await fetchProducts();

      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } catch (err) {
      console.error('Add product error:', err);

      const message =
        err.response?.data?.message ||
        err.message ||
        'Failed to add product.';

      alert(message);
    }
  };

  // =========================
  // ADD PRODUCT FROM SCAN
  // =========================
  const handleAddProductFromScan = async (e) => {
    e.preventDefault();

    if (!notFoundBarcode) return;

    if (!newProduct.article_number.trim()) {
      alert('Please enter an article number.');
      return;
    }

    if (!newProduct.name.trim()) {
      alert('Please enter the product name.');
      return;
    }

    if (!newProduct.category_id) {
      alert('Please select a category.');
      return;
    }

    try {
      const payload = {
        article_number: newProduct.article_number.trim(),
        barcode: notFoundBarcode,
        name: newProduct.name.trim(),
        category_id: Number(newProduct.category_id),
        part_number:
          newProduct.part_number.trim() || null,
        price: parseFloat(newProduct.price) || 0,
        stock_quantity:
          parseInt(newProduct.stock_quantity) || 0,
        low_stock_threshold:
          parseInt(newProduct.low_stock_threshold) || 10,
        special_notes:
          newProduct.special_notes.trim() || null
      };

      const res = await API.post('/products', payload);

      if (res.data && res.data.success === false) {
        throw new Error(
          res.data.message || 'Failed to save product.'
        );
      }

      const productRes = await API.get(
        `/products/scan/${encodeURIComponent(
          notFoundBarcode
        )}`
      );

      if (
        productRes.data &&
        productRes.data.found
      ) {
        setScannedProduct(productRes.data.product);
      }

      setNotFoundBarcode(null);
      setNewProduct(emptyProduct);

      await fetchProducts();

      alert('Product added successfully.');
    } catch (err) {
      console.error(
        'Add scanned product error:',
        err
      );

      const message =
        err.response?.data?.message ||
        err.message ||
        'Failed to save product.';

      alert(message);
    } finally {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  // =====================================================
  // OPEN STOCK ADJUSTMENT MODAL
  // =====================================================
  const openStockModal = (type) => {
    if (!scannedProduct) return;

    setStockAction(type);
    setStockAmount('1');
    setShowStockModal(true);
  };

  // =====================================================
  // CLOSE STOCK ADJUSTMENT MODAL
  // =====================================================
  const closeStockModal = () => {
    setShowStockModal(false);
    setStockAction(null);
    setStockAmount('1');

    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  // =====================================================
  // STOCK IN / OUT
  // =====================================================
  const handleStockAdjust = async () => {
    if (!scannedProduct) return;

    const amount = parseInt(stockAmount);

    // Validate quantity
    if (!amount || amount <= 0) {
      alert('Please enter a valid quantity greater than 0.');
      return;
    }

    // Check OUT stock
    if (
      stockAction === 'OUT' &&
      Number(scannedProduct.stock_quantity) < amount
    ) {
      alert(
        `Insufficient stock.\n\nAvailable stock: ${scannedProduct.stock_quantity}\nRequested: ${amount}`
      );
      return;
    }

    try {
      const res = await API.post(
        '/products/stock-adjust',
        {
          productId: scannedProduct.id,
          type: stockAction,
          quantity: amount
        }
      );

      if (res.data && res.data.success === false) {
        throw new Error(
          res.data.message ||
            'Failed to update stock.'
        );
      }

      // Get latest product
      const productRes = await API.get(
        `/products/scan/${encodeURIComponent(
          scannedProduct.barcode
        )}`
      );

      if (
        productRes.data &&
        productRes.data.found
      ) {
        setScannedProduct(
          productRes.data.product
        );
      }

      // Refresh dashboard data
      await fetchProducts();

      closeStockModal();

      alert(
        `Stock ${
          stockAction === 'IN'
            ? 'added'
            : 'removed'
        } successfully.\n\nQuantity: ${amount}`
      );
    } catch (err) {
      console.error(
        'Stock adjustment error:',
        err
      );

      const message =
        err.response?.data?.message ||
        err.message ||
        'Failed to update stock quantity.';

      alert(message);
    }
  };

  // =========================
  // FILTER PRODUCTS
  // =========================
  const filteredProducts = (products || []).filter(
    (p) => {
      const query =
        searchQuery.toLowerCase().trim();

      if (!query) return true;

      const articleMatch = p.article_number
        ? p.article_number
            .toLowerCase()
            .includes(query)
        : false;

      const barcodeMatch = p.barcode
        ? String(p.barcode)
            .toLowerCase()
            .includes(query)
        : false;

      const nameMatch = p.name
        ? p.name
            .toLowerCase()
            .includes(query)
        : false;

      const partNumberMatch = p.part_number
        ? p.part_number
            .toLowerCase()
            .includes(query)
        : false;

      const categoryMatch = p.category_name
        ? p.category_name
            .toLowerCase()
            .includes(query)
        : false;

      return (
        articleMatch ||
        barcodeMatch ||
        nameMatch ||
        partNumberMatch ||
        categoryMatch
      );
    }
  );

  // =========================
  // PRODUCTS TO PRINT
  // =========================
  const selectedProductsToPrint =
    products.filter((p) =>
      selectedProductIds.has(p.id)
    );

  // =========================
  // GET CATEGORY NAME
  // =========================
  const getCategoryName = (product) => {
    if (product.category_name) {
      return product.category_name;
    }

    const category = categories.find(
      (c) =>
        Number(c.id) ===
        Number(product.category_id)
    );

    return category
      ? category.category_name
      : 'Uncategorized';
  };

  return (
    <div
      style={{
        maxWidth: '1200px',
        margin: '30px auto',
        padding: '0 20px',
        fontFamily: 'system-ui, sans-serif'
      }}
    >
      {/* =====================================================
          PRINT STYLES
      ====================================================== */}

      <style>
        {`
          @media print {
            body * {
              visibility: hidden !important;
            }

            #printable-batch-labels,
            #printable-batch-labels * {
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
        `}
      </style>

      {/* =====================================================
          PRINTABLE LABELS
      ====================================================== */}

      <div
        id="printable-batch-labels"
        style={{ display: 'none' }}
      >
        {selectedProductsToPrint.map((p) => (
          <div
            key={p.id}
            className="printable-card"
          >
            <h4
              style={{
                margin: '0 0 4px 0',
                fontSize: '15px'
              }}
            >
              {p.name}
            </h4>

            <p
              style={{
                margin: '0 0 4px 0',
                fontSize: '12px'
              }}
            >
              Article: {p.article_number}
            </p>

            {p.part_number && (
              <p
                style={{
                  margin: '0 0 4px 0',
                  fontSize: '12px'
                }}
              >
                Part No: {p.part_number}
              </p>
            )}

            <p
              style={{
                margin: '0 0 6px 0',
                fontSize: '13px',
                fontWeight: 'bold'
              }}
            >
              Price: {p.price}
            </p>

            <Barcode
              value={String(p.barcode)}
              width={1.4}
              height={45}
              fontSize={13}
              margin={0}
            />
          </div>
        ))}
      </div>

      {/* =====================================================
          HEADER
      ====================================================== */}

      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}
      >
        <div>
          <h1
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#0f172a',
              margin: 0
            }}
          >
            <Package
              size={36}
              color="#2563eb"
            />

            ScanStock
          </h1>

          <p
            style={{
              color: '#64748b',
              margin: '5px 0 0 0'
            }}
          >
            Smart Barcode & Inventory Management
          </p>
        </div>

        <button
          onClick={openAddProductModal}
          style={accentBtnStyle}
        >
          <PlusCircle size={18} />
          Add New Product
        </button>
      </header>

      {/* =====================================================
          NAVIGATION
      ====================================================== */}

      <nav
        style={{
          display: 'flex',
          gap: '10px',
          borderBottom:
            '2px solid #e2e8f0',
          marginBottom: '25px',
          paddingBottom: '10px'
        }}
      >
        <button
          onClick={() =>
            setActiveTab('scan')
          }
          style={{
            ...tabBtnStyle,
            borderBottom:
              activeTab === 'scan'
                ? '3px solid #2563eb'
                : 'none',
            color:
              activeTab === 'scan'
                ? '#2563eb'
                : '#64748b'
          }}
        >
          <ScanBarcode size={18} />
          Scanner
        </button>

        <button
          onClick={() => {
            setActiveTab('dashboard');
            fetchProducts();
          }}
          style={{
            ...tabBtnStyle,
            borderBottom:
              activeTab === 'dashboard'
                ? '3px solid #2563eb'
                : 'none',
            color:
              activeTab === 'dashboard'
                ? '#2563eb'
                : '#64748b'
          }}
        >
          <LayoutDashboard size={18} />
          Inventory Dashboard
        </button>

<button
  onClick={() => setActiveTab('history')}
  style={{
    ...tabBtnStyle,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '7px',
    borderBottom:
      activeTab === 'history'
        ? '3px solid #2563eb'
        : 'none',
    color:
      activeTab === 'history'
        ? '#2563eb'
        : '#64748b'
  }}
>
  <History size={18} strokeWidth={2} />
  <span>Inventory History</span>
</button>
      </nav>

      {/* =====================================================
          SCANNER TAB
      ====================================================== */}

      {activeTab === 'scan' && (
        <div
          style={{
            maxWidth: '700px',
            margin: '0 auto'
          }}
        >
          <form
            onSubmit={handleScan}
            style={{
              display: 'flex',
              gap: '10px',
              marginBottom: '25px'
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={barcodeInput}
              onChange={(e) =>
                setBarcodeInput(
                  e.target.value
                )
              }
              placeholder="Scan barcode or type and press Enter..."
              style={inputStyle}
              autoFocus
            />

            <button
              type="submit"
              style={primaryBtnStyle}
            >
              <ScanBarcode size={20} />
              Scan
            </button>
          </form>

          {/* =================================================
              SCANNED PRODUCT
          ================================================== */}

          {scannedProduct && (
            <div
              style={{
                padding: '22px',
                border:
                  '2px solid #16a34a',
                borderRadius: '10px',
                backgroundColor: '#f0fdf4'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent:
                    'space-between',
                  alignItems:
                    'flex-start',
                  gap: '20px'
                }}
              >
                <div style={{ flex: 1 }}>
                  <h2
                    style={{
                      margin:
                        '0 0 15px 0',
                      color: '#15803d'
                    }}
                  >
                    {scannedProduct.name}
                  </h2>

                  <p>
                    <strong>
                      Article Number:
                    </strong>{' '}
                    <code>
                      {
                        scannedProduct.article_number
                      }
                    </code>
                  </p>

                  <p>
                    <strong>
                      Barcode:
                    </strong>{' '}
                    <code>
                      {
                        scannedProduct.barcode
                      }
                    </code>
                  </p>

                  <p>
                    <strong>
                      Category:
                    </strong>{' '}
                    {getCategoryName(
                      scannedProduct
                    )}
                  </p>

                  {scannedProduct.part_number && (
                    <p>
                      <strong>
                        Part Number:
                      </strong>{' '}
                      {
                        scannedProduct.part_number
                      }
                    </p>
                  )}

                  <p>
                    <strong>
                      Price:
                    </strong>{' '}
                    {
                      scannedProduct.price
                    }
                  </p>

                  {/* STOCK */}

                  <p
                    style={{
                      fontSize: '21px',
                      margin:
                        '12px 0'
                    }}
                  >
                    <strong>
                      Stock:
                    </strong>{' '}

                    <span
                      style={{
                        color:
                          Number(
                            scannedProduct.stock_quantity
                          ) <=
                          Number(
                            scannedProduct.low_stock_threshold
                          )
                            ? '#dc2626'
                            : '#15803d',

                        fontWeight:
                          'bold'
                      }}
                    >
                      {
                        scannedProduct.stock_quantity
                      }
                    </span>
                  </p>

                  {scannedProduct.special_notes && (
                    <div
                      style={{
                        marginTop:
                          '12px',
                        padding: '10px',
                        backgroundColor:
                          '#fff',
                        borderRadius:
                          '6px',
                        border:
                          '1px solid #bbf7d0'
                      }}
                    >
                      <strong>
                        Special Notes:
                      </strong>

                      <p
                        style={{
                          margin:
                            '5px 0 0'
                        }}
                      >
                        {
                          scannedProduct.special_notes
                        }
                      </p>
                    </div>
                  )}
                </div>

                {/* PRINT */}

                <button
                  onClick={() => {
                    setSelectedProductIds(
                      new Set([
                        scannedProduct.id
                      ])
                    );

                    setTimeout(() => {
                      window.print();
                    }, 200);
                  }}
                  style={outlineBtnStyle}
                >
                  <Printer size={16} />
                  Print Barcode
                </button>
              </div>

              {/* =================================================
                  STOCK BUTTONS
              ================================================== */}

              <div
                style={{
                  display: 'flex',
                  gap: '10px',
                  marginTop: '20px'
                }}
              >
                <button
                  onClick={() =>
                    openStockModal('IN')
                  }
                  style={{
                    ...successBtnStyle,
                    flex: 1,
                    justifyContent:
                      'center'
                  }}
                >
                  <ArrowUpRight
                    size={18}
                  />

                  Stock IN
                </button>

                <button
                  onClick={() =>
                    openStockModal('OUT')
                  }
                  style={{
                    ...dangerBtnStyle,
                    flex: 1,
                    justifyContent:
                      'center'
                  }}
                >
                  <ArrowDownRight
                    size={18}
                  />

                  Stock OUT
                </button>
              </div>
                                       
           </div>
          )}

          {/* =================================================
              PRODUCT NOT FOUND
          ================================================== */}

          {notFoundBarcode && (
            <div
              style={{
                padding: '20px',
                border:
                  '2px solid #eab308',
                borderRadius: '10px',
                backgroundColor:
                  '#fefce8'
              }}
            >
              <h3
                style={{
                  margin:
                    '0 0 10px 0',
                  color: '#a16207',
                  display: 'flex',
                  alignItems:
                    'center',
                  gap: '8px'
                }}
              >
                <PlusCircle size={20} />

                Product Not Found
              </h3>

              <p>
                Barcode{' '}
                <code>
                  {notFoundBarcode}
                </code>{' '}
                isn't in inventory yet.
              </p>

              <form
                onSubmit={
                  handleAddProductFromScan
                }
                style={{
                  display: 'flex',
                  flexDirection:
                    'column',
                  gap: '10px'
                }}
              >
                <input
                  type="text"
                  placeholder="Article Number"
                  required
                  value={
                    newProduct.article_number
                  }
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      article_number:
                        e.target.value
                    })
                  }
                  style={inputStyle}
                />

                <input
                  type="text"
                  value={
                    notFoundBarcode
                  }
                  disabled
                  style={{
                    ...inputStyle,
                    backgroundColor:
                      '#f1f5f9'
                  }}
                />

                <input
                  type="text"
                  placeholder="Product Name"
                  required
                  value={
                    newProduct.name
                  }
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      name: e.target.value
                    })
                  }
                  style={inputStyle}
                />

                <select
                  required
                  value={
                    newProduct.category_id
                  }
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      category_id:
                        e.target.value
                    })
                  }
                  style={inputStyle}
                >
                  <option value="">
                    Select Category
                  </option>

                  {categories.map(
                    (category) => (
                      <option
                        key={
                          category.id
                        }
                        value={
                          category.id
                        }
                      >
                        {
                          category.category_name
                        }
                      </option>
                    )
                  )}
                </select>

                <input
                  type="text"
                  placeholder="Part Number"
                  value={
                    newProduct.part_number
                  }
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      part_number:
                        e.target.value
                    })
                  }
                  style={inputStyle}
                />

                <input
                  type="number"
                  step="0.01"
                  placeholder="Price"
                  value={
                    newProduct.price
                  }
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      price:
                        e.target.value
                    })
                  }
                  style={inputStyle}
                />

                <input
                  type="number"
                  min="0"
                  placeholder="Initial Stock Quantity"
                  value={
                    newProduct.stock_quantity
                  }
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      stock_quantity:
                        e.target.value
                    })
                  }
                  style={inputStyle}
                />

                <input
                  type="number"
                  min="0"
                  placeholder="Low Stock Threshold"
                  value={
                    newProduct.low_stock_threshold
                  }
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      low_stock_threshold:
                        e.target.value
                    })
                  }
                  style={inputStyle}
                />

                <textarea
                  placeholder="Special Notes"
                  value={
                    newProduct.special_notes
                  }
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      special_notes:
                        e.target.value
                    })
                  }
                  style={{
                    ...inputStyle,
                    minHeight: '80px',
                    resize: 'vertical'
                  }}
                />

                <button
                  type="submit"
                  style={
                    warningBtnStyle
                  }
                >
                  Save Product to MySQL
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* =====================================================
          DASHBOARD
      ====================================================== */}

      {activeTab === 'dashboard' && (
        <div>
          {/* SEARCH + REFRESH + PRINT */}

          <div
            style={{
              display: 'flex',
              justifyContent:
                'space-between',
              alignItems: 'center',
              marginBottom: '15px',
              gap: '10px',
              flexWrap: 'wrap'
            }}
          >
            <div
              style={{
                position:
                  'relative',
                width: '350px'
              }}
            >
              <input
                type="text"
                placeholder="Search article, barcode, product..."
                value={
                  searchQuery
                }
                onChange={(e) =>
                  setSearchQuery(
                    e.target.value
                  )
                }
                style={{
                  ...inputStyle,
                  paddingLeft:
                    '35px'
                }}
              />

              <Search
                size={18}
                style={{
                  position:
                    'absolute',
                  left: '10px',
                  top: '12px',
                  color:
                    '#94a3b8'
                }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                gap: '10px'
              }}
            >
              <button
                onClick={() => {
                  fetchProducts();
                  fetchCategories();
                }}
                style={
                  outlineBtnStyle
                }
              >
                <RefreshCw
                  size={16}
                />

                Refresh
              </button>

              <button
                onClick={
                  handlePrintSelected
                }
                disabled={
                  selectedProductIds.size ===
                  0
                }
                style={{
                  ...primaryBtnStyle,
                  backgroundColor:
                    selectedProductIds.size >
                    0
                      ? '#2563eb'
                      : '#94a3b8',
                  cursor:
                    selectedProductIds.size >
                    0
                      ? 'pointer'
                      : 'not-allowed'
                }}
              >
                <Printer
                  size={18}
                />

                Print Selected (
                {
                  selectedProductIds.size
                }
                )
              </button>
            </div>
          </div>

          {/* PRODUCT COUNT */}

          <div
            style={{
              marginBottom: '12px',
              color: '#64748b',
              fontSize: '14px'
            }}
          >
            Showing{' '}
            {filteredProducts.length}{' '}
            of {products.length}{' '}
            products
          </div>

          {/* TABLE */}

          <div
            style={{
              overflowX: 'auto',
              backgroundColor:
                '#fff',
              borderRadius: '8px',
              boxShadow:
                '0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse:
                  'collapse',
                textAlign:
                  'left'
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor:
                      '#f8fafc',
                    borderBottom:
                      '2px solid #e2e8f0',
                    color:
                      '#475569'
                  }}
                >
                  <th
                    style={{
                      ...thStyle,
                      width: '40px',
                      textAlign:
                        'center'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={
                        filteredProducts.length >
                          0 &&
                        selectedProductIds.size ===
                          filteredProducts.length
                      }
                      onChange={
                        toggleSelectAll
                      }
                      style={{
                        width: '16px',
                        height:
                          '16px',
                        cursor:
                          'pointer'
                      }}
                    />
                  </th>

                  <th
                    style={thStyle}
                  >
                    Article No.
                  </th>

                  <th
                    style={thStyle}
                  >
                    Barcode
                  </th>

                  <th
                    style={thStyle}
                  >
                    Product
                  </th>

                  <th
                    style={thStyle}
                  >
                    Category
                  </th>

                  <th
                    style={thStyle}
                  >
                    Part Number
                  </th>

                  <th
                    style={thStyle}
                  >
                    Price
                  </th>

                  <th
                    style={thStyle}
                  >
                    Stock
                  </th>

                  <th
                    style={thStyle}
                  >
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredProducts.length >
                0 ? (
                  filteredProducts.map(
                    (p) => {
                      const isSelected =
                        selectedProductIds.has(
                          p.id
                        );

                      const isLowStock =
                        Number(
                          p.stock_quantity
                        ) <=
                        Number(
                          p.low_stock_threshold ||
                            10
                        );

                      return (
                        <tr
                          key={p.id}
                          style={{
                            borderBottom:
                              '1px solid #f1f5f9',
                            backgroundColor:
                              isSelected
                                ? '#eff6ff'
                                : 'transparent'
                          }}
                        >
                          <td
                            style={{
                              ...tdStyle,
                              textAlign:
                                'center'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={
                                isSelected
                              }
                              onChange={() =>
                                toggleSelectProduct(
                                  p.id
                                )
                              }
                              style={{
                                width:
                                  '16px',
                                height:
                                  '16px',
                                cursor:
                                  'pointer'
                              }}
                            />
                          </td>

                          <td
                            style={{
                              ...tdStyle,
                              fontWeight:
                                '600'
                            }}
                          >
                            {
                              p.article_number
                            }
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            <code>
                              {
                                p.barcode
                              }
                            </code>
                          </td>

                          <td
                            style={{
                              ...tdStyle,
                              fontWeight:
                                '600'
                            }}
                          >
                            {p.name}
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {getCategoryName(
                              p
                            )}
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {p.part_number ||
                              '-'}
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {p.price}
                          </td>

                          <td
                            style={{
                              ...tdStyle,
                              fontWeight:
                                'bold'
                            }}
                          >
                            {
                              p.stock_quantity
                            }
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {isLowStock ? (
                              <span
                                style={{
                                  display:
                                    'inline-flex',
                                  alignItems:
                                    'center',
                                  gap: '4px',
                                  backgroundColor:
                                    '#fef2f2',
                                  color:
                                    '#dc2626',
                                  padding:
                                    '4px 8px',
                                  borderRadius:
                                    '6px',
                                  fontSize:
                                    '13px',
                                  fontWeight:
                                    'bold'
                                }}
                              >
                                <AlertTriangle
                                  size={
                                    14
                                  }
                                />

                                Low Stock
                              </span>
                            ) : (
                              <span
                                style={{
                                  backgroundColor:
                                    '#f0fdf4',
                                  color:
                                    '#16a34a',
                                  padding:
                                    '4px 8px',
                                  borderRadius:
                                    '6px',
                                  fontSize:
                                    '13px',
                                  fontWeight:
                                    'bold'
                                }}
                              >
                                In Stock
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    }
                  )
                ) : (
                  <tr>
                    <td
                      colSpan="9"
                      style={{
                        textAlign:
                          'center',
                        padding:
                          '30px',
                        color:
                          '#64748b'
                      }}
                    >
                      No products found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
        </div>
        
      )}
       {/* =====================================================
    INVENTORY TRANSACTIONS
====================================================== */}

{activeTab === 'history' && (
  <InventoryHistory />
)}


      {/* =====================================================
          ADD PRODUCT MODAL
      ====================================================== */}

      {showAddModal && (
        <div
          style={
            modalOverlayStyle
          }
        >
          <div
            style={{
              ...modalContentStyle,
              width: '500px',
              maxHeight:
                '90vh',
              overflowY:
                'auto'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent:
                  'space-between',
                alignItems:
                  'center',
                marginBottom:
                  '20px'
              }}
            >
              <h3
                style={{
                  margin: 0,
                  display:
                    'flex',
                  alignItems:
                    'center',
                  gap: '8px'
                }}
              >
                <PlusCircle
                  size={22}
                  color="#2563eb"
                />

                Add New Product
              </h3>

              <button
                onClick={() =>
                  setShowAddModal(
                    false
                  )
                }
                style={{
                  background:
                    'none',
                  border:
                    'none',
                  cursor:
                    'pointer',
                  color:
                    '#64748b'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={
                handleAddProduct
              }
              style={{
                display:
                  'flex',
                flexDirection:
                  'column',
                gap: '12px'
              }}
            >
              <div>
                <label
                  style={
                    labelStyle
                  }
                >
                  Article Number *
                </label>

                <input
                  type="text"
                  required
                  placeholder="e.g. GEN-001"
                  value={
                    newProduct.article_number
                  }
                  onChange={(e) =>
                    setNewProduct(
                      {
                        ...newProduct,
                        article_number:
                          e.target.value
                      }
                    )
                  }
                  style={
                    inputStyle
                  }
                />
              </div>

              <div>
                <label
                  style={
                    labelStyle
                  }
                >
                  Barcode *
                </label>

                <input
                  type="text"
                  required
                  placeholder="Scan or enter barcode"
                  value={
                    newProduct.barcode
                  }
                  onChange={(e) =>
                    setNewProduct(
                      {
                        ...newProduct,
                        barcode:
                          e.target.value
                      }
                    )
                  }
                  style={
                    inputStyle
                  }
                />
              </div>

              <div>
                <label
                  style={
                    labelStyle
                  }
                >
                  Product Name *
                </label>

                <input
                  type="text"
                  required
                  placeholder="e.g. 5 KVA Diesel Generator"
                  value={
                    newProduct.name
                  }
                  onChange={(e) =>
                    setNewProduct(
                      {
                        ...newProduct,
                        name:
                          e.target.value
                      }
                    )
                  }
                  style={
                    inputStyle
                  }
                />
              </div>

              <div>
                <label
                  style={
                    labelStyle
                  }
                >
                  Category *
                </label>

                <select
                  required
                  value={
                    newProduct.category_id
                  }
                  onChange={(e) =>
                    setNewProduct(
                      {
                        ...newProduct,
                        category_id:
                          e.target.value
                      }
                    )
                  }
                  style={
                    inputStyle
                  }
                >
                  <option value="">
                    Select Category
                  </option>

                  {categories.map(
                    (category) => (
                      <option
                        key={
                          category.id
                        }
                        value={
                          category.id
                        }
                      >
                        {
                          category.category_name
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label
                  style={
                    labelStyle
                  }
                >
                  Part Number
                </label>

                <input
                  type="text"
                  placeholder="e.g. GEN-5KVA-001"
                  value={
                    newProduct.part_number
                  }
                  onChange={(e) =>
                    setNewProduct(
                      {
                        ...newProduct,
                        part_number:
                          e.target.value
                      }
                    )
                  }
                  style={
                    inputStyle
                  }
                />
              </div>

              <div>
                <label
                  style={
                    labelStyle
                  }
                >
                  Price
                </label>

                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={
                    newProduct.price
                  }
                  onChange={(e) =>
                    setNewProduct(
                      {
                        ...newProduct,
                        price:
                          e.target.value
                      }
                    )
                  }
                  style={
                    inputStyle
                  }
                />
              </div>

              <div>
                <label
                  style={
                    labelStyle
                  }
                >
                  Initial Stock Quantity
                </label>

                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={
                    newProduct.stock_quantity
                  }
                  onChange={(e) =>
                    setNewProduct(
                      {
                        ...newProduct,
                        stock_quantity:
                          e.target.value
                      }
                    )
                  }
                  style={
                    inputStyle
                  }
                />
              </div>

              <div>
                <label
                  style={
                    labelStyle
                  }
                >
                  Low Stock Threshold
                </label>

                <input
                  type="number"
                  min="0"
                  placeholder="10"
                  value={
                    newProduct.low_stock_threshold
                  }
                  onChange={(e) =>
                    setNewProduct(
                      {
                        ...newProduct,
                        low_stock_threshold:
                          e.target.value
                      }
                    )
                  }
                  style={
                    inputStyle
                  }
                />
              </div>

              <div>
                <label
                  style={
                    labelStyle
                  }
                >
                  Special Notes
                </label>

                <textarea
                  placeholder="Enter any special notes about this product..."
                  value={
                    newProduct.special_notes
                  }
                  onChange={(e) =>
                    setNewProduct(
                      {
                        ...newProduct,
                        special_notes:
                          e.target.value
                      }
                    )
                  }
                  style={{
                    ...inputStyle,
                    minHeight:
                      '90px',
                    resize:
                      'vertical'
                  }}
                />
              </div>

              <div
                style={{
                  display:
                    'flex',
                  gap: '10px',
                  marginTop:
                    '10px'
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setShowAddModal(
                      false
                    )
                  }
                  style={{
                    ...tabBtnStyle,
                    flex: 1,
                    justifyContent:
                      'center',
                    border:
                      '1px solid #cbd5e1'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  style={{
                    ...primaryBtnStyle,
                    flex: 1,
                    justifyContent:
                      'center'
                  }}
                >
                  <PlusCircle
                    size={18}
                  />

                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          STOCK ADJUSTMENT MODAL
      ====================================================== */}

      {showStockModal &&
        scannedProduct && (
          <div
            style={
              modalOverlayStyle
            }
          >
            <div
              style={{
                ...modalContentStyle,
                width: '420px'
              }}
            >
              {/* HEADER */}

              <div
                style={{
                  display:
                    'flex',
                  justifyContent:
                    'space-between',
                  alignItems:
                    'center',
                  marginBottom:
                    '20px'
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    display:
                      'flex',
                    alignItems:
                      'center',
                    gap: '8px',
                    color:
                      stockAction ===
                      'IN'
                        ? '#15803d'
                        : '#dc2626'
                  }}
                >
                  {stockAction ===
                  'IN' ? (
                    <ArrowUpRight
                      size={24}
                    />
                  ) : (
                    <ArrowDownRight
                      size={24}
                    />
                  )}

                  Stock{' '}
                  {stockAction ===
                  'IN'
                    ? 'IN'
                    : 'OUT'}
                </h3>

                <button
                  onClick={
                    closeStockModal
                  }
                  style={{
                    background:
                      'none',
                    border:
                      'none',
                    cursor:
                      'pointer',
                    color:
                      '#64748b'
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* PRODUCT */}

              <div
                style={{
                  padding:
                    '15px',
                  backgroundColor:
                    '#f8fafc',
                  borderRadius:
                    '8px',
                  marginBottom:
                    '20px'
                }}
              >
                <div
                  style={{
                    fontWeight:
                      'bold',
                    fontSize:
                      '17px',
                    marginBottom:
                      '5px'
                  }}
                >
                  {
                    scannedProduct.name
                  }
                </div>

                <div
                  style={{
                    color:
                      '#64748b',
                    fontSize:
                      '14px'
                  }}
                >
                  Article:{' '}
                  {
                    scannedProduct.article_number
                  }
                </div>

                <div
                  style={{
                    color:
                      '#64748b',
                    fontSize:
                      '14px'
                  }}
                >
                  Current Stock:{' '}

                  <strong
                    style={{
                      color:
                        '#0f172a',
                      fontSize:
                        '16px'
                    }}
                  >
                    {
                      scannedProduct.stock_quantity
                    }
                  </strong>
                </div>
              </div>

              {/* QUANTITY */}

              <label
                style={{
                  ...labelStyle,
                  fontSize:
                    '14px'
                }}
              >
                Quantity to{' '}
                {stockAction ===
                'IN'
                  ? 'Add'
                  : 'Remove'}
              </label>

              <input
                type="number"
                min="1"
                step="1"
                autoFocus
                value={
                  stockAmount
                }
                onChange={(e) =>
                  setStockAmount(
                    e.target.value
                  )
                }
                onKeyDown={(e) => {
                  if (
                    e.key ===
                    'Enter'
                  ) {
                    handleStockAdjust();
                  }
                }}
                style={{
                  ...inputStyle,
                  fontSize:
                    '20px',
                  textAlign:
                    'center',
                  fontWeight:
                    'bold',
                  marginBottom:
                    '15px'
                }}
              />

              {/* PREVIEW */}

              <div
                style={{
                  padding:
                    '12px',
                  backgroundColor:
                    stockAction ===
                    'IN'
                      ? '#f0fdf4'
                      : '#fef2f2',
                  border:
                    `1px solid ${
                      stockAction ===
                      'IN'
                        ? '#bbf7d0'
                        : '#fecaca'
                    }`,
                  borderRadius:
                    '8px',
                  textAlign:
                    'center',
                  marginBottom:
                    '20px'
                }}
              >
                <span
                  style={{
                    color:
                      '#64748b'
                  }}
                >
                  New Stock:{' '}
                </span>

                <strong
                  style={{
                    fontSize:
                      '20px',
                    color:
                      stockAction ===
                      'IN'
                        ? '#15803d'
                        : '#dc2626'
                  }}
                >
                  {(
                    Number(
                      scannedProduct.stock_quantity
                    ) +
                    (stockAction ===
                    'IN'
                      ? Number(
                          stockAmount
                        ) || 0
                      : -(
                          Number(
                            stockAmount
                          ) || 0
                        ))
                  )}
                </strong>
              </div>

              {/* BUTTONS */}

              <div
                style={{
                  display:
                    'flex',
                  gap: '10px'
                }}
              >
                <button
                  type="button"
                  onClick={
                    closeStockModal
                  }
                  style={{
                    ...tabBtnStyle,
                    flex: 1,
                    justifyContent:
                      'center',
                    border:
                      '1px solid #cbd5e1',
                    borderRadius:
                      '6px'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    handleStockAdjust
                  }
                  style={{
                    ...(stockAction ===
                    'IN'
                      ? successBtnStyle
                      : dangerBtnStyle),
                    flex: 1,
                    justifyContent:
                      'center'
                  }}
                >
                  {stockAction ===
                  'IN' ? (
                    <ArrowUpRight
                      size={18}
                    />
                  ) : (
                    <ArrowDownRight
                      size={18}
                    />
                  )}

                  Confirm{' '}
                  {stockAction ===
                  'IN'
                    ? 'IN'
                    : 'OUT'}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

// =====================================================
// STYLES
// =====================================================

const tabBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '10px 16px',
  background: 'none',
  border: 'none',
  fontWeight: 'bold',
  fontSize: '15px',
  cursor: 'pointer'
};

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  fontSize: '15px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  outline: 'none',
  boxSizing: 'border-box'
};

const labelStyle = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 'bold',
  color: '#475569',
  marginBottom: '4px'
};

const primaryBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  padding: '10px 18px',
  backgroundColor: '#2563eb',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  fontWeight: 'bold',
  cursor: 'pointer'
};

const accentBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '10px 18px',
  backgroundColor: '#0f172a',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  fontWeight: 'bold',
  cursor: 'pointer'
};

const outlineBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 12px',
  backgroundColor: '#fff',
  color: '#2563eb',
  border: '1px solid #2563eb',
  borderRadius: '6px',
  fontWeight: '600',
  fontSize: '13px',
  cursor: 'pointer'
};

const successBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 14px',
  backgroundColor: '#16a34a',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  fontWeight: 'bold',
  cursor: 'pointer'
};

const dangerBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 14px',
  backgroundColor: '#dc2626',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  fontWeight: 'bold',
  cursor: 'pointer'
};

const warningBtnStyle = {
  padding: '10px',
  backgroundColor: '#ca8a04',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  fontWeight: 'bold',
  cursor: 'pointer'
};

const thStyle = {
  padding: '12px 16px',
  fontSize: '14px',
  whiteSpace: 'nowrap'
};

const tdStyle = {
  padding: '12px 16px',
  fontSize: '14px',
  whiteSpace: 'nowrap'
};

const modalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000
};

const modalContentStyle = {
  backgroundColor: '#fff',
  padding: '25px',
  borderRadius: '12px',
  width: '420px',
  maxWidth: '90%',
  boxShadow:
    '0 20px 25px -5px rgba(0,0,0,0.1)'
};

