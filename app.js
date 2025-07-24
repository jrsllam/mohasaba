// تحديث ملف app.js ليتعامل مع أزرار التنقل العلوية ويُصلح مشكلات التنقل المبلغ عنها

// ========== البيانات ==========
const AppData = {
  products: [],
  sales: [],
  purchases: []
};

// ========== عناصر DOM ==========
const sections = document.querySelectorAll('.page-section');

// التنقل (رأس + جانبى)
const topNavBtns = document.querySelectorAll('.nav-btn');
const sidebarLinks = document.querySelectorAll('.sidebar__link');
const burgerBtn = document.getElementById('burgerBtn');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');

// زر الوضع الليلي
const themeToggleBtn = document.getElementById('themeToggleBtn');

// لوحة التحكم
const todaySalesEl = document.getElementById('todaySales');
const todayPurchasesEl = document.getElementById('todayPurchases');
const todayNetEl = document.getElementById('todayNet');
const lowStockContainer = document.getElementById('lowStockContainer');

// الأصناف
const addProductBtn = document.getElementById('addProductBtn');
const productsTableBody = document.getElementById('productsTable').querySelector('tbody');
const productModal = document.getElementById('productModal');
const productForm = document.getElementById('productForm');
const cancelProductBtn = document.getElementById('cancelProductBtn');
const productModalTitle = document.getElementById('productModalTitle');

// المعاملات
const tabBtns = document.querySelectorAll('.tab-btn');
const salesForm = document.getElementById('salesForm');
const purchasesForm = document.getElementById('purchasesForm');
const saleProductSelect = document.getElementById('saleProduct');
const purchaseProductSelect = document.getElementById('purchaseProduct');

// التقارير
const filterDateInput = document.getElementById('filterDate');
const clearFilterBtn = document.getElementById('clearFilterBtn');
const transactionsTableBody = document.getElementById('transactionsTable').querySelector('tbody');
const exportCsvBtn = document.getElementById('exportCsvBtn');

// مودال التأكيد
const confirmModal = document.getElementById('confirmModal');
const confirmYesBtn = document.getElementById('confirmYesBtn');
const confirmNoBtn = document.getElementById('confirmNoBtn');

// الشارت
let chartInstance = null;

// ========== أدوات مساعدة ==========
function uuid() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}
function todayISO() {
  return new Date().toISOString().split('T')[0];
}
function formatNumber(n) {
  return Number(n).toLocaleString('ar-EG', { maximumFractionDigits: 2 });
}
function findProduct(id) {
  return AppData.products.find((p) => p.id === id);
}

// ========== الوضع الليلي ==========
function toggleTheme() {
  const html = document.documentElement;
  const scheme = html.getAttribute('data-color-scheme');
  const newScheme = scheme === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-color-scheme', newScheme);
  themeToggleBtn.textContent = newScheme === 'dark' ? '☀️' : '🌙';
}

// ========== التنقل ==========
function closeSidebar() {
  sidebar.classList.remove('open');
  overlay.classList.add('hidden');
}
function openSidebar() {
  sidebar.classList.add('open');
  overlay.classList.remove('hidden');
}
function setActiveNav(sectionId) {
  // أعلى
  topNavBtns.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.section === sectionId);
  });
  // جانبى
  sidebarLinks.forEach((lnk) => {
    lnk.classList.toggle('active', lnk.dataset.section === sectionId);
  });
}
function showSection(sectionId) {
  sections.forEach((sec) => sec.classList.toggle('hidden', sec.id !== sectionId));
  setActiveNav(sectionId);
  closeSidebar();
  if (sectionId === 'dashboardSection') updateDashboard();
  if (sectionId === 'reportsSection') {
    updateReportsTable();
    updateChart();
  }
}

