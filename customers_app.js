// File: customers_app.js - PHIÊN BẢN HOÀN CHỈNH CUỐI CÙNG
document.addEventListener('DOMContentLoaded', () => {
    // --- KHAI BÁO BIẾN TOÀN CỤC ---
    let allCustomersData = {}; 
    let currentOpenCustomerOriginalName = null;
    let currentOpenCustomerId = null;
    let fileToUpload = null; 

    // Biến cho phân trang
    let currentPage = 1;
    const itemsPerPage = 15; // Số khách hàng trên mỗi trang

    // --- DOM ELEMENTS ---
    // Elements chính
    const customerListUl = document.getElementById('customerList');
    const customerSearchInput = document.getElementById('customerSearchInput');
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    
    // Elements cho Modal chi tiết khách hàng
    const modal = document.getElementById('customerModal');
    const closeModalButton = modal.querySelector('.close-button');
    const modalCustomerNameDisplay = document.getElementById('modalCustomerNameDisplay');
    const modalCustomerClassDisplay = document.getElementById('modalCustomerClassDisplay');
    const modalPurchaseCountSpan = document.getElementById('modalPurchaseCount');
    const customerOrdersTbody = document.getElementById('customerOrdersTbody');
    
    // Elements cho Sửa thông tin khách hàng
    const editCustomerInfoBtn = document.getElementById('editCustomerInfoBtn');
    const editCustomerForm = document.getElementById('editCustomerForm');
    const editCustomerNameInput = document.getElementById('editCustomerNameInput');
    const editCustomerClassInput = document.getElementById('editCustomerClassInput');
    const saveCustomerInfoBtn = document.getElementById('saveCustomerInfoBtn');
    const cancelEditCustomerBtn = document.getElementById('cancelEditCustomerBtn');

    // Elements cho Thêm đơn hàng thủ công
    const showAddOrderFormBtn = document.getElementById('showAddOrderFormBtn');
    const addOrderForm = document.getElementById('addOrderForm');
    const saveNewOrderBtn = document.getElementById('saveNewOrderBtn');
    const cancelNewOrderBtn = document.getElementById('cancelNewOrderBtn');
    const newOrderDateInput = document.getElementById('newOrderDate');
    const newOrderFileNameInput = document.getElementById('newOrderFileName');
    const newOrderPagesInput = document.getElementById('newOrderPages');
    const newOrderPrintTypeSelect = document.getElementById('newOrderPrintType');
    const newOrderFriendDiscountCheckbox = document.getElementById('newOrderFriendDiscount');
    const newOrderProgramDiscountInput = document.getElementById('newOrderProgramDiscount');
    const newOrderBasePriceDisplay = document.getElementById('newOrderBasePriceDisplay');
    const newOrderFinalPriceDisplay = document.getElementById('newOrderFinalPriceDisplay');

    // Elements cho Nhập file CSV
    const showImportForCustomerBtn = document.getElementById('showImportForCustomerBtn');
    const importForCustomerModal = document.getElementById('importForCustomerModal');
    const closeImportForCustomerModalBtn = document.getElementById('closeImportForCustomerModalBtn');
    const downloadCustomerTemplateLink = document.getElementById('downloadCustomerTemplateLink');
    const customerCsvFileInput = document.getElementById('customerCsvFileInput');
    const importCustomerNameSpan = document.getElementById('importCustomerName');

    // Elements cho Modal xem trước file
    const importPreviewModal = document.getElementById('importPreviewModal');
    const closePreviewModalBtn = document.getElementById('closePreviewModalBtn');
    const previewTableContainer = document.getElementById('previewTableContainer');
    const confirmImportFinalBtn = document.getElementById('confirmImportFinalBtn');
    

    // --- CÁC HÀM CHÍNH ---

    async function loadInitialCustomers() {
        showLoadingSpinner("Đang tải dữ liệu khách hàng...");
        try {
            const response = await fetch('/api/customers');
            if (!response.ok) throw new Error('Không thể tải danh sách khách hàng');
            const customersArray = await response.json();
            
            allCustomersData = {};
            customersArray.forEach(customer => {
                allCustomersData[customer._id] = customer;
                if (customer.orders && Array.isArray(customer.orders)) {
                    customer.orders.forEach(order => {
                        order.createdAtDate = ensureDateObject(order.createdAt);
                    });
                }
            });
            renderCustomerList(customerSearchInput.value, 1); // Luôn hiển thị trang đầu tiên khi tải
        } catch (error) {
            console.error("Lỗi khi tải danh sách khách hàng:", error);
            if(customerListUl) customerListUl.innerHTML = `<li>Lỗi tải dữ liệu: ${error.message}</li>`;
            showNotification("Lỗi tải dữ liệu khách hàng!", "error");
        } finally {
            hideLoadingSpinner();
        }
    }

    function renderCustomerList(searchTerm = '', page = 1) {
        currentPage = page;
        if (!customerListUl) return;
        customerListUl.innerHTML = '';
        
        const lowerSearchTerm = searchTerm.toLowerCase().trim();
        let filteredCustomers = Object.values(allCustomersData);

        if (lowerSearchTerm) {
            filteredCustomers = filteredCustomers.filter(customer =>
                customer.name.toLowerCase().includes(lowerSearchTerm) ||
                (customer.class && customer.class.toLowerCase().includes(lowerSearchTerm))
            );
        }

        filteredCustomers.sort((a, b) => a.name.localeCompare(b.name));

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);

        if (paginatedCustomers.length === 0) {
            const li = document.createElement('li');
            li.textContent = searchTerm ? 'Không tìm thấy khách hàng.' : 'Chưa có dữ liệu khách hàng.';
            customerListUl.appendChild(li);
        } else {
            paginatedCustomers.forEach(customer => {
                const listItem = document.createElement('li');
                listItem.innerHTML = `<i class="fas fa-user-circle"></i> ${customer.name} <span class="customer-meta">(${(customer.class || '').trim() || 'Chưa có lớp'}) - ${customer.purchaseCount || 0} lần mua</span>`;
                listItem.dataset.customerId = customer._id;
                listItem.addEventListener('click', () => openModalForCustomer(customer._id));
                customerListUl.appendChild(listItem);
            });
        }
        
        renderPaginationControls(filteredCustomers.length, currentPage);
    }

    function renderPaginationControls(totalItems, currentPage) {
        const paginationContainer = document.getElementById('pagination-container');
        if (!paginationContainer) return;
        paginationContainer.innerHTML = '';
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        
        if (totalPages <= 1) return;

        for (let i = 1; i <= totalPages; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            if (i === currentPage) pageButton.classList.add('active');
            pageButton.addEventListener('click', () => {
                window.scrollTo(0, 0);
                renderCustomerList(customerSearchInput.value, i);
            });
            paginationContainer.appendChild(pageButton);
        }
    }

    function openModalForCustomer(customerId) {
        currentOpenCustomerId = customerId;
        const customer = allCustomersData[customerId];
        if (!customer) {
            showNotification("Lỗi: Không tìm thấy dữ liệu khách hàng.", "error");
            return;
        }

        // Điền thông tin vào modal
        currentOpenCustomerOriginalName = customer.name;
        if(modalCustomerNameDisplay) modalCustomerNameDisplay.innerHTML = `<i class="fas fa-user-edit"></i> ${customer.name}`;
        if(modalCustomerClassDisplay) modalCustomerClassDisplay.textContent = (customer.class || '').trim() || 'Chưa cung cấp';
        if(modalPurchaseCountSpan) modalPurchaseCountSpan.textContent = customer.purchaseCount || 0;
        populateOrdersTable(customerId);

        // Reset các form
        if(editCustomerForm) editCustomerForm.style.display = 'none';
        if(addOrderForm) addOrderForm.style.display = 'none';
        if(modalCustomerNameDisplay) modalCustomerNameDisplay.style.display = 'inline-block';
        if(modalCustomerClassDisplay) modalCustomerClassDisplay.style.display = 'inline';
        
        // Hiển thị modal với hiệu ứng
        if(modal) modal.style.display = 'block';
        document.body.classList.add('modal-open');
        
        const modalContent = modal.querySelector('.modal-content');
        modalContent.style.animation = 'none';
        anime({
            targets: modalContent,
            translateY: [-30, 0],
            opacity: [0, 1],
            duration: 450,
            easing: 'easeOutCubic'
        });
    }

    // --- CÁC HÀM HỖ TRỢ ---
    
    function ensureDateObject(dateValue) { /* ... (giữ nguyên hàm này) ... */ }
    function calculateManualOrderPrice() { /* ... (giữ nguyên hàm này) ... */ }
    function getCurrentDateTimeLocalString() { /* ... (giữ nguyên hàm này) ... */ }
    function escapeCsvCell(cellData) { /* ... (giữ nguyên hàm này) ... */ }
    function formatDateForCSV(dateObj) { /* ... (giữ nguyên hàm này) ... */ }

    function parseCSV(csvText) {
        const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length < 1) return [];
        const headers = lines.shift().split(',').map(h => h.trim());
        return lines.map(line => {
            const values = line.split(',');
            return headers.reduce((obj, header, i) => {
                obj[header] = values[i] ? values[i].trim() : '';
                return obj;
            }, {});
        });
    }

    function createPreviewTable(data) {
        if (!data || data.length === 0) {
            previewTableContainer.innerHTML = '<p style="text-align:center; padding: 20px;">Không có dữ liệu hợp lệ trong file.</p>';
            confirmImportFinalBtn.style.display = 'none';
            return;
        }

        confirmImportFinalBtn.style.display = 'inline-block';
        const headers = Object.keys(data[0]);
        let tableHTML = '<table><thead><tr>';
        headers.forEach(header => tableHTML += `<th>${header}</th>`);
        tableHTML += '</tr></thead><tbody>';
        data.forEach(row => {
            tableHTML += '<tr>';
            headers.forEach(header => tableHTML += `<td>${row[header] || ''}</td>`);
            tableHTML += '</tr>';
        });
        tableHTML += '</tbody></table>';

        previewTableContainer.innerHTML = tableHTML;
        
        anime({
            targets: '.preview-table tbody tr',
            translateY: [20, 0],
            opacity: [0, 1],
            delay: anime.stagger(50),
            easing: 'easeOutQuad'
        });
    }

    // --- CÁC HÀM XỬ LÝ SỰ KIỆN (EVENT HANDLERS) ---
    
    // Gán các sự kiện sau khi DOM đã tải
    if (customerSearchInput) {
        customerSearchInput.addEventListener('input', () => renderCustomerList(customerSearchInput.value, 1));
    }
    if (closeModalButton) closeModalButton.onclick = () => { if(modal) modal.style.display = 'none'; document.body.classList.remove('modal-open'); };
    window.onclick = (event) => { if (event.target === modal) { if(modal) modal.style.display = 'none'; document.body.classList.remove('modal-open'); } };

    // Xử lý các nút Sửa, Lưu, Thêm đơn hàng, Xuất CSV, ...
    // ... (Toàn bộ logic cho các hàm handleDeleteOrder, saveNewOrderBtn.onclick, 
    //      saveCustomerInfoBtn.onclick, handleExportToCSV,... giữ nguyên như trong file cũ của bạn) ...

    // --- LOGIC MỚI CHO NHẬP FILE VÀ XEM TRƯỚC ---
    if (showImportForCustomerBtn) {
        showImportForCustomerBtn.onclick = () => {
            const customer = allCustomersData[currentOpenCustomerId];
            if (!customer) { alert("Lỗi: Không tìm thấy thông tin khách hàng."); return; }
            if (importCustomerNameSpan) importCustomerNameSpan.textContent = customer.name;
            if (importForCustomerModal) importForCustomerModal.style.display = 'block';
        };
    }
    if (closeImportForCustomerModalBtn) closeImportForCustomerModalBtn.onclick = () => { if (importForCustomerModal) importForCustomerModal.style.display = 'none'; };
    if (downloadCustomerTemplateLink) { /* ... (giữ nguyên logic tải file mẫu) ... */ }
    
    if (customerCsvFileInput) {
        customerCsvFileInput.onchange = (event) => {
            const file = event.target.files[0];
            if (!file) return;
            fileToUpload = file;
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    createPreviewTable(parseCSV(e.target.result));
                    if (importPreviewModal) importPreviewModal.style.display = 'block';
                    if (importForCustomerModal) importForCustomerModal.style.display = 'none';
                } catch (error) {
                    showNotification("Lỗi phân tích file CSV.", "error");
                }
            };
            reader.readAsText(file, 'UTF-8');
        };
    }
    
    if (closePreviewModalBtn) {
        closePreviewModalBtn.onclick = () => {
            if (importPreviewModal) importPreviewModal.style.display = 'none';
            fileToUpload = null;
            if (customerCsvFileInput) customerCsvFileInput.value = '';
        };
    }

    if (confirmImportFinalBtn) {
        confirmImportFinalBtn.onclick = async () => {
            if (!fileToUpload || !currentOpenCustomerId) return;
            showLoadingSpinner("Đang nhập dữ liệu...");
            const formData = new FormData();
            formData.append('ordersFile', fileToUpload);
            try {
                const response = await fetch(`/api/customers/${currentOpenCustomerId}/orders/import`, { method: 'POST', body: formData });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                
                showNotification(`Nhập thành công: ${result.successfulImports}. Thất bại: ${result.failedImports}.`, "success", 5000);
                
                if (result.customer) {
                    allCustomersData[currentOpenCustomerId] = result.customer;
                    populateOrdersTable(currentOpenCustomerId);
                    if(modalPurchaseCountSpan) modalPurchaseCountSpan.textContent = result.customer.purchaseCount;
                    renderCustomerList(customerSearchInput.value, currentPage); // Giữ nguyên trang hiện tại
                }
            } catch (error) {
                showNotification("Lỗi khi nhập dữ liệu: " + error.message, "error");
            } finally {
                hideLoadingSpinner();
                if (importPreviewModal) importPreviewModal.style.display = 'none';
                fileToUpload = null;
                if (customerCsvFileInput) customerCsvFileInput.value = '';
            }
        };
    }
    
    // Khởi chạy ứng dụng
    loadInitialCustomers();
});
