document.addEventListener('DOMContentLoaded', () => {
    // Không còn dùng CUSTOMERS_STORAGE_KEY nữa vì đã chuyển sang API
    let allCustomersData = {}; // Cache dữ liệu khách hàng từ API: { 'mongodb_customer_id': { ...customerData } }
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

    // Hàm phụ trợ để đảm bảo giá trị ngày là một đối tượng Date hợp lệ
    // Đầu vào có thể là chuỗi ISO date (từ MongoDB), timestamp, hoặc đối tượng Date đã có.
    function ensureDateObject(dateValue) {
        if (!dateValue) return null;
        if (dateValue instanceof Date && !isNaN(dateValue.getTime())) return dateValue;
        
        const parsedDate = new Date(dateValue); // Thử parse trực tiếp
        if (!isNaN(parsedDate.getTime())) return parsedDate;

        // Fallback cho định dạng "dd/mm/yyyy, HH:MM:SS" nếu server không trả về ISO date
        if (typeof dateValue === 'string' && dateValue.includes('/') && dateValue.includes(':')) {
            try {
                const parts = String(dateValue).split(', '); 
                const dateParts = parts[0].split('/'); 
                const timeParts = parts[1] ? parts[1].split(':') : ['00', '00', '00'];
                const isoAttempt = new Date(
                    parseInt(dateParts[2]), 
                    parseInt(dateParts[1]) - 1, 
                    parseInt(dateParts[0]),
                    parseInt(timeParts[0] || '0'), 
                    parseInt(timeParts[1] || '0'), 
                    parseInt(timeParts[2] || '0')
                );
                if (!isNaN(isoAttempt.getTime())) return isoAttempt;
            } catch (e) {
                // Bỏ qua lỗi parse này
            }
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
                        order.createdAtDate = ensureDateObject(order.createdAt); // Xử lý sẵn createdAtDate
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
            
            sortedOrders.forEach(order => {
                const row = customerOrdersTbody.insertRow();
                let displayDate = 'N/A';
                const orderDate = ensureDateObject(order.createdAt); // order.createdAt là từ server
                if (orderDate && !isNaN(orderDate.getTime())) {
                    displayDate = `${String(orderDate.getDate()).padStart(2, '0')}/${String(orderDate.getMonth() + 1).padStart(2, '0')}/${orderDate.getFullYear()}`;
                } else if (typeof order.createdAt === 'string') {
                     // Fallback nếu createdAt là string không parse được, hiển thị phần ngày nếu có
                    displayDate = order.createdAt.split(',')[0] || order.createdAt;
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
                // Đảm bảo order.orderId tồn tại và là string trước khi truyền
                const orderIdString = order.orderId ? (typeof order.orderId === 'string' ? order.orderId : order.orderId.toString()) : null;
                if (orderIdString) {
                    deleteBtn.onclick = () => handleDeleteOrder(customerId, orderIdString);
                } else {
                    deleteBtn.disabled = true;
                    deleteBtn.title = "Không thể xóa: thiếu ID đơn hàng";
                }
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

                // Cập nhật cache cục bộ: Xóa key cũ nếu tên thay đổi, dùng _id làm key chính
                if (allCustomersData[currentOpenCustomerOriginalName] && currentOpenCustomerOriginalName !== updatedCustomer.name) {
                     // Nếu tên gốc (dùng làm key trong dropdown hoặc tìm kiếm cũ) khác tên mới, 
                     // và ID vẫn là currentOpenCustomerId (tức là không phải tạo KH mới do đổi tên)
                     // thì cần cập nhật lại allCustomersData nếu key của nó là tên.
                     // Nhưng vì allCustomersData giờ dùng _id làm key, chỉ cần cập nhật object tại _id đó.
                }
                allCustomersData[updatedCustomer._id] = updatedCustomer; 
                // Nếu tên gốc đã từng được dùng làm key đâu đó mà không phải _id, cần cẩn thận
                // Tuy nhiên, renderCustomerList giờ dựa trên Object.values(allCustomersData) nên sẽ lấy tên mới.

                currentOpenCustomerOriginalName = updatedCustomer.name; // Cập nhật tên gốc cho lần sửa tiếp theo
                // currentOpenCustomerId không đổi vì chúng ta PUT dựa trên ID

                renderCustomerList(); 
                
                modalCustomerNameDisplay.innerHTML = `<i class="fas fa-user-edit"></i> ${updatedCustomer.name}`;
                modalCustomerClassDisplay.textContent = (updatedCustomer.class || '').trim() || 'Chưa cung cấp';
                // Purchase count không thay đổi khi chỉ sửa tên/lớp
                
                editCustomerForm.style.display = 'none';
                modalCustomerNameDisplay.style.display = 'inline-block';
                alert('Cập nhật thông tin khách hàng thành công!');
            } catch (error) {
                console.error("Lỗi cập nhật thông tin khách hàng:", error);
                alert("Lỗi: " + error.message);
            }
        };
    }

    async function handleDeleteOrder(customerId, orderIdStr) {
        console.log(`[Frontend] Bắt đầu handleDeleteOrder. CustomerID: ${customerId}, OrderID chuỗi: ${orderIdStr}`);
        
        const customer = allCustomersData[customerId];
        if (!customer || !customer.orders) {
            console.error("[Frontend] Không tìm thấy khách hàng hoặc đơn hàng của khách hàng trong cache cục bộ.");
            alert("Lỗi: Không tìm thấy dữ liệu khách hàng cục bộ.");
            return;
        }

        const orderObjectForConfirm = customer.orders.find(o => {
            const currentOrderProcessedId = o.orderId ? (typeof o.orderId === 'string' ? o.orderId : o.orderId.toString()) : null;
            return currentOrderProcessedId === orderIdStr;
        });
        
        let confirmMessage = `Bạn có chắc chắn muốn xóa đơn hàng có ID: ${orderIdStr} không?`;
        if (orderObjectForConfirm) {
            const orderDate = ensureDateObject(orderObjectForConfirm.createdAt);
            const formattedDate = orderDate && !isNaN(orderDate.getTime()) ? `${String(orderDate.getDate()).padStart(2, '0')}/${String(orderDate.getMonth() + 1).padStart(2, '0')}/${orderDate.getFullYear()}` : 'N/A';
            confirmMessage = `Bạn có chắc chắn muốn xóa đơn hàng?\nFile: ${orderObjectForConfirm.fileName || 'Không tên'}\nNgày: ${formattedDate}`;
        } else {
            console.warn(`[Frontend] Không tìm thấy chi tiết đơn hàng với ID ${orderIdStr} trong cache để hiển thị confirm.`);
        }
        
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
                alert("Lỗi khi xóa đơn hàng: " + error.message + "\nHãy kiểm tra Console (F12) để biết thêm chi tiết."); 
            }
        } else {
            console.log("[Frontend] Người dùng đã hủy thao tác xóa đơn hàng.");
        }
    };
    
    if(showAddOrderFormBtn){
        showAddOrderFormBtn.onclick = () => {
            addOrderForm.style.display = 'block';
            addOrderForm.querySelectorAll('input[type="text"], input[type="number"]').forEach(input => input.value = '');
            addOrderForm.querySelector('#newOrderPrintType').value = 'portrait';
            addOrderForm.querySelector('#newOrderProgramDiscount').value = '0';
            addOrderForm.querySelector('#newOrderFriendDiscount').checked = false;
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
                alert("Lỗi: Không xác định được khách hàng. Vui lòng đóng modal và thử lại.");
                return;
            }

            const newOrderClientData = {
                createdAt: document.getElementById('newOrderDate').value.trim(), // Sẽ được parse ở backend
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
                alert("Lỗi: " + error.message + "\nHãy kiểm tra Console (F12) để biết thêm chi tiết.");
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
