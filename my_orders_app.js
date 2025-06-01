document.addEventListener('DOMContentLoaded', () => {
    const CUSTOMERS_STORAGE_KEY_UNUSED = 'photoAppCustomers'; // Không dùng nữa
    const lookupForm = document.getElementById('customerLookupForm');
    const customerNameInput = document.getElementById('customerNameToLookup');
    const lookupResultDiv = document.getElementById('lookupResult');

    if (lookupForm) {
        lookupForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const customerName = customerNameInput.value.trim();
            if (!customerName) {
                displayMessage("Vui lòng nhập tên của bạn để bắt đầu tra cứu.", "info");
                return;
            }
            // Hiển thị thông báo đang tải
            displayMessage("Đang tìm kiếm đơn hàng của bạn, vui lòng chờ...", "loading");
            await lookupOrdersAPI(customerName);
        });
    }

    // Hàm phụ trợ để parse chuỗi ngày tháng từ server (nếu cần) hoặc đảm bảo là Date object
    function ensureDateObject(dateValue) {
        if (!dateValue) return null;
        if (dateValue instanceof Date) return dateValue;
        // Thử parse các định dạng phổ biến, bao gồm ISO string từ MongoDB
        const parsedDate = new Date(dateValue); 
        if (isNaN(parsedDate.getTime())) {
            // Nếu parse trực tiếp không được, thử parse định dạng "dd/mm/yyyy, HH:MM:SS" 
            // (ít có khả năng server trả về dạng này cho createdAt, thường là ISO hoặc timestamp)
            try {
                const parts = String(dateValue).split(', '); 
                const dateParts = parts[0].split('/'); 
                const timeParts = parts[1] ? parts[1].split(':') : ['00', '00', '00'];
                return new Date(
                    parseInt(dateParts[2]), 
                    parseInt(dateParts[1]) - 1, // Tháng trong JavaScript là 0-indexed
                    parseInt(dateParts[0]),
                    parseInt(timeParts[0] || '0'), 
                    parseInt(timeParts[1] || '0'), 
                    parseInt(timeParts[2] || '0')
                );
            } catch (e) {
                console.warn("Không thể parse ngày:", dateValue, e);
                return null; // Trả về null nếu không parse được
            }
        }
        return parsedDate;
    }


    async function lookupOrdersAPI(name) {
        try {
            // Gọi API backend để tìm khách hàng theo tên
            // API /api/customers?name=TEN_KHACH_HANG đã được tạo ở bước trước
            console.log(`Đang tra cứu khách hàng: ${name}`);
            const response = await fetch(`/api/customers?name=${encodeURIComponent(name)}`);

            if (!response.ok) {
                if (response.status === 404) {
                    displayMessage(`Không tìm thấy thông tin cho khách hàng "${name}". Vui lòng kiểm tra lại tên hoặc liên hệ người quản lý.`, "error");
                } else {
                    // Cố gắng lấy chi tiết lỗi từ server nếu có
                    const errorData = await response.json().catch(() => ({ message: response.statusText })); // Gói trong catch để tránh lỗi nếu body không phải JSON
                    throw new Error(`Lỗi ${response.status}: ${errorData.message || 'Không thể tra cứu đơn hàng'}`);
                }
                return;
            }

            const customerData = await response.json();
            console.log("Đã nhận dữ liệu khách hàng:", customerData);
            displayOrders(customerData);

        } catch (error) {
            console.error("Lỗi khi tra cứu đơn hàng từ API:", error);
            displayMessage(`Đã xảy ra lỗi khi tra cứu: ${error.message}. Vui lòng thử lại.`, "error");
        }
    }

    function displayOrders(customer) {
        lookupResultDiv.innerHTML = ''; // Xóa kết quả cũ

        const greeting = document.createElement('p');
        greeting.classList.add('customer-greeting');
        greeting.innerHTML = `Chào bạn <strong>${customer.name}</strong> (${customer.class || 'Không có thông tin lớp'}), đây là lịch sử đơn hàng của bạn:`;
        lookupResultDiv.appendChild(greeting);

        if (!customer.orders || !Array.isArray(customer.orders) || customer.orders.length === 0) {
            const noOrdersMsg = document.createElement('p');
            noOrdersMsg.classList.add('no-orders-message');
            noOrdersMsg.textContent = "Bạn chưa có đơn hàng nào được ghi nhận.";
            lookupResultDiv.appendChild(noOrdersMsg);
            return;
        }

        const table = document.createElement('table');
        table.classList.add('customer-order-history-table');
        const thead = table.createTHead();
        const headerRow = thead.insertRow();
        const headers = ["Ngày đặt", "Tên file", "Số trang", "Cách In", "Giảm Giá (CT)", "KHTT?", "Số tiền gốc", "Tổng tiền"];
        headers.forEach(text => {
            const th = document.createElement('th');
            th.textContent = text;
            headerRow.appendChild(th);
        });

        const tbody = table.createTBody();
        // Sắp xếp đơn hàng theo ngày, mới nhất lên đầu
        // Giả sử `order.createdAt` từ server là một chuỗi ngày tháng chuẩn (ví dụ ISO 8601) hoặc đã được parse thành Date object ở backend
        const sortedOrders = [...customer.orders].sort((a, b) => {
            const dateA = ensureDateObject(a.createdAt); // Đảm bảo là Date object
            const dateB = ensureDateObject(b.createdAt);
            return (dateB || 0) - (dateA || 0); // Xử lý trường hợp date có thể null (mặc dù không nên)
        });
        
        sortedOrders.forEach(order => {
            const row = tbody.insertRow();
            let displayDate = 'N/A';
            const orderDate = ensureDateObject(order.createdAt); // Đảm bảo là Date object
            if (orderDate && !isNaN(orderDate.getTime())) { // Kiểm tra xem Date có hợp lệ không
                displayDate = `${String(orderDate.getDate()).padStart(2, '0')}/${String(orderDate.getMonth() + 1).padStart(2, '0')}/${orderDate.getFullYear()}`;
            } else if (typeof order.createdAt === 'string' && order.createdAt.includes('/')) { 
                // Nếu vẫn là chuỗi dd/mm/yyyy... thì cố gắng hiển thị phần ngày
                displayDate = order.createdAt.split(',')[0]; 
            }


            row.insertCell().textContent = displayDate;
            row.insertCell().textContent = order.fileName || '-';
            row.insertCell().textContent = order.pages || '0';
            row.insertCell().textContent = order.printType === 'portrait' ? 'Dọc' : (order.printType === 'landscape' ? 'Ngang' : '-');
            row.insertCell().textContent = `${order.programDiscountPercentage || 0}%`;
            row.insertCell().textContent = order.friendDiscountApplied ? 'Có' : 'Không';
            // Đảm bảo các giá trị số không phải là null/undefined trước khi gọi toLocaleString
            row.insertCell().textContent = (order.totalPriceBeforeDiscount != null) ? order.totalPriceBeforeDiscount.toLocaleString('vi-VN') + ' VND' : '0 VND';
            row.insertCell().textContent = (order.finalTotalPrice != null) ? order.finalTotalPrice.toLocaleString('vi-VN') + ' VND' : '0 VND';
        });

        lookupResultDiv.appendChild(table);
    }

    function displayMessage(message, type = "info") { 
        let messageClass = 'lookup-message'; // Class chung cho thông báo
        if (type === "error") {
            messageClass += ' error-message'; 
        } else if (type === "loading") {
            messageClass += ' loading-message'; 
        }
        lookupResultDiv.innerHTML = `<p class="${messageClass}">${message}</p>`;
    }
});
