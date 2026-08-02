import { useState, useEffect, useRef } from 'react';
import { ScanBarcode, Package, PlusCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import API from './api';

export default function App() {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scannedProduct, setScannedProduct] = useState(null);
  const [notFoundBarcode, setNotFoundBarcode] = useState(null);
  const [newProduct, setNewProduct] = useState({ name: '', price: '', stock_quantity: '' });
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle Barcode Scan / Submit
  const handleScan = async (e) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    try {
      const res = await API.get(`/products/scan/${barcodeInput.trim()}`);
      if (res.data.found) {
        setScannedProduct(res.data.product);
        setNotFoundBarcode(null);
      } else {
        setNotFoundBarcode(res.data.barcode);
        setScannedProduct(null);
      }
    } catch (err) {
      console.error('Scan error:', err);
    }
    setBarcodeInput('');
  };

  // Handle Adding New Product
  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      await API.post('/products', {
        barcode: notFoundBarcode,
        name: newProduct.name,
        price: parseFloat(newProduct.price) || 0,
        stock_quantity: parseInt(newProduct.stock_quantity) || 0
      });
      alert('Product Added Successfully!');
      
      // Reload scanned product details
      const res = await API.get(`/products/scan/${notFoundBarcode}`);
      setScannedProduct(res.data.product);
      setNotFoundBarcode(null);
      setNewProduct({ name: '', price: '', stock_quantity: '' });
    } catch (err) {
      console.error('Add product error:', err);
    }
  };

  // Handle Quick Stock Adjustment
  const handleStockAdjust = async (type, amount = 1) => {
    if (!scannedProduct) return;
    try {
      await API.post('/products/stock-adjust', {
        productId: scannedProduct.id,
        type,
        quantity: amount
      });
      // Refresh current product
      const res = await API.get(`/products/scan/${scannedProduct.barcode}`);
      setScannedProduct(res.data.product);
    } catch (err) {
      console.error('Stock adjustment error:', err);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px', fontFamily: 'sans-serif' }}>
      <header style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#1e293b' }}>
          <Package size={36} color="#007bff" /> ScanStock
        </h1>
        <p style={{ color: '#64748b' }}>Barcode-Driven Inventory System</p>
      </header>

      {/* Barcode Input Form */}
      <form onSubmit={handleScan} style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
        <input
          ref={inputRef}
          type="text"
          value={barcodeInput}
          onChange={(e) => setBarcodeInput(e.target.value)}
          placeholder="Scan product barcode..."
          style={{ flex: 1, padding: '12px 16px', fontSize: '16px', borderRadius: '8px', border: '2px solid #007bff' }}
        />
        <button type="submit" style={{ padding: '12px 20px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
          <ScanBarcode size={20} /> Scan
        </button>
      </form>

      {/* Product Found View */}
      {scannedProduct && (
        <div style={{ padding: '20px', border: '2px solid #22c55e', borderRadius: '8px', backgroundColor: '#f0fdf4' }}>
          <h2 style={{ margin: '0 0 10px 0', color: '#15803d' }}>{scannedProduct.name}</h2>
          <p><strong>Barcode:</strong> <code>{scannedProduct.barcode}</code></p>
          <p><strong>Price:</strong> ${scannedProduct.price}</p>
          <p style={{ fontSize: '20px' }}><strong>Stock Quantity:</strong> <span style={{ color: '#15803d', fontWeight: 'bold' }}>{scannedProduct.stock_quantity}</span></p>

          <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
            <button onClick={() => handleStockAdjust('IN', 1)} style={{ padding: '10px 16px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              <ArrowUpRight size={18} /> Stock IN (+1)
            </button>
            <button onClick={() => handleStockAdjust('OUT', 1)} style={{ padding: '10px 16px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              <ArrowDownRight size={18} /> Stock OUT (-1)
            </button>
          </div>
        </div>
      )}

      {/* Product Not Found -> Add Product Form */}
      {notFoundBarcode && (
        <div style={{ padding: '20px', border: '2px solid #eab308', borderRadius: '8px', backgroundColor: '#fefce8' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#a16207' }}><PlusCircle size={20} /> Product Not Found</h3>
          <p>Barcode <code>{notFoundBarcode}</code> isn't in your inventory yet. Add it below:</p>

          <form onSubmit={handleAddProduct} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              type="text"
              placeholder="Product Name"
              required
              value={newProduct.name}
              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
            <input
              type="number"
              step="0.01"
              placeholder="Price ($)"
              value={newProduct.price}
              onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
            <input
              type="number"
              placeholder="Initial Stock Quantity"
              value={newProduct.stock_quantity}
              onChange={(e) => setNewProduct({ ...newProduct, stock_quantity: e.target.value })}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
            <button type="submit" style={{ padding: '10px', backgroundColor: '#ca8a04', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
              Save Product to XAMPP MySQL
            </button>
          </form>
        </div>
      )}
    </div>
  );
}