// ========== الأصناف ==========
function renderProductsTable() {
  productsTableBody.innerHTML = AppData.products
    .map(
      (p) => `
    <tr>
      <td>${p.name}</td>
      <td>${p.category || '-'}</td>
      <td>${formatNumber(p.cost)}</td>
      <td>${formatNumber(p.price)}</td>
      <td>${formatNumber(p.quantity)}</td>
      <td>${formatNumber(p.reorder)}</td>
      <td><button class="btn btn--outline btn--sm table-btn editProd" data-id="${p.id}">تعديل</button></td>
      <td><button class="btn btn--outline btn--sm table-btn delProd" data-id="${p.id}">حذف</button></td>
    </tr>`
    )
    .join('');
}
function refreshSelectOptions() {
  const opts =
    '<option value="" disabled selected>اختر الصنف</option>' +
    AppData.products.map((p) => `<option value="${p.id}">${p.name}</option>`).join('');
  saleProductSelect.innerHTML = opts;
  purchaseProductSelect.innerHTML = opts;
}
function openProductModal(id = null) {
  const prod = id ? findProduct(id) : null;
  productModalTitle.textContent = id ? 'تعديل صنف' : 'إضافة صنف';
  document.getElementById('productId').value = prod ? prod.id : '';
  document.getElementById('productName').value = prod ? prod.name : '';
  document.getElementById('productCategory').value = prod ? prod.category || '' : '';
  document.getElementById('productCost').value = prod ? prod.cost : '';
  document.getElementById('productPrice').value = prod ? prod.price : '';
  document.getElementById('productQty').value = prod ? prod.quantity : '0';
  document.getElementById('productReorder').value = prod ? prod.reorder : '5';
  productModal.classList.remove('hidden');
}
function closeProductModal() {
  productModal.classList.add('hidden');
  productForm.reset();
}
function submitProduct(e) {
  e.preventDefault();
  const id = document.getElementById('productId').value;
  const name = document.getElementById('productName').value.trim();
  const category = document.getElementById('productCategory').value.trim();
  const cost = parseFloat(document.getElementById('productCost').value);
  const price = parseFloat(document.getElementById('productPrice').value);
  const qty = parseFloat(document.getElementById('productQty').value);
  const reorder = parseFloat(document.getElementById('productReorder').value);
  if (!name || cost < 0 || price < 0 || qty < 0 || reorder < 0) {
    alert('تحقق من القيم المدخلة');
    return;
  }
  if (id) {
    const prod = findProduct(id);
    if (prod) Object.assign(prod, { name, category, cost, price, quantity: qty, reorder });
  } else {
    AppData.products.push({ id: uuid(), name, category, cost, price, quantity: qty, reorder });
  }
  renderProductsTable();
  refreshSelectOptions();
  updateDashboard();
  closeProductModal();
}
function handleProductsTable(e) {
  const id = e.target.dataset.id;
  if (e.target.classList.contains('editProd')) openProductModal(id);
  if (e.target.classList.contains('delProd')) {
    showConfirm('حذف الصنف؟', () => {
      AppData.products = AppData.products.filter((p) => p.id !== id);
      renderProductsTable();
      refreshSelectOptions();
      updateDashboard();
    });
  }
}

// ========== معاملات ==========
function switchTab(targetId) {
  document.querySelectorAll('.tab-content').forEach((c) => c.classList.toggle('hidden', c.id !== targetId));
  tabBtns.forEach((b) => b.classList.toggle('active', b.dataset.tab === targetId));
}
function saleProductChange() {
  const prod = findProduct(saleProductSelect.value);
  if (prod) document.getElementById('salePrice').value = prod.price;
}
function purchaseProductChange() {
  const prod = findProduct(purchaseProductSelect.value);
  if (prod) document.getElementById('purchaseCost').value = prod.cost;
}
function addSale(e) {
  e.preventDefault();
  const date = document.getElementById('saleDate').value;
  const productId = saleProductSelect.value;
  const qty = parseFloat(document.getElementById('saleQty').value);
  const price = parseFloat(document.getElementById('salePrice').value);
  const prod = findProduct(productId);
  if (!prod || qty > prod.quantity) return alert('كمية غير متوفرة');
  AppData.sales.push({ id: uuid(), date, productId, qty, price });
  prod.quantity -= qty;
  updateDashboard();
  renderProductsTable();
  salesForm.reset();
  document.getElementById('saleDate').value = todayISO();
}
function addPurchase(e) {
  e.preventDefault();
  const date = document.getElementById('purchaseDate').value;
  const productId = purchaseProductSelect.value;
  const qty = parseFloat(document.getElementById('purchaseQty').value);
  const cost = parseFloat(document.getElementById('purchaseCost').value);
  const prod = findProduct(productId);
  if (!prod) return alert('منتج غير موجود');
  AppData.purchases.push({ id: uuid(), date, productId, qty, cost });
  prod.quantity += qty;
  updateDashboard();
  renderProductsTable();
  purchasesForm.reset();
  document.getElementById('purchaseDate').value = todayISO();
}

