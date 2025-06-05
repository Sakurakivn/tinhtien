// Biến toàn cục để lưu trữ dữ liệu khách hàng từ API
let customersDataFromAPI = {}; 

async function loadCustomersFromAPI() {
    try {
        console.log("Đang tải danh sách khách hàng từ API...");
        const response = await fetch('/api/customers'); 
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(`Lỗi HTTP: ${response.status} - ${errorData.message || 'Không thể tải danh sách khách hàng'}`);
        }
        const customersArray = await response.json();
        customersDataFromAPI = {}; 
        customersArray.forEach(customer => {
            customersDataFromAPI[customer.name] = customer; 
        });
        console.log("Đã tải xong khách hàng:", Object.keys(customersDataFromAPI).length, "khách hàng");
        populateCustomerDropdown();
    } catch (error) {
        console.error("Không thể tải danh sách khách hàng từ API:", error);
        alert("Lỗi: Không thể tải danh sách khách hàng. Vui lòng thử lại sau.\nChi tiết: " + error.message);
    }
}

function populateCustomerDropdown() {
    const customerSelect = document.getElementById('customerSelect');
    if (!customerSelect) return;
    console.log("Đang cập nhật dropdown khách hàng...");

    const currentSelectedValueInDropdown = customerSelect.value; 
    const currentCustomerNameInInput = document.getElementById('customerName').value;

    while (customerSelect.options.length > 1) {
        customerSelect.remove(1);
    }

    const sortedCustomerNames = Object.keys(customersDataFromAPI).sort((a, b) => a.localeCompare(b));

    sortedCustomerNames.forEach(name => {
        const customer = customersDataFromAPI[name];
        const option = document.createElement('option');
        option.value = name; 
        const displayClass = (customer.class || '').trim() || 'Chưa có lớp';
        option.textContent = `${name} (${displayClass}) - ${customer.purchaseCount || 0} lần mua`;
        customerSelect.appendChild(option);
    });
    
    if (currentSelectedValueInDropdown && customersDataFromAPI[currentSelectedValueInDropdown]) {
        customerSelect.value = currentSelectedValueInDropdown;
    } 
    else if (currentCustomerNameInInput && customersDataFromAPI[currentCustomerNameInInput]) {
        customerSelect.value = currentCustomerNameInInput;
    } 
    else {
        customerSelect.value = ""; 
    }
    console.log("Dropdown khách hàng đã được cập nhật.");
}

