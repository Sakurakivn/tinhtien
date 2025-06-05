document.addEventListener('DOMContentLoaded', () => {
    let allCustomersData = {}; 
    let currentOpenCustomerOriginalName = null;
    let currentOpenCustomerId = null;

    // DOM Elements
    const customerListUl = document.getElementById('customerList');
    const modal = document.getElementById('customerModal');
    const closeModalButton = modal.querySelector('.close-button');
    const modalCustomerNameDisplay = document.getElementById('modalCustomerNameDisplay');
    const modalCustomerClassDisplay = document.getElementById('modalCustomerClassDisplay');
    const modalPurchaseCountSpan = document.getElementById('modalPurchaseCount');
    const customerOrdersTbody = document.getElementById('customerOrdersTbody');
    const customerSearchInput = document.getElementById('customerSearchInput');

    // Edit Customer Info Elements
    const editCustomerInfoBtn = document.getElementById('editCustomerInfoBtn');
    const editCustomerForm = document.getElementById('editCustomerForm');
    const editCustomerNameInput = document.getElementById('editCustomerNameInput');
    const editCustomerClassInput = document.getElementById('editCustomerClassInput');
    const saveCustomerInfoBtn = document.getElementById('saveCustomerInfoBtn');
    const cancelEditCustomerBtn = document.getElementById('cancelEditCustomerBtn');

    // Add Manual Order Elements
    const showAddOrderFormBtn = document.getElementById('showAddOrderFormBtn');
    const addOrderForm = document.getElementById('addOrderForm');
    const saveNewOrderBtn = document.getElementById('saveNewOrderBtn');
    const cancelNewOrderBtn = document.getElementById('cancelNewOrderBtn');
    
    // Elements for manual order price calculation
    const newOrderDateInput = document.getElementById('newOrderDate'); // Giữ lại
    const newOrderFileNameInput = document.getElementById('newOrderFileName'); // Thêm để clear
    const newOrderPagesInput = document.getElementById('newOrderPages');
    const newOrderPrintTypeSelect = document.getElementById('newOrderPrintType');
    const newOrderFriendDiscountCheckbox = document.getElementById('newOrderFriendDiscount');
    const newOrderProgramDiscountInput = document.getElementById('newOrderProgramDiscount');
    const newOrderBasePriceDisplay = document.getElementById('newOrderBasePriceDisplay');
    const newOrderFinalPriceDisplay = document.getElementById('newOrderFinalPriceDisplay');
    // const newOrderPaidStatusCheckbox = document.getElementById('newOrderPaidStatus'); // BỎ ĐI

    function ensureDateObject(dateValue) {
        if (!dateValue) return null;
        if (dateValue instanceof Date && !isNaN(dateValue.getTime())) return dateValue;
        const parsedDate = new Date(dateValue);
        if (!isNaN(parsedDate.getTime())) return parsedDate;
        if (typeof dateValue === 'string' && dateValue.includes('/') && dateValue.includes(',')) {
            try {
                const parts = String(dateValue).split(', ');
                const dateParts = parts[0].split('/');
                const timeParts = parts[1] ? parts[1].split(':') : ['00', '00', '00'];
                const isoAttempt = new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]), parseInt(timeParts[0] || '0'), parseInt(timeParts[1] || '0'), parseInt(timeParts[2] || '0'));
                if (!isNaN(isoAttempt.getTime())) return isoAttempt;
            } catch (e) { /* ignore */ }
        }
        console.warn("Không thể chuyển đổi thành Date hợp lệ:", dateValue);
        return null;
    }

    async function loadInitialCustomers() {
        console.log("Đang tải danh sách khách hàng từ API...");
        if(customerListUl) customerListUl.innerHTML = '<li><i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu...</li>';
        try {
            const response = await fetch('/api/customers');
            console.log("[CustomersApp] Fetch response status:", response.status);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                console.error("[CustomersApp] Lỗi fetch API:", response.status, errorText);
                throw new Error(`Lỗi HTTP ${response.status}: ${errorData.message || 'Không thể tải danh sách khách hàng'}`);
            }
            const customersArray = await response.json();
            console.log("[CustomersApp] Dữ liệu khách hàng từ API:", customersArray);
            allCustomersData = {};
            customersArray.forEach(customer => {
                allCustomersData[customer._id] = customer;
                if (customer.orders && Array.isArray(customer.orders)) {
                    customer.orders.forEach(order => {
                        order.createdAtDate = ensureDateObject(order.createdAt);
                    });
                }
            });
            console.log("Đã tải xong", Object.keys(allCustomersData).length, "khách hàng.");
            renderCustomerList();
        } catch (error) {
            console.error("Lỗi khi tải danh sách khách hàng:", error);
            if(customerListUl) customerListUl.innerHTML = `<li>Lỗi tải dữ liệu: ${error.message}</li>`;
        }
    }

    function renderCustomerList(searchTerm = '') {
        if(!customerListUl) return;
        customerListUl.innerHTML = '';
        const lowerSearchTerm = searchTerm.toLowerCase().trim();
        let customersToDisplay = Object.values(allCustomersData);
        if (lowerSearchTerm) {
            customersToDisplay = customersToDisplay.filter(customer =>
                customer.name.toLowerCase().includes(lowerSearchTerm) ||
                (customer.class && customer.class.toLowerCase().includes(lowerSearchTerm))
            );
        }
        if (customersToDisplay.length === 0) {
            const li = document.createElement('li');
            li.textContent = searchTerm ? 'Không tìm thấy khách hàng.' : 'Chưa có dữ liệu khách hàng.';
            li.style.textAlign = 'center';
            customerListUl.appendChild(li);
            return;
        }
        customersToDisplay.sort((a, b) => a.name.localeCompare(b.name));
        customersToDisplay.forEach(customer => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `<i class="fas fa-user-circle"></i> ${customer.name} <span class="customer-meta">(${(customer.class || '').trim() || 'Chưa có lớp'}) - ${customer.purchaseCount || 0} lần mua</span>`;
            listItem.dataset.customerId = customer._id;
            listItem.addEventListener('click', () => openModalForCustomer(customer._id));
            customerListUl.appendChild(listItem);
        });
    }

    if (customerSearchInput) {
        customerSearchInput.addEventListener('input', () => renderCustomerList(customerSearchInput.value));
    }

    function populateOrdersTable(customerId) {
        if(!customerOrdersTbody) return;
        const customer = allCustomersData[customerId];
        customerOrdersTbody.innerHTML = '';
        if (customer && customer.orders && Array.isArray(customer.orders) && customer.orders.length > 0) {
            const sortedOrders = [...customer.orders].sort((a, b) => (ensureDateObject(b.createdAt) || 0) - (ensureDateObject(a.createdAt) || 0));
            
            sortedOrders.forEach((order, index) => {
                const row = customerOrdersTbody.insertRow();
                row.insertCell().textContent = index + 1; // STT

                let displayDate = 'N/A';
                const orderDate = order.createdAtDate || ensureDateObject(order.createdAt);
                if (orderDate && !isNaN(orderDate.getTime())) {
                    displayDate = `${String(orderDate.getDate()).padStart(2, '0')}/${String(orderDate.getMonth() + 1).padStart(2, '0')}/${orderDate.getFullYear()}`;
                } else if (typeof order.createdAt === 'string' && order.createdAt) {
                    displayDate = order.createdAt.split('T')[0].split('-').reverse().join('/');
                }
                row.insertCell().textContent = displayDate;
                row.insertCell().textContent = order.fileName || '-';
                row.insertCell().textContent = order.pages || '0';
                row.insertCell().textContent = order.printType === 'portrait' ? 'Dọc' : (order.printType === 'landscape' ? 'Ngang' : '-');
                row.insertCell().textContent = `${order.programDiscountPercentage || 0}%`;
                row.insertCell().textContent = order.friendDiscountApplied ? 'Có' : 'Không';
                row.insertCell().textContent = order.totalPriceBeforeDiscount != null ? order.totalPriceBeforeDiscount.toLocaleString('vi-VN') + ' VND' : '0 VND';
                row.insertCell().textContent = order.finalTotalPrice != null ? order.finalTotalPrice.toLocaleString('vi-VN') + ' VND' : '0 VND';
                
                // BỎ CỘT THANH TOÁN VÀ CHECKBOX LIÊN QUAN
                // const paidCell = row.insertCell();
                // ... (logic checkbox paid bị xóa) ...
                
                const deleteCell = row.insertCell();
                const deleteBtn = document.createElement('button');
                deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
                deleteBtn.classList.add('delete-order-btn');
                deleteBtn.title = "Xóa đơn hàng này";
                const orderIdStringForDelete = order.orderId ? (typeof order.orderId === 'string' ? order.orderId : order.orderId.toString()) : null;
                if (orderIdStringForDelete) {
                    deleteBtn.onclick = () => handleDeleteOrder(customerId, orderIdStringForDelete);
                } else {
                    deleteBtn.disabled = true;
                    deleteBtn.title = "Không thể xóa: thiếu ID đơn hàng";
                }
                deleteCell.appendChild(deleteBtn);
            });
        } else {
            const row = customerOrdersTbody.insertRow();
            const cell = row.insertCell();
            cell.colSpan = 10; // Cập nhật colSpan (9 cột cũ + STT, bỏ cột Thanh toán)
            cell.textContent = 'Không có lịch sử mua hàng cho khách này.';
            cell.style.textAlign = 'center';
        }
    }
    
    function openModalForCustomer(customerId) {
        currentOpenCustomerId = customerId;
        const customer = allCustomersData[customerId];
        if (!customer) {
            alert("Lỗi: Không tìm thấy dữ liệu khách hàng.");
            return;
        }
        currentOpenCustomerOriginalName = customer.name;
        if(modalCustomerNameDisplay) modalCustomerNameDisplay.innerHTML = `<i class="fas fa-user-edit"></i> ${customer.name}`;
        if(modalCustomerClassDisplay) modalCustomerClassDisplay.textContent = (customer.class || '').trim() || 'Chưa cung cấp';
        if(modalPurchaseCountSpan) modalPurchaseCountSpan.textContent = customer.purchaseCount || 0;
        
        populateOrdersTable(customerId);

        if(editCustomerForm) editCustomerForm.style.display = 'none';
        if(addOrderForm) addOrderForm.style.display = 'none';
        if(modalCustomerNameDisplay) modalCustomerNameDisplay.style.display = 'inline-block';
        if(modalCustomerClassDisplay) modalCustomerClassDisplay.style.display = 'inline';
        if(modal) modal.style.display = 'block';
        document.body.classList.add('modal-open');
    }

    // --- Chức năng Sửa thông tin khách hàng ---
    if(editCustomerInfoBtn) {
        editCustomerInfoBtn.onclick = () => {
            const customer = allCustomersData[currentOpenCustomerId];
            if (!customer || !editCustomerNameInput || !editCustomerClassInput || !editCustomerForm || !modalCustomerNameDisplay) return;
            editCustomerNameInput.value = customer.name;
            editCustomerClassInput.value = customer.class || '';
            editCustomerForm.style.display = 'block';
            modalCustomerNameDisplay.style.display = 'none';
        };
    }
    if(cancelEditCustomerBtn) {
        cancelEditCustomerBtn.onclick = () => {
            if(editCustomerForm) editCustomerForm.style.display = 'none';
            if(modalCustomerNameDisplay) modalCustomerNameDisplay.style.display = 'inline-block';
        };
    }
    if(saveCustomerInfoBtn) {
        saveCustomerInfoBtn.onclick = async () => {
            if(!editCustomerNameInput || !editCustomerClassInput) return;
            const newName = editCustomerNameInput.value.trim();
            const newClass = editCustomerClassInput.value.trim();
            if (!newName) {
                alert('Tên khách hàng không được để trống.'); return;
            }
            if (newName !== currentOpenCustomerOriginalName) {
                const nameExists = Object.values(allCustomersData).some(cust => cust.name === newName && cust._id !== currentOpenCustomerId);
                if (nameExists) {
                    alert('Tên khách hàng mới đã tồn tại. Vui lòng chọn tên khác.'); return;
                }
            }
            try {
                const response = await fetch(`/api/customers?id=${currentOpenCustomerId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: newName, class: newClass })
                });
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ message: response.statusText }));
                    throw new Error(`Không thể cập nhật: ${errorData.message}`);
                }
                const updatedCustomer = await response.json();
                allCustomersData[updatedCustomer._id] = updatedCustomer;
                currentOpenCustomerOriginalName = updatedCustomer.name;
                renderCustomerList();
                if(modalCustomerNameDisplay) modalCustomerNameDisplay.innerHTML = `<i class="fas fa-user-edit"></i> ${updatedCustomer.name}`;
                if(modalCustomerClassDisplay) modalCustomerClassDisplay.textContent = (updatedCustomer.class || '').trim() || 'Chưa cung cấp';
                if(editCustomerForm) editCustomerForm.style.display = 'none';
                if(modalCustomerNameDisplay) modalCustomerNameDisplay.style.display = 'inline-block';
                alert('Cập nhật thông tin khách hàng thành công!');
            } catch (error) {
                console.error("Lỗi cập nhật thông tin khách hàng:", error);
                alert("Lỗi: " + error.message);
            }
        };
    }

    // --- Hàm tính tiền cho đơn hàng thủ công ---
    function calculateManualOrderPrice() {
        if (!newOrderPagesInput || !newOrderPrintTypeSelect || !newOrderFriendDiscountCheckbox || !newOrderProgramDiscountInput || !newOrderBasePriceDisplay || !newOrderFinalPriceDisplay) {
             console.warn("Một hoặc nhiều element của form thêm đơn hàng thủ công không tìm thấy để tính giá.");
             return null;
        }
        const pages = parseInt(newOrderPagesInput.value) || 0;
        const printType = newOrderPrintTypeSelect.value;
        const isFriend = newOrderFriendDiscountCheckbox.checked;
        const discountPercentage = parseInt(newOrderProgramDiscountInput.value) || 0;

        if (pages <= 0) {
            newOrderBasePriceDisplay.textContent = "0 VND";
            newOrderFinalPriceDisplay.textContent = "0 VND";
            return { totalPriceBeforeDiscount: 0, finalTotalPrice: 0, friendDiscountApplied: isFriend, friendDiscountAmount: 0, programDiscountPercentage: discountPercentage, programDiscountAmount: 0 };
        }
        let pricePerPage;
        if (pages <= 250) { pricePerPage = isFriend ? 483 : 543; }
        else if (pages <= 500) { pricePerPage = isFriend ? 463 : 520; }
        else if (pages <= 750) { pricePerPage = isFriend ? 436 : 490; }
        else { pricePerPage = isFriend ? 400 : 450; }
        let totalSheets = printType === 'portrait' ? pages / 2 : pages / 4;
        let basePrice = Math.round(totalSheets * pricePerPage);
        const friendDiscountAmountValue = isFriend ? Math.round(basePrice * 0.1) : 0;
        const programDiscountAmountValue = Math.round(basePrice * (discountPercentage / 100));
        let finalPrice = Math.round(basePrice - friendDiscountAmountValue - programDiscountAmountValue);
        newOrderBasePriceDisplay.textContent = `${basePrice.toLocaleString('vi-VN')} VND`;
        newOrderFinalPriceDisplay.textContent = `${finalPrice.toLocaleString('vi-VN')} VND`;
        return {
            totalPriceBeforeDiscount: basePrice, friendDiscountApplied: isFriend,
            friendDiscountAmount: friendDiscountAmountValue, programDiscountPercentage: discountPercentage,
            programDiscountAmount: programDiscountAmountValue, finalTotalPrice: finalPrice
        };
    }

    function getCurrentDateTimeLocalString() {
        const now = new Date();
        const tzoffset = now.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(now.valueOf() - tzoffset)).toISOString().slice(0, 16);
        return localISOTime;
    }
    
    // --- Chức năng Thêm đơn hàng thủ công ---
    if(showAddOrderFormBtn){
        showAddOrderFormBtn.onclick = () => {
            if(!addOrderForm || !newOrderDateInput || !newOrderFileNameInput || !newOrderPagesInput || !newOrderPrintTypeSelect || !newOrderProgramDiscountInput || !newOrderFriendDiscountCheckbox ) return;
            
            addOrderForm.style.display = 'block';
            // Clear các input text và number, trừ % giảm giá
            newOrderFileNameInput.value = '';
            newOrderPagesInput.value = '';
            // Giữ lại newOrderProgramDiscountInput.value = '0'; nếu muốn mặc định là 0
            // Hoặc clear luôn: newOrderProgramDiscountInput.value = ''; rồi đặt placeholder

            newOrderDateInput.value = getCurrentDateTimeLocalString();
            newOrderPrintTypeSelect.value = 'portrait';
            newOrderFriendDiscountCheckbox.checked = false;
            // Bỏ newOrderPaidStatusCheckbox.checked = false;
            
            calculateManualOrderPrice(); 

            const calculationInputs = [newOrderPagesInput, newOrderPrintTypeSelect, newOrderFriendDiscountCheckbox, newOrderProgramDiscountInput];
            calculationInputs.forEach(el => {
                if(el) {
                    el.removeEventListener('change', calculateManualOrderPrice);
                    el.removeEventListener('input', calculateManualOrderPrice);
                    el.addEventListener('change', calculateManualOrderPrice);
                    if (el.type === 'number' || el.type === 'text') { // Gắn input cho number pages
                        el.addEventListener('input', calculateManualOrderPrice);
                    }
                }
            });
        };
    }

    if(cancelNewOrderBtn){
        cancelNewOrderBtn.onclick = () => { if(addOrderForm) addOrderForm.style.display = 'none'; };
    }

    if(saveNewOrderBtn){
        saveNewOrderBtn.onclick = async () => {
            if (!currentOpenCustomerId || !newOrderDateInput || !document.getElementById('newOrderFileName') || !newOrderPagesInput || !newOrderPrintTypeSelect) {
                alert("Lỗi: Không xác định được khách hàng hoặc thiếu thông tin form."); return;
            }
            const calculatedPrices = calculateManualOrderPrice();
            if (!calculatedPrices) {
                alert("Lỗi tính giá. Vui lòng kiểm tra lại."); return;
            }
            let formattedCreatedAt = '';
            if (newOrderDateInput.value) {
                const dateObj = new Date(newOrderDateInput.value);
                if (!isNaN(dateObj.getTime())) {
                    const day = String(dateObj.getDate()).padStart(2, '0');
                    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const year = dateObj.getFullYear();
                    const hours = String(dateObj.getHours()).padStart(2, '0');
                    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
                    const seconds = String(dateObj.getSeconds()).padStart(2, '0');
                    formattedCreatedAt = `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
                } else { alert("Ngày mua không hợp lệ."); return; }
            } else { alert("Vui lòng chọn Ngày mua."); return; }

            const newOrderClientData = {
                createdAt: formattedCreatedAt,
                fileName: document.getElementById('newOrderFileName').value.trim(),
                pages: parseInt(newOrderPagesInput.value) || 0,
                printType: newOrderPrintTypeSelect.value,
                // Bỏ trường 'paid' khi gửi lên API nếu không dùng nữa
                ...calculatedPrices
            };
            if (!newOrderClientData.fileName || newOrderClientData.pages <= 0) {
                alert("Vui lòng nhập Tên file và Số trang > 0."); return;
            }
            try {
                const response = await fetch(`/api/customers/${currentOpenCustomerId}/orders`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newOrderClientData)
                });
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ message: response.statusText }));
                    throw new Error(`Không thể thêm đơn hàng: ${errorData.message}`);
                }
                const result = await response.json();
                const updatedCustomerFromServer = result.customer;
                allCustomersData[currentOpenCustomerId] = updatedCustomerFromServer;
                if (allCustomersData[currentOpenCustomerId].orders && Array.isArray(allCustomersData[currentOpenCustomerId].orders)) {
                    allCustomersData[currentOpenCustomerId].orders.forEach(order => {
                        order.createdAtDate = ensureDateObject(order.createdAt);
                    });
                }
                populateOrdersTable(currentOpenCustomerId);
                if(modalPurchaseCountSpan) modalPurchaseCountSpan.textContent = updatedCustomerFromServer.purchaseCount;
                renderCustomerList();
                if(addOrderForm) addOrderForm.style.display = 'none';
                alert('Đã thêm đơn hàng thủ công thành công!');
            } catch (error) {
                console.error("Lỗi thêm đơn hàng thủ công:", error);
                alert("Lỗi: " + error.message + "\nHãy kiểm tra Console (F12).");
            }
        };
    }

    // --- Chức năng Xóa đơn hàng (giữ nguyên) ---
    async function handleDeleteOrder(customerId, orderIdStr) {
        console.log(`[Frontend] Bắt đầu handleDeleteOrder. CustomerID: ${customerId}, OrderID chuỗi: ${orderIdStr}`);
        const customer = allCustomersData[customerId];
        if (!customer || !customer.orders) {
            alert("Lỗi: Không tìm thấy dữ liệu khách hàng cục bộ."); return;
        }
        const orderObjectForConfirm = customer.orders.find(o => (o.orderId ? o.orderId.toString() : null) === orderIdStr);
        let confirmMessage = `Bạn có chắc chắn muốn xóa đơn hàng có ID: ${orderIdStr} không?`;
        if (orderObjectForConfirm) {
            const orderDate = ensureDateObject(orderObjectForConfirm.createdAt);
            const formattedDate = orderDate && !isNaN(orderDate.getTime()) ? `${String(orderDate.getDate()).padStart(2, '0')}/${String(orderDate.getMonth() + 1).padStart(2, '0')}/${orderDate.getFullYear()}` : 'N/A';
            confirmMessage = `Bạn có chắc chắn muốn xóa đơn hàng?\nFile: ${orderObjectForConfirm.fileName || 'Không tên'}\nNgày: ${formattedDate}`;
        } else { console.warn(`[Frontend] Không tìm thấy chi tiết đơn hàng với ID ${orderIdStr} trong cache.`); }
        
        if (confirm(confirmMessage)) {
            try {
                const apiUrl = `/api/customers/${customerId}/orders/${orderIdStr}`;
                console.log("[Frontend] CHUẨN BỊ GỬI YÊU CẦU DELETE đến:", apiUrl);
                const response = await fetch(apiUrl, { method: 'DELETE' });
                console.log("[Frontend] ĐÃ GỬI YÊU CẦU DELETE, response status:", response.status);
                const responseText = await response.text(); 
                console.log("[Frontend] Response text:", responseText);
                if (!response.ok) {
                    let errorData = { message: `Lỗi HTTP ${response.status}` };
                    try { if (responseText) { errorData = JSON.parse(responseText); } } 
                    catch (e) { errorData.message = responseText || errorData.message; }
                    throw new Error(`Không thể xóa đơn hàng: ${errorData.message || response.statusText}`);
                }
                const result = JSON.parse(responseText); 
                console.log("[Frontend] Phản hồi từ API xóa thành công:", result);
                const updatedCustomerFromServer = result.customer;
                allCustomersData[customerId] = updatedCustomerFromServer;
                if (allCustomersData[customerId].orders && Array.isArray(allCustomersData[customerId].orders)) {
                    allCustomersData[customerId].orders.forEach(order => {
                        order.createdAtDate = ensureDateObject(order.createdAt);
                    });
                }
                populateOrdersTable(customerId); 
                if(modalPurchaseCountSpan) modalPurchaseCountSpan.textContent = updatedCustomerFromServer.purchaseCount; 
                renderCustomerList(); 
                alert(result.message || 'Đã xóa đơn hàng thành công.');
            } catch (error) {
                console.error("[Frontend] Lỗi trong handleDeleteOrder:", error);
                alert("Lỗi khi xóa đơn hàng: " + error.message + "\nHãy kiểm tra Console (F12)."); 
            }
        } else { console.log("[Frontend] Người dùng đã hủy thao tác xóa đơn hàng."); }
    };

    // BỎ HÀM handlePaidStatusChange VÌ KHÔNG CÒN DÙNG
    // async function handlePaidStatusChange(event) { ... } 

    // --- Các trình xử lý sự kiện chung cho modal ---
    if(closeModalButton) closeModalButton.onclick = () => { if(modal) modal.style.display = 'none'; document.body.classList.remove('modal-open'); };
    window.onclick = (event) => { if (event.target === modal) { if(modal) modal.style.display = 'none'; document.body.classList.remove('modal-open'); } };
    
    // Khởi tạo
    loadInitialCustomers();
});
