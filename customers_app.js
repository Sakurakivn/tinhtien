document.addEventListener('DOMContentLoaded', () => {
    const CUSTOMERS_STORAGE_KEY = 'photoAppCustomers';
    let allCustomersData = {};
    let currentEditingCustomerOriginalName = null; // Lưu tên gốc của KH đang sửa
    let currentCustomerForManualOrder = null; // Lưu tên KH khi thêm đơn hàng thủ công

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

    function loadCustomers() {
        const storedCustomers = localStorage.getItem(CUSTOMERS_STORAGE_KEY);
        if (storedCustomers) {
            allCustomersData = JSON.parse(storedCustomers);
            for (const customerName in allCustomersData) {
                if (allCustomersData[customerName].orders) {
                    allCustomersData[customerName].orders.forEach(order => {
                        parseAndStoreOrderDate(order);
                    });
                }
            }
        } else {
            allCustomersData = {};
        }
    }
    
    function parseAndStoreOrderDate(order) {
        if (order.createdAt) {
            try {
                const parts = order.createdAt.split(', ');
                const dateParts = parts[0].split('/');
                const timeParts = parts[1] ? parts[1].split(':') : ['0', '0', '0'];
                order.createdAtDate = new Date(
                    parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]),
                    parseInt(timeParts[0] || '0'), parseInt(timeParts[1] || '0'), parseInt(timeParts[2] || '0')
                );
            } catch (e) { order.createdAtDate = new Date(0); }
        } else { order.createdAtDate = new Date(0); }
    }


    function saveCustomersToLocalStorage() {
        localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(allCustomersData));
    }

    function renderCustomerList(customersToRender) {
        customerListUl.innerHTML = '';
        const displayData = customersToRender || allCustomersData;
        if (Object.keys(displayData).length === 0) {
            const li = document.createElement('li');
            li.textContent = customerSearchInput.value ? 'Không tìm thấy khách hàng.' : 'Chưa có dữ liệu khách hàng.';
            li.style.textAlign = 'center';
            customerListUl.appendChild(li);
            return;
        }
        const sortedCustomerNames = Object.keys(displayData).sort((a, b) => a.localeCompare(b));
        sortedCustomerNames.forEach(name => {
            const customer = displayData[name];
            const listItem = document.createElement('li');
            listItem.innerHTML = `<i class="fas fa-user-circle"></i> ${customer.name} <span class="customer-meta">(${(customer.class || '').trim() || 'Chưa có lớp'}) - ${customer.purchaseCount} lần mua</span>`;
            listItem.dataset.customerId = name;
            listItem.addEventListener('click', () => openModalForCustomer(name));
            customerListUl.appendChild(listItem);
        });
    }
    
    function filterCustomers() {
        const searchTerm = customerSearchInput.value.toLowerCase().trim();
        if (!searchTerm) {
            renderCustomerList(allCustomersData);
            return;
        }
        const filtered = {};
        for (const name in allCustomersData) {
            if (name.toLowerCase().includes(searchTerm) || (allCustomersData[name].class && allCustomersData[name].class.toLowerCase().includes(searchTerm))) {
                filtered[name] = allCustomersData[name];
            }
        }
        renderCustomerList(filtered);
    }

    function populateOrdersTable(customerName) {
        const customer = allCustomersData[customerName];
        customerOrdersTbody.innerHTML = '';
        if (customer && customer.orders && customer.orders.length > 0) {
            const sortedOrders = customer.orders.sort((a, b) => (b.createdAtDate || 0) - (a.createdAtDate || 0));
            sortedOrders.forEach((order, index) => {
                const row = customerOrdersTbody.insertRow();
                let displayDate = 'N/A';
                if (order.createdAt) {
                    try {
                        const parts = order.createdAt.split(', ');
                        const dateParts = parts[0].split('/');
                        displayDate = `${dateParts[0]}/${dateParts[1]}/${dateParts[2]}`;
                    } catch (e) { displayDate = order.createdAt; }
                }
                row.insertCell().textContent = displayDate;
                row.insertCell().textContent = order.fileName || '-';
                row.insertCell().textContent = order.pages || '0';
                row.insertCell().textContent = order.printType === 'portrait' ? 'Dọc' : (order.printType === 'landscape' ? 'Ngang' : '-');
                row.insertCell().textContent = `${order.programDiscountPercentage || 0}%`;
                row.insertCell().textContent = order.friendDiscountApplied ? 'Có' : 'Không';
                row.insertCell().textContent = order.totalPriceBeforeDiscount ? order.totalPriceBeforeDiscount.toLocaleString('vi-VN') + ' VND' : '0 VND';
                row.insertCell().textContent = order.finalTotalPrice ? order.finalTotalPrice.toLocaleString('vi-VN') + ' VND' : '0 VND';
                
                const deleteCell = row.insertCell();
                const deleteBtn = document.createElement('button');
                deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
                deleteBtn.classList.add('delete-order-btn');
                deleteBtn.title = "Xóa đơn hàng này";
                deleteBtn.onclick = () => handleDeleteOrder(customerName, index); // Truyền index trong mảng sortedOrders có thể sai nếu mảng gốc khác. Nên dùng ID đơn hàng nếu có, hoặc index của mảng gốc.
                                                                               // Để đơn giản, ta sẽ tìm index trong mảng gốc dựa trên một thuộc tính duy nhất, ví dụ createdAt + fileName (nếu đủ unique) hoặc cần ID đơn hàng.
                                                                               // Tạm thời dùng index của mảng đã sort, nhưng cần cẩn thận nếu mảng gốc customer.orders không được sort giống vậy.
                                                                               // Cách tốt hơn: tìm order trong customer.orders bằng cách so sánh đối tượng hoặc ID.
                deleteCell.appendChild(deleteBtn);
            });
        } else {
            const row = customerOrdersTbody.insertRow();
            const cell = row.insertCell();
            cell.colSpan = 9; // Số cột mới là 9
            cell.textContent = 'Không có lịch sử mua hàng cho khách này.';
            cell.style.textAlign = 'center';
        }
    }
    
    function openModalForCustomer(customerName) {
        currentEditingCustomerOriginalName = customerName; // Lưu tên gốc khi mở modal
        currentCustomerForManualOrder = customerName; // Lưu cho việc thêm đơn hàng
        const customer = allCustomersData[customerName];
        if (!customer) return;

        modalCustomerNameDisplay.innerHTML = `<i class="fas fa-user-edit"></i> ${customer.name}`;
        modalCustomerClassDisplay.textContent = (customer.class || '').trim() || 'Chưa cung cấp';
        modalPurchaseCountSpan.textContent = customer.purchaseCount;

        populateOrdersTable(customerName); // Điền bảng đơn hàng

        editCustomerForm.style.display = 'none'; // Ẩn form sửa
        addOrderForm.style.display = 'none'; // Ẩn form thêm đơn hàng
        modalCustomerNameDisplay.style.display = 'inline-block'; // Hiện tên KH
        modalCustomerClassDisplay.style.display = 'inline'; // Hiện lớp KH

        modal.style.display = 'block';
        document.body.classList.add('modal-open');
    }

    // --- Chức năng Sửa thông tin khách hàng ---
    if(editCustomerInfoBtn) {
        editCustomerInfoBtn.onclick = () => {
            const customer = allCustomersData[currentEditingCustomerOriginalName];
            if (!customer) return;
            editCustomerNameInput.value = customer.name;
            editCustomerClassInput.value = customer.class || '';
            editCustomerForm.style.display = 'block';
            modalCustomerNameDisplay.style.display = 'none'; // Ẩn tên hiển thị
            // Không ẩn modalCustomerClassDisplay vì nó nằm riêng
        };
    }

    if(cancelEditCustomerBtn) {
        cancelEditCustomerBtn.onclick = () => {
            editCustomerForm.style.display = 'none';
            modalCustomerNameDisplay.style.display = 'inline-block'; // Hiện lại tên
        };
    }

    if(saveCustomerInfoBtn) {
        saveCustomerInfoBtn.onclick = () => {
            const newName = editCustomerNameInput.value.trim();
            const newClass = editCustomerClassInput.value.trim();

            if (!newName) {
                alert('Tên khách hàng không được để trống.');
                return;
            }
            if (newName !== currentEditingCustomerOriginalName && allCustomersData[newName]) {
                alert('Tên khách hàng mới đã tồn tại. Vui lòng chọn tên khác.');
                return;
            }

            const customerDataToUpdate = allCustomersData[currentEditingCustomerOriginalName];
            if (!customerDataToUpdate) return;

            // Cập nhật thông tin
            customerDataToUpdate.name = newName;
            customerDataToUpdate.class = newClass;

            if (newName !== currentEditingCustomerOriginalName) {
                // Nếu tên thay đổi, cần cập nhật key trong allCustomersData
                allCustomersData[newName] = customerDataToUpdate; // Gán dữ liệu cho key mới
                delete allCustomersData[currentEditingCustomerOriginalName]; // Xóa key cũ
                currentEditingCustomerOriginalName = newName; // Cập nhật tên gốc đang sửa thành tên mới
            }
            
            saveCustomersToLocalStorage();
            renderCustomerList(allCustomersData); // Cập nhật danh sách chính
            
            // Cập nhật hiển thị trong modal
            modalCustomerNameDisplay.innerHTML = `<i class="fas fa-user-edit"></i> ${newName}`;
            modalCustomerClassDisplay.textContent = (newClass || '').trim() || 'Chưa cung cấp';
            
            editCustomerForm.style.display = 'none';
            modalCustomerNameDisplay.style.display = 'inline-block';
            alert('Cập nhật thông tin khách hàng thành công!');
        };
    }

    // --- Chức năng Xóa đơn hàng ---
    window.handleDeleteOrder = (customerName, orderIndexInSortedList) => { // Expose to global for inline onclick or find better way
        const customer = allCustomersData[customerName];
        if (!customer || !customer.orders) return;

        // Vì orderIndexInSortedList là index từ mảng đã sort, cần tìm đúng order trong mảng gốc
        const sortedOrders = [...customer.orders].sort((a, b) => (b.createdAtDate || 0) - (a.createdAtDate || 0));
        const orderToDelete = sortedOrders[orderIndexInSortedList];
        
        // Tìm index của orderToDelete trong mảng gốc customer.orders
        const originalIndex = customer.orders.findIndex(o => o === orderToDelete);

        if (originalIndex === -1) {
            alert("Không tìm thấy đơn hàng để xóa. Có lỗi xảy ra.");
            return;
        }

        if (confirm(`Bạn có chắc chắn muốn xóa đơn hàng này không?\nFile: ${orderToDelete.fileName || 'Không có tên'}\nNgày: ${orderToDelete.createdAt || 'N/A'}`)) {
            customer.orders.splice(originalIndex, 1);
            if (customer.purchaseCount > 0) {
                customer.purchaseCount -= 1;
            }
            saveCustomersToLocalStorage();
            populateOrdersTable(customerName); // Cập nhật lại bảng đơn hàng
            modalPurchaseCountSpan.textContent = customer.purchaseCount; // Cập nhật số lần mua hiển thị
            renderCustomerList(allCustomersData); // Cập nhật danh sách chính (số lần mua thay đổi)
            alert('Đã xóa đơn hàng.');
        }
    };
    
    // --- Chức năng Thêm đơn hàng thủ công ---
    if(showAddOrderFormBtn){
        showAddOrderFormBtn.onclick = () => {
            addOrderForm.style.display = 'block';
            // Reset form thêm đơn hàng
            addOrderForm.querySelectorAll('input[type="text"], input[type="number"]').forEach(input => input.value = '');
            addOrderForm.querySelector('#newOrderPrintType').value = 'portrait';
            addOrderForm.querySelector('#newOrderProgramDiscount').value = '0';
            addOrderForm.querySelector('#newOrderFriendDiscount').checked = false;
        };
    }

    if(cancelNewOrderBtn){
        cancelNewOrderBtn.onclick = () => {
            addOrderForm.style.display = 'none';
        };
    }

    if(saveNewOrderBtn){
        saveNewOrderBtn.onclick = () => {
            const customer = allCustomersData[currentCustomerForManualOrder];
            if (!customer) {
                alert("Không tìm thấy khách hàng để thêm đơn. Vui lòng đóng modal và thử lại.");
                return;
            }

            const newOrder = {
                createdAt: document.getElementById('newOrderDate').value.trim(),
                fileName: document.getElementById('newOrderFileName').value.trim(),
                pages: parseInt(document.getElementById('newOrderPages').value) || 0,
                printType: document.getElementById('newOrderPrintType').value,
                programDiscountPercentage: parseInt(document.getElementById('newOrderProgramDiscount').value) || 0,
                friendDiscountApplied: document.getElementById('newOrderFriendDiscount').checked,
                totalPriceBeforeDiscount: parseInt(document.getElementById('newOrderBasePrice').value) || 0,
                finalTotalPrice: parseInt(document.getElementById('newOrderFinalPrice').value) || 0,
            };
            parseAndStoreOrderDate(newOrder); // Xử lý createdAtDate cho đơn hàng mới

            if (!newOrder.createdAt || !newOrder.fileName) { // Kiểm tra sơ bộ
                alert("Vui lòng nhập ít nhất Ngày mua và Tên file.");
                return;
            }

            customer.orders.push(newOrder);
            customer.purchaseCount += 1;

            saveCustomersToLocalStorage();
            populateOrdersTable(currentCustomerForManualOrder);
            modalPurchaseCountSpan.textContent = customer.purchaseCount;
            renderCustomerList(allCustomersData);
            addOrderForm.style.display = 'none';
            alert('Đã thêm đơn hàng thủ công thành công!');
        };
    }


    // --- Các trình xử lý sự kiện chung cho modal ---
    closeModalButton.onclick = () => {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    };
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
        }
    };
    if (customerSearchInput) {
        customerSearchInput.addEventListener('input', filterCustomers);
    }

    // Khởi tạo
    loadCustomers();
    renderCustomerList(allCustomersData);
});
