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
    const newOrderPagesInput = document.getElementById('newOrderPages');
    const newOrderPrintTypeSelect = document.getElementById('newOrderPrintType');
    const newOrderFriendDiscountCheckbox = document.getElementById('newOrderFriendDiscount');
    const newOrderProgramDiscountInput = document.getElementById('newOrderProgramDiscount');
    const newOrderBasePriceDisplay = document.getElementById('newOrderBasePriceDisplay');
    const newOrderFinalPriceDisplay = document.getElementById('newOrderFinalPriceDisplay');
    const newOrderDateInput = document.getElementById('newOrderDate');


    function ensureDateObject(dateValue) {
        if (!dateValue) return null;
        if (dateValue instanceof Date && !isNaN(dateValue.getTime())) return dateValue;
        const parsedDate = new Date(dateValue);
        if (!isNaN(parsedDate.getTime())) return parsedDate;
        if (typeof dateValue === 'string' && dateValue.includes('/') && dateValue.includes(':')) {
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
        customerListUl.innerHTML = '<li><i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu...</li>';
        try {
            const response = await fetch('/api/customers');
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(`Lỗi HTTP ${response.status}: ${errorData.message || 'Không thể tải danh sách khách hàng'}`);
            }
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
            console.log("Đã tải xong", Object.keys(allCustomersData).length, "khách hàng.");
            renderCustomerList();
        } catch (error) {
            console.error("Lỗi khi tải danh sách khách hàng:", error);
            customerListUl.innerHTML = `<li>Lỗi tải dữ liệu: ${error.message}</li>`;
        }
    }

    function renderCustomerList(searchTerm = '') {
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
            li.textContent = searchTerm ? 'Không tìm thấy khách hàng.' : 'Chưa có dữ liệu khách hàng hoặc không khớp tìm kiếm.';
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
        const customer = allCustomersData[customerId];
        customerOrdersTbody.innerHTML = '';
        if (customer && customer.orders && Array.isArray(customer.orders) && customer.orders.length > 0) {
            const sortedOrders = [...customer.orders].sort((a, b) => (ensureDateObject(b.createdAt) || 0) - (ensureDateObject(a.createdAt) || 0));
            
            sortedOrders.forEach((order, index) => {
                const row = customerOrdersTbody.insertRow();
                row.insertCell().textContent = index + 1; // STT (đơn mới nhất là 1)

                let displayDate = 'N/A';
                const orderDate = ensureDateObject(order.createdAt);
                if (orderDate && !isNaN(orderDate.getTime())) {
                    displayDate = `${String(orderDate.getDate()).padStart(2, '0')}/${String(orderDate.getMonth() + 1).padStart(2, '0')}/${orderDate.getFullYear()}`;
                } else if (typeof order.createdAt === 'string' && order.createdAt) {
                    displayDate = order.createdAt.split('T')[0];
                }
                row.insertCell().textContent = displayDate;
                row.insertCell().textContent = order.fileName || '-';
                row.insertCell().textContent = order.pages || '0';
                row.insertCell().textContent = order.printType === 'portrait' ? 'Dọc' : (order.printType === 'landscape' ? 'Ngang' : '-');
                row.insertCell().textContent = `${order.programDiscountPercentage || 0}%`;
                row.insertCell().textContent = order.friendDiscountApplied ? 'Có' : 'Không';
                row.insertCell().textContent = order.totalPriceBeforeDiscount != null ? order.totalPriceBeforeDiscount.toLocaleString('vi-VN') + ' VND' : '0 VND';
                row.insertCell().textContent = order.finalTotalPrice != null ? order.finalTotalPrice.toLocaleString('vi-VN') + ' VND' : '0 VND';
                
                const paidCell = row.insertCell();
                const paidCheckbox = document.createElement('input');
                paidCheckbox.type = 'checkbox';
                paidCheckbox.checked = order.paid || false; // Lấy trạng thái 'paid' từ dữ liệu đơn hàng, mặc định là false nếu không có
                paidCheckbox.classList.add('paid-status-checkbox')
                const orderIdStringForPaid = order.orderId ? (typeof order.orderId === 'string' ? order.orderId : order.orderId.toString()) : null;
                if (orderIdStringForPaid) {
                    paidCheckbox.dataset.orderId = orderIdStringForPaid;
                    paidCheckbox.dataset.customerId = customerId;
                    paidCheckbox.addEventListener('change', handlePaidStatusChange);
                } else {
                    paidCheckbox.disabled = true;
                    paidCheckbox.title = "Thiếu ID đơn hàng";
                }
                paidCell.appendChild(paidCheckbox);
                
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
            cell.colSpan = 11; // Cập nhật colSpan (9 cột cũ + STT + Thanh toán)
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
        modalCustomerNameDisplay.innerHTML = `<i class="fas fa-user-edit"></i> ${customer.name}`;
        modalCustomerClassDisplay.textContent = (customer.class || '').trim() || 'Chưa cung cấp';
        modalPurchaseCountSpan.textContent = customer.purchaseCount || 0;
        populateOrdersTable(customerId);
        editCustomerForm.style.display = 'none';
        addOrderForm.style.display = 'none';
        modalCustomerNameDisplay.style.display = 'inline-block';
        modalCustomerClassDisplay.style.display = 'inline';
        modal.style.display = 'block';
        document.body.classList.add('modal-open');
    }

    if(editCustomerInfoBtn) { /* ... (Mã sửa thông tin khách hàng như cũ) ... */ }
    if(cancelEditCustomerBtn) { /* ... (Mã hủy sửa như cũ) ... */ }
    if(saveCustomerInfoBtn) { /* ... (Mã lưu thông tin khách hàng như cũ, gọi PUT /api/customers?id=...) ... */ }


    // --- Hàm tính tiền cho đơn hàng thủ công ---
    function calculateManualOrderPrice() {
        const pages = parseInt(newOrderPagesInput.value) || 0;
        const printType = newOrderPrintTypeSelect.value;
        const isFriend = newOrderFriendDiscountCheckbox.checked;
        const discountPercentage = parseInt(newOrderProgramDiscountInput.value) || 0;

        if (pages <= 0) {
            if(newOrderBasePriceDisplay) newOrderBasePriceDisplay.textContent = "0 VND";
            if(newOrderFinalPriceDisplay) newOrderFinalPriceDisplay.textContent = "0 VND";
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

        if(newOrderBasePriceDisplay) newOrderBasePriceDisplay.textContent = `${basePrice.toLocaleString('vi-VN')} VND`;
        if(newOrderFinalPriceDisplay) newOrderFinalPriceDisplay.textContent = `${finalPrice.toLocaleString('vi-VN')} VND`;
        
        return {
            totalPriceBeforeDiscount: basePrice,
            friendDiscountApplied: isFriend,
            friendDiscountAmount: friendDiscountAmountValue,
            programDiscountPercentage: discountPercentage,
            programDiscountAmount: programDiscountAmountValue,
            finalTotalPrice: finalPrice
        };
    }

    // Hàm lấy ngày giờ hiện tại cho input datetime-local
    function getCurrentDateTimeLocalString() {
        const now = new Date();
        // Cần trừ đi timezone offset để input hiển thị đúng local time
        const tzoffset = now.getTimezoneOffset() * 60000; //offset in milliseconds
        const localISOTime = (new Date(now.valueOf() - tzoffset)).toISOString().slice(0, 16);
        return localISOTime;
    }
    
    // --- Chức năng Thêm đơn hàng thủ công ---
    if(showAddOrderFormBtn){
        showAddOrderFormBtn.onclick = () => {
            addOrderForm.style.display = 'block';
            addOrderForm.querySelectorAll('input[type="text"], input[type="number"]').forEach(input => input.value = ''); // Clear text/number
            if (newOrderDateInput) newOrderDateInput.value = getCurrentDateTimeLocalString();
            if (newOrderPrintTypeSelect) newOrderPrintTypeSelect.value = 'portrait';
            if (newOrderProgramDiscountInput) newOrderProgramDiscountInput.value = '0';
            if (newOrderFriendDiscountCheckbox) newOrderFriendDiscountCheckbox.checked = false;
            const newOrderPaidStatusCheckbox = document.getElementById('newOrderPaidStatus');
            if (newOrderPaidStatusCheckbox) newOrderPaidStatusCheckbox.checked = false;
            
            calculateManualOrderPrice(); // Tính tiền lần đầu

            // Gắn/gỡ event listener để tránh gắn nhiều lần
            const calculationInputs = [newOrderPagesInput, newOrderPrintTypeSelect, newOrderFriendDiscountCheckbox, newOrderProgramDiscountInput];
            calculationInputs.forEach(el => {
                if(el) {
                    el.removeEventListener('change', calculateManualOrderPrice); // Gỡ listener cũ nếu có
                    el.removeEventListener('input', calculateManualOrderPrice); // Gỡ listener cũ nếu có
                    el.addEventListener('change', calculateManualOrderPrice);
                    if (el.type === 'number' || el.type === 'text') {
                        el.addEventListener('input', calculateManualOrderPrice);
                    }
                }
            });
        };
    }

    if(cancelNewOrderBtn){
        cancelNewOrderBtn.onclick = () => {
            addOrderForm.style.display = 'none';
        };
    }

    if(saveNewOrderBtn){
        saveNewOrderBtn.onclick = async () => {
            if (!currentOpenCustomerId) {
                alert("Lỗi: Không xác định được khách hàng. Vui lòng thử lại.");
                return;
            }

            const calculatedPrices = calculateManualOrderPrice();
            if (!calculatedPrices) {
                alert("Lỗi tính toán giá, vui lòng kiểm tra lại thông số.");
                return;
            }
            
            let formattedCreatedAt = '';
            if (newOrderDateInput && newOrderDateInput.value) {
                const dateObj = new Date(newOrderDateInput.value); // datetime-local value is directly parsable
                if (!isNaN(dateObj.getTime())) {
                    const day = String(dateObj.getDate()).padStart(2, '0');
                    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const year = dateObj.getFullYear();
                    const hours = String(dateObj.getHours()).padStart(2, '0');
                    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
                    const seconds = String(dateObj.getSeconds()).padStart(2, '0');
                    formattedCreatedAt = `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
                } else {
                    alert("Ngày mua không hợp lệ. Vui lòng chọn lại."); return;
                }
            } else {
                 alert("Vui lòng chọn Ngày mua."); return;
            }

            const newOrderClientData = {
                createdAt: formattedCreatedAt, // Sẽ được parse ở backend thành Date object
                fileName: document.getElementById('newOrderFileName').value.trim(),
                pages: parseInt(newOrderPagesInput.value) || 0,
                printType: newOrderPrintTypeSelect.value,
                paid: document.getElementById('newOrderPaidStatus').checked,
                ...calculatedPrices // Bao gồm các trường giá đã tính
            };

            if (!newOrderClientData.fileName || newOrderClientData.pages <= 0) {
                alert("Vui lòng nhập Tên file và Số trang > 0.");
                return;
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
                modalPurchaseCountSpan.textContent = updatedCustomerFromServer.purchaseCount;
                renderCustomerList();
                addOrderForm.style.display = 'none';
                alert('Đã thêm đơn hàng thủ công thành công!');
            } catch (error) {
                console.error("Lỗi thêm đơn hàng thủ công:", error);
                alert("Lỗi: " + error.message + "\nHãy kiểm tra Console (F12).");
            }
        };
    }

    // --- Chức năng Cập nhật Trạng thái Thanh toán ---
    async function handlePaidStatusChange(event) {
        const checkbox = event.target;
        const orderId = checkbox.dataset.orderId;
        const customerId = checkbox.dataset.customerId;
        const newPaidStatus = checkbox.checked;

        if (!orderId || !customerId) {
            alert("Lỗi: Không tìm thấy ID đơn hàng hoặc ID khách hàng.");
            checkbox.checked = !newPaidStatus; 
            return;
        }
        console.log(`Cập nhật trạng thái thanh toán cho đơn ${orderId} của KH ${customerId} thành ${newPaidStatus}`);
        try {
            const response = await fetch(`/api/customers/${customerId}/orders/${orderId}/paidstatus`, { // API endpoint mới
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paid: newPaidStatus })
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(`Không thể cập nhật trạng thái: ${errorData.message}`);
            }
            const result = await response.json();
            const updatedOrderInCustomer = result.customer.orders.find(o => (o.orderId ? o.orderId.toString() : null) === orderId);
            
            // Cập nhật cache cục bộ
            const customerInCache = allCustomersData[customerId];
            const orderInCache = customerInCache.orders.find(o => (o.orderId ? o.orderId.toString() : null) === orderId);
            if (orderInCache && updatedOrderInCustomer) {
                orderInCache.paid = updatedOrderInCustomer.paid; 
            } else if (orderInCache && result.updatedOrder){ // Nếu API trả về chỉ đơn hàng
                 orderInCache.paid = result.updatedOrder.paid;
            }
            // Không cần render lại toàn bộ bảng nếu chỉ thay đổi checkbox, trừ khi muốn cập nhật thông tin khác
            console.log(`Đã cập nhật trạng thái thanh toán cho đơn ${orderId} thành ${newPaidStatus} trên server.`);

        } catch (error) {
            console.error("Lỗi cập nhật trạng thái thanh toán:", error);
            alert("Lỗi: " + error.message);
            checkbox.checked = !newPaidStatus; // Hoàn lại nếu lỗi
        }
    }

    // --- Các trình xử lý sự kiện chung cho modal ---
    if(closeModalButton) closeModalButton.onclick = () => { modal.style.display = 'none'; document.body.classList.remove('modal-open'); };
    window.onclick = (event) => { if (event.target === modal) { modal.style.display = 'none'; document.body.classList.remove('modal-open'); } };
    
    // Khởi tạo
    loadInitialCustomers();
});
