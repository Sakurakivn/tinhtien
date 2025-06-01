// Biến toàn cục để lưu trữ dữ liệu khách hàng từ API
// Cấu trúc: { 'Tên Khách Hàng': { _id: 'mongoDbId', name: 'Tên', class: 'Lớp', purchaseCount: 0, orders: [] } }
let customersDataFromAPI = {}; 

// Hàm tải dữ liệu khách hàng từ API
async function loadCustomersFromAPI() {
    try {
        const response = await fetch('/api/customers'); 
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Lỗi HTTP: ${response.status} - ${errorData.message || 'Không thể tải danh sách khách hàng'}`);
        }
        const customersArray = await response.json();
        customersDataFromAPI = {}; // Reset
        customersArray.forEach(customer => {
            customersDataFromAPI[customer.name] = customer; // Dùng tên làm key để ít thay đổi code populate
        });
        populateCustomerDropdown();
    } catch (error) {
        console.error("Không thể tải danh sách khách hàng từ API:", error);
        alert("Lỗi: Không thể tải danh sách khách hàng. Vui lòng thử lại sau.\n" + error.message);
    }
}

// Hàm điền danh sách khách hàng vào dropdown (giữ nguyên logic DOM, chỉ thay đổi nguồn dữ liệu)
function populateCustomerDropdown() {
    const customerSelect = document.getElementById('customerSelect');
    if (!customerSelect) return;

    const currentSelectedValueInDropdown = customerSelect.value; 
    const currentCustomerNameInInput = document.getElementById('customerName').value;

    while (customerSelect.options.length > 1) {
        customerSelect.remove(1);
    }

    const sortedCustomerNames = Object.keys(customersDataFromAPI).sort((a, b) => a.localeCompare(b));

    sortedCustomerNames.forEach(name => {
        const customer = customersDataFromAPI[name];
        const option = document.createElement('option');
        option.value = name; // Value của option vẫn là tên khách hàng
        const displayClass = (customer.class || '').trim() || 'Chưa có lớp';
        option.textContent = `${name} (${displayClass}) - ${customer.purchaseCount || 0} lần mua`;
        customerSelect.appendChild(option);
    });
    
    // Ưu tiên giữ lựa chọn hiện tại trong dropdown nếu nó vẫn hợp lệ
    if (currentSelectedValueInDropdown && customersDataFromAPI[currentSelectedValueInDropdown]) {
        customerSelect.value = currentSelectedValueInDropdown;
    } 
    // Hoặc nếu có tên khách hàng trong ô input và tên đó có trong danh sách API, chọn nó
    else if (currentCustomerNameInInput && customersDataFromAPI[currentCustomerNameInInput]) {
        customerSelect.value = currentCustomerNameInInput;
    } 
    // Mặc định là khách hàng mới
    else {
        customerSelect.value = ""; 
    }
}

// Hàm xử lý khi chọn một khách hàng từ dropdown
function handleCustomerSelection() {
    const customerSelect = document.getElementById('customerSelect');
    const customerNameInput = document.getElementById('customerName');
    const customerClassInput = document.getElementById('customerClass');

    if (!customerSelect || !customerNameInput || !customerClassInput) return;

    const selectedName = customerSelect.value;
    if (selectedName && customersDataFromAPI[selectedName]) {
        customerNameInput.value = customersDataFromAPI[selectedName].name;
        customerClassInput.value = customersDataFromAPI[selectedName].class || '';
    } else {
        if (selectedName === "") { 
            customerNameInput.value = ''; 
            customerClassInput.value = '';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadCustomersFromAPI(); // Tải khách hàng từ API khi trang sẵn sàng

    const customerSelect = document.getElementById('customerSelect');
    if (customerSelect) {
        customerSelect.addEventListener('change', handleCustomerSelection);
    }

    const resetAppButton = document.getElementById('resetAppBtn');
    if (resetAppButton) {
        resetAppButton.addEventListener('click', function() {
            const orderForm = document.getElementById('orderForm');
            if (orderForm) {
                orderForm.reset(); 
            }
        });
    }
});

document.getElementById('orderForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    // Hiển thị loading/spinner ở đây nếu muốn

    const customerNameInput = document.getElementById('customerName');
    const customerClassInput = document.getElementById('customerClass');
    
    let customerName = customerNameInput.value.trim();
    let customerClass = customerClassInput.value.trim();
    
    // Các thông tin đơn hàng khác
    const fileName = document.getElementById('fileName').value;
    const pages = parseInt(document.getElementById('pages').value);
    const printType = document.getElementById('printType').value;
    const friendDiscountCheckbox = document.getElementById('friendDiscount').checked;
    const discountPercentage = parseInt(document.getElementById('discount').value) || 0;

    if (isNaN(pages) || pages <= 0 || !customerName) {
        alert("Vui lòng nhập số trang hợp lệ và tên khách hàng!");
        return;
    }

    let customerInSystem = customersDataFromAPI[customerName];
    let customerId;

    try {
        if (!customerInSystem) {
            // Thử tìm khách hàng trên server phòng trường hợp danh sách local chưa cập nhật
            const checkResponse = await fetch(`/api/customers?name=${encodeURIComponent(customerName)}`);
            if (checkResponse.ok) {
                customerInSystem = await checkResponse.json();
                customersDataFromAPI[customerName] = customerInSystem; // Cập nhật cache cục bộ
            } else if (checkResponse.status === 404) {
                // Khách hàng thực sự mới, tạo mới
                console.log(`Khách hàng "${customerName}" chưa có, đang tạo mới...`);
                const createResponse = await fetch('/api/customers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: customerName, class: customerClass })
                });
                if (!createResponse.ok) {
                    const errorData = await createResponse.json();
                    throw new Error(`Không thể tạo khách hàng mới: ${errorData.message || createResponse.statusText}`);
                }
                customerInSystem = await createResponse.json();
                customersDataFromAPI[customerName] = customerInSystem; // Thêm vào cache cục bộ
                console.log("Đã tạo khách hàng mới:", customerInSystem);
            } else {
                const errorData = await checkResponse.json();
                throw new Error(`Lỗi khi kiểm tra khách hàng: ${errorData.message || checkResponse.statusText}`);
            }
        } else {
            // Khách hàng đã có trong cache cục bộ, kiểm tra xem lớp có thay đổi không
            if (customerInSystem.class !== customerClass) {
                console.log(`Cập nhật lớp cho khách hàng "${customerName}"`);
                const updateResponse = await fetch(`/api/customers?id=${customerInSystem._id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ class: customerClass }) // Chỉ gửi những gì thay đổi
                });
                if (!updateResponse.ok) {
                    const errorData = await updateResponse.json();
                    throw new Error(`Không thể cập nhật lớp cho khách hàng: ${errorData.message || updateResponse.statusText}`);
                }
                customerInSystem = await updateResponse.json();
                customersDataFromAPI[customerName] = customerInSystem; // Cập nhật cache
            }
        }
        
        customerId = customerInSystem._id;

        // TODO: Bước tiếp theo là gọi API để thêm đơn hàng này vào khách hàng customerId
        // Ví dụ: POST /api/customers/${customerId}/orders hoặc /api/orders?customerId=${customerId}
        // Đồng thời, API backend sẽ cần cập nhật purchaseCount cho khách hàng này.
        // Hiện tại, chúng ta sẽ giả định purchaseCount được cập nhật phía backend khi thêm order.
        // Hoặc, chúng ta có thể fetch lại thông tin khách hàng sau khi thêm order để có purchaseCount mới nhất.
        console.log(`Đơn hàng cho khách hàng ID: ${customerId}, Tên: ${customerName}`);
        // Giả sử sau khi thêm đơn hàng, purchaseCount của customerInSystem đã được cập nhật (từ response hoặc fetch lại)
        // customersDataFromAPI[customerName].purchaseCount +=1; // Tạm thời tăng ở client, lý tưởng là lấy từ server sau khi thêm order

        // --- Logic tính toán giá (giữ nguyên) ---
        let pricePerPage;
        if (pages <= 250) { pricePerPage = friendDiscountCheckbox ? 483 : 543; }
        else if (pages <= 500) { pricePerPage = friendDiscountCheckbox ? 463 : 520; }
        else if (pages <= 750) { pricePerPage = friendDiscountCheckbox ? 436 : 490; }
        else { pricePerPage = friendDiscountCheckbox ? 400 : 450; }
        let totalPages = printType === 'portrait' ? pages / 2 : pages / 4;
        let totalPriceAfterTier = totalPages * pricePerPage;
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
        if (roundedAdditionalFriendDiscount > 0) { priceDetailsHTML += `<p><em>- ${formattedAdditionalFriendDiscount} VND : Giảm thêm cho Khách hàng thân thiết (10%)</em></p>`; }
        if (roundedProgramDiscount > 0) { priceDetailsHTML += `<p><em>- ${formattedProgramDiscount} VND : Chương trình giảm ${discountPercentage}%</em></p>`; }
        priceDetailsHTML += `<p><strong class="totalAmount">Tổng số tiền: </strong>${formattedFinalTotalPrice} VND</p>`;
        const orderTime = new Date();
        let estimatedDeliveryDateStart = new Date(orderTime); let estimatedDeliveryDateEnd = new Date(orderTime);
        if (orderTime.getHours() >= 16) { estimatedDeliveryDateStart.setDate(estimatedDeliveryDateStart.getDate() + 1); estimatedDeliveryDateEnd.setDate(estimatedDeliveryDateEnd.getDate() + 2); }
        else { estimatedDeliveryDateStart.setDate(estimatedDeliveryDateStart.getDate() + 1); estimatedDeliveryDateEnd.setDate(estimatedDeliveryDateEnd.getDate() + 1); }
        if (estimatedDeliveryDateStart.getDay() === 0) { estimatedDeliveryDateStart.setDate(estimatedDeliveryDateStart.getDate() + 2); estimatedDeliveryDateEnd.setDate(estimatedDeliveryDateEnd.getDate() + 2); }
        const dateOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };
        const formattedStartDate = estimatedDeliveryDateStart.toLocaleDateString('vi-VN', dateOptions);
        const formattedEndDate = estimatedDeliveryDateEnd.toLocaleDateString('vi-VN', dateOptions);
        priceDetailsHTML += `<p><strong>Dự kiến ngày nhận hàng:</strong> ${formattedStartDate} - ${formattedEndDate}</p>`;
        
        // Lấy purchaseCount từ customerInSystem (đã được cập nhật từ API hoặc tạo mới)
        priceDetailsHTML += `<p><strong>Số lần mua của khách ${customerName}:</strong> ${customerInSystem.purchaseCount || 0}</p>`; 
        // TODO: Sau khi API thêm đơn hàng hoạt động và cập nhật purchaseCount, dòng trên sẽ hiển thị đúng.
        // Hiện tại, nếu tạo KH mới, API trả về purchaseCount = 0. Cần API để tăng nó khi thêm đơn hàng.
        // Hoặc, gọi lại API GET customer để lấy thông tin mới nhất sau khi thêm order.
        
        priceDetailsHTML += `<button id="generateInvoice">Xuất hóa đơn</button>`;
        document.getElementById('priceDetails').innerHTML = priceDetailsHTML;

        const invoiceData = {
            customerName, customerClass, fileName, pages, printType,
            totalPriceBeforeDiscount: roundedTotalPriceBeforePercentageDiscounts,
            friendDiscountApplied: friendDiscountCheckbox,
            friendDiscountAmount: roundedAdditionalFriendDiscount, 
            programDiscountPercentage: discountPercentage,
            programDiscountAmount: roundedProgramDiscount, 
            finalTotalPrice: roundedFinalTotalPrice, 
            estimatedStartDate: formattedStartDate, estimatedEndDate: formattedEndDate,
            purchaseCount: customerInSystem.purchaseCount || 0, // Tương tự như trên
            createdAt: new Date().toLocaleString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
        };
        localStorage.setItem('invoiceData', JSON.stringify(invoiceData)); // Vẫn dùng localStorage cho invoice.html tạm thời

        // Gửi dữ liệu đến Google Sheets (giữ nguyên)
        fetch('https://script.google.com/macros/s/AKfycbxiJXoMIf4fffa9YOQYTVs-lVNTiQXLCww4eW744isDTsYK-wK2UFVCAUBQ61wcty4hUQ/exec', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(invoiceData) 
        })
        .then(response => response.json())
        .then(data => {
            if (data.result === "Success") { console.log("Gửi Google Sheets thành công!"); }
            else { console.error("Lỗi gửi Google Sheets:", data.message); }
        })
        .catch(error => console.error('Lỗi fetch Google Sheets:', error));

        const generateInvoiceButton = document.getElementById('generateInvoice');
        if (generateInvoiceButton) {
            generateInvoiceButton.addEventListener('click', function() {
                window.location.href = 'invoice.html';
            });
        }
        // Tải lại danh sách khách hàng để cập nhật dropdown với thông tin mới nhất (nếu có khách mới hoặc purchaseCount thay đổi từ server)
        await loadCustomersFromAPI(); 
        // Đảm bảo khách hàng hiện tại được chọn
        const customerSelectElement = document.getElementById('customerSelect');
         if(customerSelectElement && customerName) {
            customerSelectElement.value = customerName;
        }


    } catch (error) {
        console.error("Lỗi trong quá trình xử lý đơn hàng:", error);
        alert("Đã xảy ra lỗi: " + error.message + "\nVui lòng thử lại.");
    } finally {
        // Ẩn loading/spinner ở đây nếu có
    }
});

document.getElementById('orderForm').addEventListener('reset', function() {
    document.getElementById('priceDetails').innerHTML = '';
    const customerSelect = document.getElementById('customerSelect');
    if (customerSelect) {
        customerSelect.value = ""; 
    }
    document.getElementById('customerName').value = '';
    document.getElementById('customerClass').value = '';
});
