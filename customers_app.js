document.addEventListener('DOMContentLoaded', () => {
    const CUSTOMERS_STORAGE_KEY_UNUSED = 'photoAppCustomers'; // Không dùng nữa, nhưng để biết key cũ
    let allCustomersData = {}; // Cache dữ liệu khách hàng từ API { 'customerId': { ...customerData } }
    let currentOpenCustomerOriginalName = null; // Lưu tên gốc của KH đang xem/sửa trong modal
    let currentOpenCustomerId = null; // Lưu ID của KH đang xem/sửa trong modal

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

    // Hàm phụ trợ để parse chuỗi ngày tháng từ client
    function parseClientDateTimeToUTCDate(clientDateTimeString) {
        if (!clientDateTimeString) return new Date();
        const parts = clientDateTimeString.split(', ');
        const dateParts = parts[0].split('/');
        const timeParts = parts[1] ? parts[1].split(':') : ['00', '00', '00'];
        return new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]), parseInt(timeParts[0]), parseInt(timeParts[1]), parseInt(timeParts[2] || '0'));
    }
    
    // Hàm phụ trợ để parse ngày từ server (nếu là string) hoặc giữ nguyên nếu là Date object
    function ensureDateObject(dateValue) {
        if (!dateValue) return null;
        if (dateValue instanceof Date) return dateValue;
        return new Date(dateValue); // Thử parse string ISO date từ server
    }


    async function loadInitialCustomers() {
        console.log("Đang tải danh sách khách hàng từ API...");
        try {
            const response = await fetch('/api/customers');
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(`Lỗi HTTP ${response.status}: ${errorData.message}`);
            }
            const customersArray = await response.json();
            allCustomersData = {}; // Reset cache
            customersArray.forEach(customer => {
                allCustomersData[customer._id] = customer; // Dùng _id làm key cho cache
                if (customer.orders && Array.isArray(customer.orders)) {
                    customer.orders.forEach(order => { // Chuyển đổi createdAt thành Date object để sort
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
            li.textContent = searchTerm ? 'Không tìm thấy khách hàng.' : 'Chưa có dữ liệu khách hàng.';
            li.style.textAlign = 'center';
            customerListUl.appendChild(li);
            return;
        }

        customersToDisplay.sort((a, b) => a.name.localeCompare(b.name));

        customersToDisplay.forEach(customer => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `<i class="fas fa-user-circle"></i> ${customer.name} <span class="customer-meta">(${(customer.class || '').trim() || 'Chưa có lớp'}) - ${customer.purchaseCount || 0} lần mua</span>`;
            listItem.dataset.customerId = customer._id; // Lưu ID khách hàng
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
            // Sắp xếp đơn hàng: mới nhất lên đầu (dựa vào createdAtDate đã được parse)
            const sortedOrders = [...customer.orders].sort((a, b) => (b.createdAtDate || 0) - (a.createdAtDate || 0));
            
            sortedOrders.forEach(order => {
                const row = customerOrdersTbody.insertRow();
                let displayDate = 'N/A';
                if (order.createdAt) { // order.createdAt giờ là Date object từ server hoặc được parse
                    const dateObj = ensureDateObject(order.createdAt);
                    if(dateObj && !isNaN(dateObj)) {
                        displayDate = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;
                    } else {
                        displayDate = order.createdAt; // Nếu vẫn là string thì hiển thị string
                    }
                }
                row.insertCell().textContent = displayDate;
                row.insertCell().textContent = order.fileName || '-';
                row.insertCell().textContent = order.pages || '0';
                row.insertCell().textContent = order.printType === 'portrait' ? 'Dọc' : (order.printType === 'landscape' ? 'Ngang' : '-');
                row.insertCell().textContent = `${order.programDiscountPercentage || 0}%`;
                row.insertCell().textContent = order.friendDiscountApplied ? 'Có' : 'Không';
                row.insertCell().textContent = order.totalPriceBeforeDiscount != null ? order.totalPriceBeforeDiscount.toLocaleString('vi-VN') + ' VND' : '0 VND';
                row.insertCell().textContent = order.finalTotalPrice != null ? order.finalTotalPrice.toLocaleString('vi-VN') + ' VND' : '0 VND';
                
                const deleteCell = row.insertCell();
                const deleteBtn = document.createElement('button');
                deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
                deleteBtn.classList.add('delete-order-btn');
                deleteBtn.title = "Xóa đơn hàng này";
                deleteBtn.onclick = () => handleDeleteOrder(customerId, order.orderId); // Dùng order.orderId
                deleteCell.appendChild(deleteBtn);
            });
        } else {
            const row = customerOrdersTbody.insertRow();
            const cell = row.insertCell();
            cell.colSpan = 9; 
            cell.textContent = 'Không có lịch sử mua hàng cho khách này.';
            cell.style.textAlign = 'center';
        }
    }
    
    function openModalForCustomer(customerId) {
        currentOpenCustomerId = customerId;
        const customer = allCustomersData[customerId];
        if (!customer) {
            console.error("Không tìm thấy dữ liệu cho khách hàng ID:", customerId);
            alert("Lỗi: Không tìm thấy dữ liệu khách hàng.");
            return;
        }
        currentOpenCustomerOriginalName = customer.name; // Lưu tên gốc để xử lý đổi tên

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

    // --- Chức năng Sửa thông tin khách hàng ---
    if(editCustomerInfoBtn) {
        editCustomerInfoBtn.onclick = () => {
            const customer = allCustomersData[currentOpenCustomerId];
            if (!customer) return;
            editCustomerNameInput.value = customer.name;
            editCustomerClassInput.value = customer.class || '';
            editCustomerForm.style.display = 'block';
            modalCustomerNameDisplay.style.display = 'none';
        };
    }

    if(cancelEditCustomerBtn) {
        cancelEditCustomerBtn.onclick = () => {
            editCustomerForm.style.display = 'none';
            modalCustomerNameDisplay.style.display = 'inline-block';
        };
    }

    if(saveCustomerInfoBtn) {
        saveCustomerInfoBtn.onclick = async () => {
            const newName = editCustomerNameInput.value.trim();
            const newClass = editCustomerClassInput.value.trim();

            if (!newName) {
                alert('Tên khách hàng không được để trống.');
                return;
            }
            
            // Kiểm tra nếu tên mới trùng với khách hàng khác (không phải chính nó)
            if (newName !== currentOpenCustomerOriginalName) {
                const nameExists = Object.values(allCustomersData).some(cust => cust.name === newName && cust._id !== currentOpenCustomerId);
                if (nameExists) {
                    alert('Tên khách hàng mới đã tồn tại. Vui lòng chọn tên khác.');
                    return;
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

                // Cập nhật cache cục bộ
                delete allCustomersData[currentOpenCustomerOriginalName]; // Xóa key cũ nếu tên thay đổi
                allCustomersData[updatedCustomer._id] = updatedCustomer; // Thêm/Cập nhật với key là _id
                currentOpenCustomerOriginalName = updatedCustomer.name; // Cập nhật tên gốc
                currentOpenCustomerId = updatedCustomer._id; // Đảm bảo ID đúng

                renderCustomerList(); // Cập nhật danh sách chính
                
                modalCustomerNameDisplay.innerHTML = `<i class="fas fa-user-edit"></i> ${updatedCustomer.name}`;
                modalCustomerClassDisplay.textContent = (updatedCustomer.class || '').trim() || 'Chưa cung cấp';
                
                editCustomerForm.style.display = 'none';
                modalCustomerNameDisplay.style.display = 'inline-block';
                alert('Cập nhật thông tin khách hàng thành công!');
            } catch (error) {
                console.error("Lỗi cập nhật thông tin khách hàng:", error);
                alert("Lỗi: " + error.message);
            }
        };
    }

    // --- Chức năng Xóa đơn hàng ---
    async function handleDeleteOrder(customerId, orderId) {
        const customer = allCustomersData[customerId];
        if (!customer || !customer.orders) return;

        const orderToDelete = customer.orders.find(o => o.orderId === orderId || o.orderId.toString() === orderId);
        if (!orderToDelete) {
            alert("Lỗi: Không tìm thấy đơn hàng để xóa.");
            return;
        }
        console.log("Đang xóa đơn hàng với Customer ID:", customerId, "VÀ Order ID:", orderId);
        
        if (confirm(`Bạn có chắc chắn muốn xóa đơn hàng này không?\nFile: ${orderToDelete.fileName || 'Không tên'}\nNgày: ${orderToDelete.createdAt ? new Date(orderToDelete.createdAt).toLocaleDateString('vi-VN') : 'N/A'}`)) {
            try {
                const response = await fetch(`/api/customers/${customerId}/orders/${orderId}`, {
                    method: 'DELETE'
                });
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ message: response.statusText }));
                    throw new Error(`Không thể xóa đơn hàng: ${errorData.message}`);
                }
                const result = await response.json();
                const updatedCustomerFromServer = result.customer;

                // Cập nhật cache cục bộ
                allCustomersData[customerId] = updatedCustomerFromServer;
                // Cần parse lại date cho các order của updatedCustomerFromServer
                if (allCustomersData[customerId].orders && Array.isArray(allCustomersData[customerId].orders)) {
                    allCustomersData[customerId].orders.forEach(order => {
                        order.createdAtDate = ensureDateObject(order.createdAt);
                    });
                }


                populateOrdersTable(customerId); 
                modalPurchaseCountSpan.textContent = updatedCustomerFromServer.purchaseCount; 
                renderCustomerList(); 
                alert('Đã xóa đơn hàng.');
            } catch (error) {
                console.error("Lỗi xóa đơn hàng:", error);
                alert("Lỗi: " + error.message);
            }
        }
    };
    // Gán hàm vào global scope để HTML có thể gọi (nếu nút được tạo động với onclick="...")
    // Hoặc tốt hơn là addEventListener khi tạo nút
    // Vì nút xóa được tạo động, cần gán sự kiện khi tạo nút, như đã làm trong populateOrdersTable

    
    // --- Chức năng Thêm đơn hàng thủ công ---
    if(showAddOrderFormBtn){
        showAddOrderFormBtn.onclick = () => {
            addOrderForm.style.display = 'block';
            addOrderForm.querySelectorAll('input[type="text"], input[type="number"]').forEach(input => input.value = '');
            addOrderForm.querySelector('#newOrderPrintType').value = 'portrait';
            addOrderForm.querySelector('#newOrderProgramDiscount').value = '0';
            addOrderForm.querySelector('#newOrderFriendDiscount').checked = false;
             // Đặt ngày mặc định là hôm nay cho dễ nhập
            const now = new Date();
            const day = String(now.getDate()).padStart(2, '0');
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const year = now.getFullYear();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            document.getElementById('newOrderDate').value = `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
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

            const newOrderClientData = {
                createdAt: document.getElementById('newOrderDate').value.trim(),
                fileName: document.getElementById('newOrderFileName').value.trim(),
                pages: parseInt(document.getElementById('newOrderPages').value) || 0,
                printType: document.getElementById('newOrderPrintType').value,
                programDiscountPercentage: parseInt(document.getElementById('newOrderProgramDiscount').value) || 0,
                friendDiscountApplied: document.getElementById('newOrderFriendDiscount').checked,
                totalPriceBeforeDiscount: parseInt(document.getElementById('newOrderBasePrice').value) || 0,
                finalTotalPrice: parseInt(document.getElementById('newOrderFinalPrice').value) || 0,
            };

            if (!newOrderClientData.createdAt || !newOrderClientData.fileName || newOrderClientData.pages <= 0 || newOrderClientData.finalTotalPrice < 0) {
                alert("Vui lòng nhập đầy đủ và hợp lệ các thông tin đơn hàng (Ngày mua, Tên file, Số trang > 0, Tổng tiền >= 0).");
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
                    throw new Error(`Không thể thêm đơn hàng thủ công: ${errorData.message}`);
                }
                const result = await response.json();
                const updatedCustomerFromServer = result.customer;

                // Cập nhật cache cục bộ
                allCustomersData[currentOpenCustomerId] = updatedCustomerFromServer;
                // Parse date cho orders của customer mới cập nhật
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
                alert("Lỗi: " + error.message);
            }
        };
    }

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
    
    // Khởi tạo
    loadInitialCustomers();
});
