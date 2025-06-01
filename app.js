// Biến toàn cục để lưu trữ dữ liệu khách hàng
// Cấu trúc: { 'Tên Khách Hàng': { name: 'Tên', class: 'Lớp', purchaseCount: 0, orders: [] } }
let customers = {};
const CUSTOMERS_STORAGE_KEY = 'photoAppCustomers';

// Hàm tải dữ liệu khách hàng từ localStorage
function loadCustomersFromStorage() {
    const storedCustomers = localStorage.getItem(CUSTOMERS_STORAGE_KEY);
    if (storedCustomers) {
        customers = JSON.parse(storedCustomers);
    } else {
        customers = {}; // Khởi tạo nếu chưa có gì trong localStorage
    }
}

// Hàm lưu dữ liệu khách hàng vào localStorage
function saveCustomersToStorage() {
    localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(customers));
}

// Hàm điền danh sách khách hàng vào dropdown
function populateCustomerDropdown() {
    const customerSelect = document.getElementById('customerSelect');
    if (!customerSelect) return;

    const currentSelectedName = customerSelect.value; // Giữ lại lựa chọn hiện tại (nếu có)

    // Xóa các lựa chọn cũ (trừ lựa chọn mặc định đầu tiên là "-- Khách hàng mới / Nhập tay --")
    while (customerSelect.options.length > 1) {
        customerSelect.remove(1);
    }

    // Sắp xếp tên khách hàng theo alphabet để dễ tìm
    const sortedCustomerNames = Object.keys(customers).sort((a, b) => a.localeCompare(b));

    for (const name of sortedCustomerNames) {
        const customer = customers[name];
        const option = document.createElement('option');
        option.value = name;
        // Đảm bảo customer.class không phải là null/undefined khi hiển thị
        const displayClass = (customer.class || '').trim() || 'Chưa có lớp';
        option.textContent = `${name} (${displayClass}) - ${customer.purchaseCount} lần mua`;
        customerSelect.appendChild(option);
    }

    // Chọn lại khách hàng nếu đã được chọn trước đó hoặc là khách hàng hiện tại
    if (currentSelectedName && customers[currentSelectedName]) {
        customerSelect.value = currentSelectedName;
    } else if (document.getElementById('customerName').value && customers[document.getElementById('customerName').value]) {
        // Nếu có tên khách hàng trong input và họ tồn tại, chọn họ
        customerSelect.value = document.getElementById('customerName').value;
    }
    else {
        customerSelect.value = ""; // Mặc định là khách hàng mới nếu không có lựa chọn nào phù hợp
    }
}

// Hàm xử lý khi chọn một khách hàng từ dropdown
function handleCustomerSelection() {
    const customerSelect = document.getElementById('customerSelect');
    const customerNameInput = document.getElementById('customerName');
    const customerClassInput = document.getElementById('customerClass');

    if (!customerSelect || !customerNameInput || !customerClassInput) return;

    const selectedName = customerSelect.value;
    if (selectedName && customers[selectedName]) {
        // Điền thông tin khách hàng đã chọn
        customerNameInput.value = customers[selectedName].name;
        customerClassInput.value = customers[selectedName].class || '';
    } else {
        // Cho phép nhập mới nếu chọn "-- Khách hàng mới --"
        if (selectedName === "") { 
            customerNameInput.value = ''; 
            customerClassInput.value = '';
        }
    }
}

// Khởi tạo các tính năng quản lý khách hàng khi trang được tải
document.addEventListener('DOMContentLoaded', () => {
    loadCustomersFromStorage();
    populateCustomerDropdown();

    const customerSelect = document.getElementById('customerSelect');
    if (customerSelect) {
        customerSelect.addEventListener('change', handleCustomerSelection);
    }
});

