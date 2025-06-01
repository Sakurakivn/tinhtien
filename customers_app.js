document.addEventListener('DOMContentLoaded', () => {
    const CUSTOMERS_STORAGE_KEY = 'photoAppCustomers'; // Phải giống hệt key trong app.js
    let allCustomersData = {};

    const customerListUl = document.getElementById('customerList');
    const modal = document.getElementById('customerModal');
    const closeModalButton = modal.querySelector('.close-button');
    const modalCustomerNameH3 = document.getElementById('modalCustomerName');
    const modalCustomerClassSpan = document.getElementById('modalCustomerClass');
    const modalPurchaseCountSpan = document.getElementById('modalPurchaseCount');
    const customerOrdersTbody = document.getElementById('customerOrdersTbody');
    const customerSearchInput = document.getElementById('customerSearchInput');

    function loadCustomers() {
        const storedCustomers = localStorage.getItem(CUSTOMERS_STORAGE_KEY);
        if (storedCustomers) {
            allCustomersData = JSON.parse(storedCustomers);
            // Xử lý createdAtDate cho việc sắp xếp đơn hàng
            for (const customerName in allCustomersData) {
                if (allCustomersData[customerName].orders) {
                    allCustomersData[customerName].orders.forEach(order => {
                        if (order.createdAt) {
                            try {
                                const parts = order.createdAt.split(', '); // "dd/mm/yyyy, HH:MM:SS"
                                const dateParts = parts[0].split('/'); // [dd, mm, yyyy]
                                const timeParts = parts[1] ? parts[1].split(':') : ['0', '0', '0']; // [HH, MM, SS]
                                order.createdAtDate = new Date(
                                    parseInt(dateParts[2]),
                                    parseInt(dateParts[1]) - 1, // Tháng trong JS là 0-indexed
                                    parseInt(dateParts[0]),
                                    parseInt(timeParts[0] || '0'),
                                    parseInt(timeParts[1] || '0'),
                                    parseInt(timeParts[2] || '0')
                                );
                            } catch (e) {
                                console.warn("Không thể parse ngày:", order.createdAt, e);
                                order.createdAtDate = new Date(0); 
                            }
                        } else {
                             order.createdAtDate = new Date(0);
                        }
                    });
                }
            }
        } else {
            allCustomersData = {};
        }
    }

    function renderCustomerList(customersToRender) {
        customerListUl.innerHTML = ''; 
        if (Object.keys(customersToRender).length === 0) {
            const noCustomerLi = document.createElement('li');
            noCustomerLi.textContent = customerSearchInput.value ? 'Không tìm thấy khách hàng.' : 'Chưa có dữ liệu khách hàng.';
            noCustomerLi.style.textAlign = 'center';
            customerListUl.appendChild(noCustomerLi);
            return;
        }

        const sortedCustomerNames = Object.keys(customersToRender).sort((a, b) => a.localeCompare(b));

        for (const name of sortedCustomerNames) {
            const customer = customersToRender[name];
            const listItem = document.createElement('li');
            listItem.innerHTML = `
                <i class="fas fa-user-circle"></i> ${customer.name} 
                <span class="customer-meta">(${(customer.class || 'Chưa có lớp').trim() || 'Chưa có lớp'}) - ${customer.purchaseCount} lần mua</span>
            `;
            listItem.dataset.customerId = name; 
            listItem.addEventListener('click', () => openModalForCustomer(name));
            customerListUl.appendChild(listItem);
        }
    }
    
    function filterCustomers() {
        const searchTerm = customerSearchInput.value.toLowerCase().trim();
        if (!searchTerm) {
            renderCustomerList(allCustomersData);
            return;
        }
        const filteredCustomers = {};
        for (const name in allCustomersData) {
            if (name.toLowerCase().includes(searchTerm) || (allCustomersData[name].class && allCustomersData[name].class.toLowerCase().includes(searchTerm))) {
                filteredCustomers[name] = allCustomersData[name];
            }
        }
        renderCustomerList(filteredCustomers);
    }

    function openModalForCustomer(customerName) {
        const customer = allCustomersData[customerName];
        if (!customer) return;

        modalCustomerNameH3.innerHTML = `<i class="fas fa-user-edit"></i> ${customer.name}`;
        modalCustomerClassSpan.textContent = (customer.class || 'Chưa cung cấp').trim() || 'Chưa cung cấp';
        modalPurchaseCountSpan.textContent = customer.purchaseCount;

        customerOrdersTbody.innerHTML = ''; 

        if (customer.orders && customer.orders.length > 0) {
            const sortedOrders = customer.orders.sort((a, b) => (b.createdAtDate || 0) - (a.createdAtDate || 0));

            sortedOrders.forEach(order => {
                const row = customerOrdersTbody.insertRow();
                
                let displayDate = 'N/A';
                if (order.createdAt) {
                    try {
                        const parts = order.createdAt.split(', ');
                        const dateParts = parts[0].split('/');
                        displayDate = `${dateParts[0]}/${dateParts[1]}/${dateParts[2]}`;
                    } catch (e) {
                        displayDate = order.createdAt; 
                    }
                }
                row.insertCell().textContent = displayDate;
                row.insertCell().textContent = order.fileName || '-';
                row.insertCell().textContent = order.pages || '0';
                row.insertCell().textContent = order.printType === 'portrait' ? 'Dọc' : (order.printType === 'landscape' ? 'Ngang' : '-');
                row.insertCell().textContent = `${order.programDiscountPercentage || 0}%`;
                row.insertCell().textContent = order.friendDiscountApplied ? 'Có' : 'Không'; 
                row.insertCell().textContent = order.totalPriceBeforeDiscount ? order.totalPriceBeforeDiscount.toLocaleString('vi-VN') + ' VND' : '0 VND';
                row.insertCell().textContent = order.finalTotalPrice ? order.finalTotalPrice.toLocaleString('vi-VN') + ' VND' : '0 VND';
            });
        } else {
            const row = customerOrdersTbody.insertRow();
            const cell = row.insertCell();
            cell.colSpan = 8; 
            cell.textContent = 'Không có lịch sử mua hàng cho khách này.';
            cell.style.textAlign = 'center';
        }
        modal.style.display = 'block';
        document.body.classList.add('modal-open'); 
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
    
    if (customerSearchInput) {
        customerSearchInput.addEventListener('input', filterCustomers);
    }

    loadCustomers();
    renderCustomerList(allCustomersData);
});