function handleCustomerSelection() {
    const customerSelect = document.getElementById('customerSelect');
    const customerNameInput = document.getElementById('customerName');
    const customerClassInput = document.getElementById('customerClass');

    if (!customerSelect || !customerNameInput || !customerClassInput) return;

    const selectedName = customerSelect.value;
    console.log("Khách hàng được chọn từ dropdown:", selectedName);
    if (selectedName && customersDataFromAPI[selectedName]) {
        customerNameInput.value = customersDataFromAPI[selectedName].name;
        customerClassInput.value = customersDataFromAPI[selectedName].class || '';
    } else {
        if (selectedName === "") { 
            // customerNameInput.value = ''; // Để người dùng tự nhập nếu muốn tên khác
            // customerClassInput.value = '';
            console.log("Chọn tạo khách hàng mới hoặc nhập tay.");
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadCustomersFromAPI(); 

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
    showLoadingSpinner("Đang xử lý đơn hàng..."); // HIỂN THỊ SPINNER

    const customerNameInput = document.getElementById('customerName');
    const customerClassInput = document.getElementById('customerClass');
    
    let customerName = customerNameInput.value.trim();
    let customerClass = customerClassInput.value.trim();
    
    const fileName = document.getElementById('fileName').value;
    const pages = parseInt(document.getElementById('pages').value);
    const printType = document.getElementById('printType').value;
    const friendDiscountCheckbox = document.getElementById('friendDiscount').checked;
    const discountPercentage = parseInt(document.getElementById('discount').value) || 0;

    if (isNaN(pages) || pages <= 0 || !customerName) {
        hideLoadingSpinner();
        showNotification("Vui lòng nhập số trang hợp lệ và tên khách hàng!", "error");
        return;
    }

    let customerInSystem;
    let customerId;

    try {
        // Bước 1: Xác định hoặc tạo/cập nhật khách hàng
        console.log(`Đang tìm/tạo khách hàng: "${customerName}"`);
        let existingCustomerData = customersDataFromAPI[customerName];

        if (existingCustomerData) { // Nếu khách hàng có trong cache local (đã load từ API)
             // Kiểm tra xem lớp có thay đổi không
            if (existingCustomerData.class !== customerClass) {
                console.log(`Khách hàng "${customerName}" đã tồn tại, cập nhật lớp.`);
                const updateResponse = await fetch(`/api/customers?id=${existingCustomerData._id}`, { // Dùng query param cho ID
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: customerName, class: customerClass }) // Gửi cả tên để API có thể kiểm tra trùng lặp nếu tên thay đổi
                });
                if (!updateResponse.ok) {
                    const errorData = await updateResponse.json().catch(() => ({ message: updateResponse.statusText }));
                    throw new Error(`Không thể cập nhật thông tin khách hàng: ${errorData.message}`);
                }
                customerInSystem = await updateResponse.json();
                customersDataFromAPI[customerName] = customerInSystem; // Cập nhật cache
            } else {
                customerInSystem = existingCustomerData;
            }
        } else { // Khách hàng không có trong cache, thử POST để tạo (API sẽ kiểm tra tồn tại)
            console.log(`Khách hàng "${customerName}" không có trong cache, gửi yêu cầu POST tới API.`);
            const createOrGetResponse = await fetch('/api/customers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: customerName, class: customerClass })
            });
            if (!createOrGetResponse.ok && createOrGetResponse.status !== 409) { // 409 là lỗi trùng tên, API của tôi trả về 200 và customer nếu trùng
                const errorData = await createOrGetResponse.json().catch(() => ({ message: createOrGetResponse.statusText }));
                throw new Error(`Không thể tạo hoặc lấy thông tin khách hàng: ${errorData.message}`);
            }
            const responseData = await createOrGetResponse.json();
            customerInSystem = responseData.customer || responseData; // API POST trả về customer nếu trùng, hoặc khách hàng mới nếu tạo
            
            if (!customersDataFromAPI[customerInSystem.name]) { // Thêm vào cache nếu là mới hoặc tên khác
                 customersDataFromAPI[customerInSystem.name] = customerInSystem;
            }
        }
        
        customerId = customerInSystem._id;
        console.log(`Đã xác định khách hàng: ID ${customerId}, Tên: ${customerInSystem.name}, Lớp: ${customerInSystem.class}`);

        // Bước 2: Tạo đối tượng invoiceData
        // (Phần tính toán giá giữ nguyên)
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
        
        const dateOptionsForDisplay = { year: 'numeric', month: '2-digit', day: '2-digit' };
        const orderTime = new Date();
        let estimatedDeliveryDateStart = new Date(orderTime); let estimatedDeliveryDateEnd = new Date(orderTime);
        if (orderTime.getHours() >= 16) { estimatedDeliveryDateStart.setDate(estimatedDeliveryDateStart.getDate() + 1); estimatedDeliveryDateEnd.setDate(estimatedDeliveryDateEnd.getDate() + 2); }
        else { estimatedDeliveryDateStart.setDate(estimatedDeliveryDateStart.getDate() + 1); estimatedDeliveryDateEnd.setDate(estimatedDeliveryDateEnd.getDate() + 1); }
        if (estimatedDeliveryDateStart.getDay() === 0) { estimatedDeliveryDateStart.setDate(estimatedDeliveryDateStart.getDate() + 2); estimatedDeliveryDateEnd.setDate(estimatedDeliveryDateEnd.getDate() + 2); }
        const formattedStartDate = estimatedDeliveryDateStart.toLocaleDateString('vi-VN', dateOptionsForDisplay);
        const formattedEndDate = estimatedDeliveryDateEnd.toLocaleDateString('vi-VN', dateOptionsForDisplay);

        const invoiceDataForStorage = { // Dữ liệu này sẽ được gửi lên server để lưu vào đơn hàng
            customerName: customerInSystem.name, // Dùng tên đã chuẩn hóa từ server nếu có
            customerClass: customerInSystem.class, // Dùng lớp đã chuẩn hóa từ server nếu có
            fileName, pages, printType,
            totalPriceBeforeDiscount: roundedTotalPriceBeforePercentageDiscounts,
            friendDiscountApplied: friendDiscountCheckbox,
            friendDiscountAmount: roundedAdditionalFriendDiscount, 
            programDiscountPercentage: discountPercentage,
            programDiscountAmount: roundedProgramDiscount, 
            finalTotalPrice: roundedFinalTotalPrice, 
            estimatedStartDate: formattedStartDate, 
            estimatedEndDate: formattedEndDate,
            // purchaseCount sẽ được server tự động tăng, không cần gửi lên
            createdAt: new Date().toLocaleString('vi-VN', { // Client tạo chuỗi ngày giờ local
                year: 'numeric', month: '2-digit', day: '2-digit', 
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false 
            })
        };
        
        // Bước 3: Gọi API để thêm đơn hàng này vào khách hàng
        console.log(`Đang gửi đơn hàng cho khách hàng ID: ${customerId}`);
        const addOrderResponse = await fetch(`/api/customers/${customerId}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(invoiceDataForStorage)
        });

        if (!addOrderResponse.ok) {
            const errorData = await addOrderResponse.json().catch(() => ({ message: addOrderResponse.statusText }));
            throw new Error(`Không thể thêm đơn hàng: ${errorData.message}`);
        }
        
        const addOrderResult = await addOrderResponse.json();
        const updatedCustomerFromServer = addOrderResult.customer; 
        
        customersDataFromAPI[updatedCustomerFromServer.name] = updatedCustomerFromServer;
        console.log("Đã thêm đơn hàng và cập nhật khách hàng:", updatedCustomerFromServer);
        hideLoadingSpinner(); // ẨN SPINNER
        showNotification('Đơn hàng đã được xử lý thành công!', 'success'); 


        // Lấy đơn hàng mới nhất từ phản hồi của server (đơn hàng này sẽ có createdAt từ server)
        let actualCreatedAtFromServer = new Date().toISOString(); // Fallback
        let latestOrderFromServer = null; // << KHAI BÁO BIẾN Ở ĐÂY để nó có phạm vi rộng hơn

        if (updatedCustomerFromServer.orders && updatedCustomerFromServer.orders.length > 0) {
            // Giả sử đơn hàng mới nhất là đơn hàng cuối cùng trong mảng và có createdAt
            latestOrderFromServer = updatedCustomerFromServer.orders[updatedCustomerFromServer.orders.length - 1]; // GÁN GIÁ TRỊ
            if (latestOrderFromServer && latestOrderFromServer.createdAt) {
                actualCreatedAtFromServer = latestOrderFromServer.createdAt; // Đây là createdAt từ server (có thể là chuỗi ISO)
            }
        }

        // Dữ liệu cho trang invoice.html
        // invoiceDataForStorage đã chứa các thông tin client nhập ban đầu
        // Giờ chúng ta cập nhật nó với createdAt chính xác từ server
        const finalInvoiceDataForLocalStorage = {
            ...invoiceDataForStorage, // Dữ liệu client nhập ban đầu (bao gồm cả client's createdAt nếu bạn vẫn tạo)
            serverCreatedAt: actualCreatedAtFromServer, // << LƯU createdAt CHUẨN TỪ SERVER
            // Truy cập latestOrderFromServer ở đây an toàn vì nó đã được khai báo ở trên
            orderId: latestOrderFromServer ? (latestOrderFromServer.orderId ? latestOrderFromServer.orderId.toString() : null) : null, 
            purchaseCount: updatedCustomerFromServer.purchaseCount 
        };
        localStorage.setItem('invoiceData', JSON.stringify(finalInvoiceDataForLocalStorage));

        
        // Bước 4: Hiển thị kết quả
        let priceDetailsHTML = `<p><strong>Số tiền tạm tính (sau ưu đãi giá/trang):</strong> ${roundedTotalPriceBeforePercentageDiscounts.toLocaleString('vi-VN')} VND</p>`;
        if (roundedAdditionalFriendDiscount > 0) { priceDetailsHTML += `<p><em>- ${roundedAdditionalFriendDiscount.toLocaleString('vi-VN')} VND : Giảm thêm cho Khách hàng thân thiết (10%)</em></p>`; }
        if (roundedProgramDiscount > 0) { priceDetailsHTML += `<p><em>- ${roundedProgramDiscount.toLocaleString('vi-VN')} VND : Chương trình giảm ${discountPercentage}%</em></p>`; }
        priceDetailsHTML += `<p><strong class="totalAmount">Tổng số tiền: </strong>${roundedFinalTotalPrice.toLocaleString('vi-VN')} VND</p>`;
        priceDetailsHTML += `<p><strong>Dự kiến ngày nhận hàng:</strong> ${formattedStartDate} - ${formattedEndDate}</p>`;
        priceDetailsHTML += `<p><strong>Số lần mua của khách ${updatedCustomerFromServer.name}:</strong> ${updatedCustomerFromServer.purchaseCount}</p>`;
        priceDetailsHTML += `<button id="generateInvoice">Xuất hóa đơn</button>`;
        document.getElementById('priceDetails').innerHTML = priceDetailsHTML;
        
        // Dữ liệu cho trang invoice.html (vẫn dùng localStorage cho trang này)
        localStorage.setItem('invoiceData', JSON.stringify({
            ...invoiceDataForStorage, // Dùng dữ liệu đã chuẩn bị để gửi
            purchaseCount: updatedCustomerFromServer.purchaseCount // Lấy purchaseCount mới nhất
        }));

        // Gửi dữ liệu đến Google Sheets (giữ nguyên)
        fetch('https://script.google.com/macros/s/AKfycbxiJXoMIf4fffa9YOQYTVs-lVNTiQXLCww4eW744isDTsYK-wK2UFVCAUBQ61wcty4hUQ/exec', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...invoiceDataForStorage, purchaseCount: updatedCustomerFromServer.purchaseCount }) 
        })
        .then(res => res.json()).then(data => console.log("Gửi Google Sheets:", data.result))
        .catch(error => console.error('Lỗi fetch Google Sheets:', error));

        const generateInvoiceButton = document.getElementById('generateInvoice');
        if (generateInvoiceButton) {
            generateInvoiceButton.addEventListener('click', function() {
                window.location.href = 'invoice.html';
            });
        }
        
        // Cập nhật lại dropdown để hiển thị số lần mua mới và khách hàng mới (nếu có)
        // populateCustomerDropdown(); // loadCustomersFromAPI sẽ gọi hàm này
        await loadCustomersFromAPI(); // Tải lại toàn bộ để đảm bảo nhất quán, hoặc chỉ cập nhật customer vừa rồi
        // Đảm bảo khách hàng hiện tại được chọn
        const customerSelectElement = document.getElementById('customerSelect');
         if(customerSelectElement && updatedCustomerFromServer.name) {
            customerSelectElement.value = updatedCustomerFromServer.name;
        }


    } catch (error) {
        console.error("Lỗi trong quá trình xử lý đơn hàng:", error);
        alert("Đã xảy ra lỗi: " + error.message + "\nVui lòng kiểm tra Console (F12) để biết thêm chi tiết và thử lại.");
        document.getElementById('priceDetails').innerHTML = `<p style="color:red;">Lỗi: ${error.message}</p>`;
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
    // Các trường khác sẽ được reset tự động bởi form.reset()
});