// Xử lý sự kiện submit form tính tiền
document.getElementById('orderForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const customerNameInput = document.getElementById('customerName');
    const customerClassInput = document.getElementById('customerClass');
    
    const customerName = customerNameInput.value.trim();
    const customerClass = customerClassInput.value.trim();
    const fileName = document.getElementById('fileName').value;
    const pages = parseInt(document.getElementById('pages').value);
    const printType = document.getElementById('printType').value;
    const friendDiscountCheckbox = document.getElementById('friendDiscount').checked;
    const discountPercentage = parseInt(document.getElementById('discount').value) || 0;

    if (isNaN(pages) || pages <= 0 || !customerName) {
        alert("Vui lòng nhập số trang hợp lệ và tên khách hàng!");
        return;
    }

    // === QUẢN LÝ KHÁCH HÀNG ===
    if (!customers[customerName]) {
        customers[customerName] = {
            name: customerName,
            class: customerClass,
            purchaseCount: 0, 
            orders: [] 
        };
    } else {
        customers[customerName].class = customerClass; // Cập nhật lớp nếu có thay đổi
    }
    customers[customerName].purchaseCount += 1; 
    // === KẾT THÚC QUẢN LÝ KHÁCH HÀNG ===

    // === LOGIC TÍNH TOÁN GIÁ (giữ nguyên từ file gốc của bạn, giả định friendDiscountCheckbox ảnh hưởng pricePerPage và có thêm 10% giảm) ===
    let pricePerPage;
    if (pages <= 250) {
        pricePerPage = friendDiscountCheckbox ? 483 : 543;
    } else if (pages <= 500) {
        pricePerPage = friendDiscountCheckbox ? 463 : 520;
    } else if (pages <= 750) {
        pricePerPage = friendDiscountCheckbox ? 436 : 490;
    } else {
        pricePerPage = friendDiscountCheckbox ? 400 : 450;
    }

    let totalPages = printType === 'portrait' ? pages / 2 : pages / 4;
    let totalPriceAfterTier = totalPages * pricePerPage; // Giá sau khi áp dụng giá/trang ưu đãi (nếu có)

    const additionalFriendDiscountValue = friendDiscountCheckbox ? totalPriceAfterTier * 0.1 : 0;
    const programDiscountValue = totalPriceAfterTier * (discountPercentage / 100);
    
    const finalTotalCalculated = totalPriceAfterTier - additionalFriendDiscountValue - programDiscountValue;

    const roundedTotalPriceBeforePercentageDiscounts = Math.round(totalPriceAfterTier);
    const roundedAdditionalFriendDiscount = Math.round(additionalFriendDiscountValue);
    const roundedProgramDiscount = Math.round(programDiscountValue);
    const roundedFinalTotalPrice = Math.round(finalTotalCalculated);

    const formattedFinalTotalPrice = roundedFinalTotalPrice.toLocaleString('vi-VN');
    const formattedTotalPriceBeforePercentageDiscounts = roundedTotalPriceBeforePercentageDiscounts.toLocaleString('vi-VN');
    const formattedAdditionalFriendDiscount = roundedAdditionalFriendDiscount.toLocaleString('vi-VN');
    const formattedProgramDiscount = roundedProgramDiscount.toLocaleString('vi-VN');

    let priceDetailsHTML = `<p><strong>Số tiền tạm tính (sau ưu đãi giá/trang):</strong> ${formattedTotalPriceBeforePercentageDiscounts} VND</p>`;

    if (roundedAdditionalFriendDiscount > 0) {
        priceDetailsHTML += `<p><em>- ${formattedAdditionalFriendDiscount} VND : Giảm thêm cho Khách hàng thân thiết (10%)</em></p>`;
    }
    if (roundedProgramDiscount > 0) {
        priceDetailsHTML += `<p><em>- ${formattedProgramDiscount} VND : Chương trình giảm ${discountPercentage}%</em></p>`;
    }
    priceDetailsHTML += `<p><strong class="totalAmount">Tổng số tiền: </strong>${formattedFinalTotalPrice} VND</p>`;

    const orderTime = new Date();
    let estimatedDeliveryDateStart = new Date(orderTime);
    let estimatedDeliveryDateEnd = new Date(orderTime);

    if (orderTime.getHours() >= 16) {
        estimatedDeliveryDateStart.setDate(estimatedDeliveryDateStart.getDate() + 1);
        estimatedDeliveryDateEnd.setDate(estimatedDeliveryDateEnd.getDate() + 2);
    } else {
        estimatedDeliveryDateStart.setDate(estimatedDeliveryDateStart.getDate() + 1);
        estimatedDeliveryDateEnd.setDate(estimatedDeliveryDateEnd.getDate() + 1);
    }

    if (estimatedDeliveryDateStart.getDay() === 0) { 
        estimatedDeliveryDateStart.setDate(estimatedDeliveryDateStart.getDate() + 2); 
        estimatedDeliveryDateEnd.setDate(estimatedDeliveryDateEnd.getDate() + 2); 
    }

    const dateOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };
    const formattedStartDate = estimatedDeliveryDateStart.toLocaleDateString('vi-VN', dateOptions);
    const formattedEndDate = estimatedDeliveryDateEnd.toLocaleDateString('vi-VN', dateOptions);

    priceDetailsHTML += `<p><strong>Dự kiến ngày nhận hàng:</strong> ${formattedStartDate} - ${formattedEndDate}</p>`;
    priceDetailsHTML += `<p><strong>Số lần mua của khách ${customerName}:</strong> ${customers[customerName].purchaseCount}</p>`;
    priceDetailsHTML += `<button id="generateInvoice">Xuất hóa đơn</button>`;

    document.getElementById('priceDetails').innerHTML = priceDetailsHTML;

    // === LƯU DỮ LIỆU HÓA ĐƠN CHO INVOICE.HTML VÀ LỊCH SỬ KHÁCH HÀNG ===
    const invoiceData = {
        customerName,
        customerClass,
        fileName,
        pages,
        printType,
        totalPriceBeforeDiscount: roundedTotalPriceBeforePercentageDiscounts,
        friendDiscountApplied: friendDiscountCheckbox, // Lưu trạng thái checkbox KHTT
        friendDiscountAmount: roundedAdditionalFriendDiscount, 
        programDiscountPercentage: discountPercentage, // Lưu % giảm giá chương trình
        programDiscountAmount: roundedProgramDiscount, 
        finalTotalPrice: roundedFinalTotalPrice, 
        estimatedStartDate: formattedStartDate,
        estimatedEndDate: formattedEndDate,
        purchaseCount: customers[customerName].purchaseCount, 
        createdAt: new Date().toLocaleString('vi-VN', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        })
    };

    customers[customerName].orders.push(invoiceData);
    saveCustomersToStorage(); 
    
    populateCustomerDropdown();
    // Đảm bảo khách hàng hiện tại được chọn trong dropdown sau khi cập nhật
    const customerSelectElement = document.getElementById('customerSelect');
    if(customerSelectElement) { // Kiểm tra xem element có tồn tại không
        customerSelectElement.value = customerName;
    }


    localStorage.setItem('invoiceData', JSON.stringify(invoiceData)); 

    fetch('https://script.google.com/macros/s/AKfycbxiJXoMIf4fffa9YOQYTVs-lVNTiQXLCww4eW744isDTsYK-wK2UFVCAUBQ61wcty4hUQ/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData) 
    })
    .then(response => response.json())
    .then(data => {
        if (data.result === "Success") {
            // alert("Hóa đơn đã được lưu thành công (và gửi tới Google Sheets)!"); // Bỏ alert này để tránh làm phiền
            console.log("Hóa đơn đã được lưu thành công (và gửi tới Google Sheets)!");
        } else {
             console.error("Hóa đơn đã được lưu cục bộ, nhưng có lỗi khi gửi tới Google Sheets. Chi tiết: ", data.message || 'Không rõ lỗi');
        }
    })
    .catch(error => {
        console.error('Lỗi khi gửi dữ liệu đến Google Sheets:', error);
    });

    const generateInvoiceButton = document.getElementById('generateInvoice');
    if (generateInvoiceButton) {
        generateInvoiceButton.addEventListener('click', function() {
            window.location.href = 'invoice.html';
        });
    }
});