// ========== التقارير ==========
function updateReportsTable(dateFilter = null) {
  const rows = [];
  AppData.sales.forEach((s) => {
    if (!dateFilter || s.date === dateFilter) {
      const prod = findProduct(s.productId);
      rows.push({ date: s.date, type: 'بيع', prod: prod ? prod.name : 'محذوف', qty: s.qty, price: s.price, total: s.qty * s.price });
    }
  });
  AppData.purchases.forEach((p) => {
    if (!dateFilter || p.date === dateFilter) {
      const prod = findProduct(p.productId);
      rows.push({ date: p.date, type: 'شراء', prod: prod ? prod.name : 'محذوف', qty: p.qty, price: p.cost, total: p.qty * p.cost });
    }
  });
  rows.sort((a, b) => new Date(b.date) - new Date(a.date));
  transactionsTableBody.innerHTML = rows
    .map(
      (r) => `<tr><td>${r.date}</td><td>${r.type}</td><td>${r.prod}</td><td>${formatNumber(r.qty)}</td><td>${formatNumber(r.price)}</td><td>${formatNumber(r.total)}</td></tr>`
    )
    .join('');
}
function updateChart() {
  if (typeof Chart === 'undefined') return;
  const ctx = document.getElementById('lineChart').getContext('2d');
  const labels = [];
  const salesData = [];
  const purchData = [];
  const profitData = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const label = d.toISOString().split('T')[0];
    labels.push(label);
    const salesSum = AppData.sales.filter((s) => s.date === label).reduce((t, s) => t + s.qty * s.price, 0);
    salesData.push(salesSum);
    const purchSum = AppData.purchases.filter((p) => p.date === label).reduce((t, p) => t + p.qty * p.cost, 0);
    purchData.push(purchSum);
    const cogs = AppData.sales.filter((s) => s.date === label).reduce((t, sale) => {
      const pr = findProduct(sale.productId);
      return t + (pr ? pr.cost * sale.qty : 0);
    }, 0);
    profitData.push(salesSum - cogs);
  }
  const data = {
    labels,
    datasets: [
      { label: 'المبيعات', data: salesData, borderColor: '#1FB8CD', backgroundColor: 'rgba(31, 184, 205, .1)', tension: 0.4 },
      { label: 'المشتريات', data: purchData, borderColor: '#FFC185', backgroundColor: 'rgba(255, 193, 133, .1)', tension: 0.4 },
      { label: 'صافي الربح', data: profitData, borderColor: '#B4413C', backgroundColor: 'rgba(180, 65, 60, .1)', tension: 0.4 }
    ]
  };
  const options = { responsive: true, plugins: { legend: { position: 'top' } } };
  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(ctx, { type: 'line', data, options });
}