// Xử lý sự kiện reset form
document.getElementById('orderForm').addEventListener('reset', function() {
    document.getElementById('priceDetails').innerHTML = '';
    
    const customerSelect = document.getElementById('customerSelect');
    if (customerSelect) {
        customerSelect.value = ""; 
    }
    document.getElementById('customerName').value = '';
    document.getElementById('customerClass').value = '';
});

// ... (mã hiện tại của app.js) ...

// THÊM MỚI: Xử lý cho nút reset icon ở đầu trang
const resetAppButton = document.getElementById('resetAppBtn');
if (resetAppButton) {
    resetAppButton.addEventListener('click', function() {
        const orderForm = document.getElementById('orderForm');
        if (orderForm) {
            orderForm.reset(); // Điều này sẽ kích hoạt trình xử lý sự kiện 'reset' đã có trên form
        }
    });
}

// Trình xử lý sự kiện reset form (đã có từ trước, đảm bảo nó dọn dẹp đúng)
document.getElementById('orderForm').addEventListener('reset', function() {
    document.getElementById('priceDetails').innerHTML = '';
    
    const customerSelect = document.getElementById('customerSelect');
    if (customerSelect) {
        customerSelect.value = ""; 
    }
    // Đảm bảo các trường nhập liệu chính cũng được xóa (form.reset() thường làm điều này, nhưng để chắc chắn)
    document.getElementById('customerName').value = '';
    document.getElementById('customerClass').value = '';
    document.getElementById('fileName').value = '';
    // document.getElementById('pages').value = ''; // type="number" có thể cần xóa giá trị
    // document.getElementById('printType').value = 'portrait';
    // document.getElementById('friendDiscount').checked = false;
    // document.getElementById('discount').value = '0';
});