// ========== لوحة التحكم ==========
function updateDashboard() {
  const today = todayISO();
  const salesTotal = AppData.sales.filter((s) => s.date === today).reduce((t, s) => t + s.qty * s.price, 0);
  const purchTotal = AppData.purchases.filter((p) => p.date === today).reduce((t, p) => t + p.qty * p.cost, 0);
  const cogs = AppData.sales.filter((s) => s.date === today).reduce((t, sale) => {
    const pr = findProduct(sale.productId);
    return t + (pr ? pr.cost * sale.qty : 0);
  }, 0);
  const net = salesTotal - cogs;
  todaySalesEl.textContent = `مبيعات اليوم: ${formatNumber(salesTotal)}`;
  todayPurchasesEl.textContent = `مشتريات اليوم: ${formatNumber(purchTotal)}`;
  todayNetEl.textContent = `صافي الربح: ${formatNumber(net)}`;
  // تنبيهات مخزون منخفض
  const lowStock = AppData.products.filter((p) => p.quantity <= p.reorder);
  if (lowStock.length === 0) {
    lowStockContainer.innerHTML = '<p class="status status--success">كل الأصناف متوفرة</p>';
  } else {
    lowStockContainer.innerHTML = lowStock
      .map((p) => `<div class="low-stock-card">${p.name} - ${formatNumber(p.quantity)} قطع</div>`)
      .join('');
  }
}

// ========== CSV ==========
function downloadCSV() {
  if (AppData.sales.length + AppData.purchases.length === 0) return alert('لا بيانات');
  const rows = [['التاريخ', 'نوع', 'الصنف', 'الكمية', 'السعر/التكلفة', 'الإجمالي']];
  AppData.sales.forEach((s) => {
    const pr = findProduct(s.productId);
    rows.push([s.date, 'بيع', pr ? pr.name : 'محذوف', s.qty, s.price, s.qty * s.price]);
  });
  AppData.purchases.forEach((p) => {
    const pr = findProduct(p.productId);
    rows.push([p.date, 'شراء', pr ? pr.name : 'محذوف', p.qty, p.cost, p.qty * p.cost]);
  });
  const csv = rows.map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.setAttribute('download', 'transactions.csv');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ========== مودال تأكيد ==========
let confirmFn = null;
function showConfirm(msg, fn) {
  document.getElementById('confirmTitle').textContent = msg;
  confirmFn = fn;
  confirmModal.classList.remove('hidden');
}
function closeConfirm() {
  confirmModal.classList.add('hidden');
  confirmFn = null;
}

// ========== إعداد الأحداث عند التحميل ==========
window.addEventListener('DOMContentLoaded', () => {
  // التواريخ الابتدائية
  document.getElementById('saleDate').value = todayISO();
  document.getElementById('purchaseDate').value = todayISO();

  // التنقل العلوى
  topNavBtns.forEach((btn) => btn.addEventListener('click', () => showSection(btn.dataset.section)));
  // التنقل الجانبى
  sidebarLinks.forEach((lnk) => lnk.addEventListener('click', () => showSection(lnk.dataset.section)));

  burgerBtn.addEventListener('click', openSidebar);
  overlay.addEventListener('click', closeSidebar);

  themeToggleBtn.addEventListener('click', toggleTheme);

  // الأصناف
  addProductBtn.addEventListener('click', () => openProductModal());
  cancelProductBtn.addEventListener('click', closeProductModal);
  productForm.addEventListener('submit', submitProduct);
  productsTableBody.addEventListener('click', handleProductsTable);

  // علامات تبويب المعاملات
  tabBtns.forEach((b) => b.addEventListener('click', () => switchTab(b.dataset.tab)));

  saleProductSelect.addEventListener('change', saleProductChange);
  purchaseProductSelect.addEventListener('change', purchaseProductChange);
  salesForm.addEventListener('submit', addSale);
  purchasesForm.addEventListener('submit', addPurchase);

  // تقارير
  filterDateInput.addEventListener('change', (e) => updateReportsTable(e.target.value));
  clearFilterBtn.addEventListener('click', () => {
    filterDateInput.value = '';
    updateReportsTable();
  });
  exportCsvBtn.addEventListener('click', downloadCSV);

  // مودال التأكيد
  confirmYesBtn.addEventListener('click', () => {
    if (confirmFn) confirmFn();
    closeConfirm();
  });
  confirmNoBtn.addEventListener('click', closeConfirm);
  confirmModal.addEventListener('click', (e) => {
    if (e.target === confirmModal) closeConfirm();
  });
  productModal.addEventListener('click', (e) => {
    if (e.target === productModal) closeProductModal();
  });

  // عرض لوحة التحكم بدايةً
  showSection('dashboardSection');
});