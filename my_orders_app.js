document.addEventListener('DOMContentLoaded', () => {
    const lookupFormContainer = document.getElementById('lookupFormContainer');
    const lookupForm = document.getElementById('customerLookupFormWrapped');
    const customerNameInput = document.getElementById('customerNameToLookupWrapped');
    const lookupErrorMessage = document.getElementById('lookupErrorMessageWrapped');
    
    const wrappedContainer = document.getElementById('wrappedContainer');
    const slides = document.querySelectorAll('.wrapped-slide');
    const prevSlideBtn = document.getElementById('prevSlideBtn');
    const nextSlideBtn = document.getElementById('nextSlideBtn');
    const closeWrappedBtn = document.getElementById('closeWrappedBtn');

    let currentSlideIndex = 0;
    let customerDataGlobal = null; // Lưu trữ dữ liệu khách hàng sau khi fetch

    // --- Các hàm xử lý ngày tháng (giữ lại từ trước) ---
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
                return new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]), parseInt(timeParts[0] || '0'), parseInt(timeParts[1] || '0'), parseInt(timeParts[2] || '0'));
            } catch (e) { /* ignore */ }
        }
        return null;
    }

    // --- Logic cho Wrapped ---
    function showSlide(index) {
        slides.forEach((slide, i) => {
            slide.classList.remove('active-slide');
            if (i === index) {
                slide.classList.add('active-slide');
            }
        });
        prevSlideBtn.style.display = index === 0 ? 'none' : 'inline-block';
        nextSlideBtn.style.display = index === slides.length - 1 ? 'none' : 'inline-block';
        closeWrappedBtn.style.display = index === slides.length - 1 ? 'inline-block' : 'none';
    }

    function populateWrappedData(customer) {
        if (!customer) return;

        // Slide Chào mừng
        document.getElementById('welcomeName').textContent = `Chào mừng ${customer.name} quay trở lại!`;

        // Slide Tổng quan
        const totalOrders = customer.orders ? customer.orders.length : 0;
        const totalSpent = customer.orders ? customer.orders.reduce((sum, order) => sum + (order.finalTotalPrice || 0), 0) : 0;
        document.getElementById('totalOrders').textContent = totalOrders;
        document.getElementById('totalSpent').textContent = `${totalSpent.toLocaleString('vi-VN')} VND`;

        // Slide "Thói quen"
        let favPrintType = "Không xác định";
        let totalPagesPrinted = 0;
        if (totalOrders > 0) {
            const printTypes = customer.orders.map(o => o.printType);
            const typeCounts = printTypes.reduce((acc, type) => {
                acc[type] = (acc[type] || 0) + 1;
                return acc;
            }, {});
            if (Object.keys(typeCounts).length > 0) {
                favPrintType = Object.keys(typeCounts).reduce((a, b) => typeCounts[a] > typeCounts[b] ? a : b);
                favPrintType = favPrintType === 'portrait' ? 'In Dọc' : (favPrintType === 'landscape' ? 'In Ngang' : favPrintType);
            }
            totalPagesPrinted = customer.orders.reduce((sum, order) => sum + (order.pages || 0), 0);
        }
        document.getElementById('favPrintType').textContent = favPrintType;
        document.getElementById('totalPagesPrinted').textContent = totalPagesPrinted.toLocaleString('vi-VN');
        
        // Slide Lời nhận xét
        const remarkTitle = document.getElementById('remarkTitle');
        const remarkText = document.getElementById('remarkText');
        if (totalOrders === 0) {
            remarkTitle.textContent = "Một Khởi Đầu Mới!";
            remarkText.textContent = "Chúng tôi rất vui khi được đồng hành cùng bạn trong những đơn hàng sắp tới!";
        } else if (totalOrders <= 5) {
            remarkTitle.textContent = "Người Bạn Thân Thiết!";
            remarkText.textContent = `Với ${totalOrders} đơn hàng, bạn đã là một phần quan trọng của chúng tôi. Cảm ơn sự tin tưởng của bạn!`;
        } else if (totalOrders <= 15) {
            remarkTitle.textContent = "Chuyên Gia In Ấn!";
            remarkText.textContent = `Bạn thực sự biết mình cần gì! ${totalOrders} đơn hàng là minh chứng cho sự hiệu quả và chăm chỉ của bạn.`;
        } else {
            remarkTitle.textContent = "Huyền Thoại In Ấn!";
            remarkText.textContent = `Wow, ${customer.name}! Với ${totalOrders} đơn hàng, bạn là một nguồn cảm hứng! Chúng tôi vô cùng biết ơn sự ủng hộ của bạn.`;
        }
         if (totalSpent > 200000 && totalOrders > 5) { // Ví dụ: mốc chi tiêu cao
            remarkText.textContent += " Bạn quả là một khách hàng VIP!";
        }


        // Slide Cảm ơn
        document.getElementById('thankYouName').textContent = `Cảm ơn bạn, ${customer.name}, đã luôn tin tưởng và ủng hộ!`;
    }
    
    function launchFireworks() {
        const numFireworks = 15; // Số lượng pháo hoa
        for (let i = 0; i < numFireworks; i++) {
            const firework = document.createElement('div');
            firework.classList.add('firework');
            firework.style.left = Math.random() * 100 + 'vw';
            // Thời gian phóng ngẫu nhiên để không đồng loạt
            firework.style.animationDelay = Math.random() * 1.5 + 's'; 
            // Màu sắc ngẫu nhiên cho box-shadow (phần explode)
            const r = Math.floor(Math.random() * 256);
            const g = Math.floor(Math.random() * 256);
            const b = Math.floor(Math.random() * 256);
            firework.style.setProperty('--explode-color-1', `rgba(${r},${g},${b},0.8)`);
            firework.style.setProperty('--explode-color-2', `rgba(${r},${g},${b},0.5)`);
            
            // Thêm vào body hoặc wrappedContainer để dễ quản lý
            (wrappedContainer || document.body).appendChild(firework);
            // Tự hủy sau khi nổ
            firework.addEventListener('animationend', (e) => {
                if (e.animationName === 'explode') {
                    firework.remove();
                }
            });
        }
    }


    async function startWrappedExperience(name) {
        if(lookupErrorMessage) lookupErrorMessage.textContent = '';
        if(lookupForm) lookupForm.querySelector('button[type="submit"]').disabled = true;
        if(lookupForm) lookupForm.querySelector('button[type="submit"]').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tải...';

        try {
            const response = await fetch(`/api/customers?name=${encodeURIComponent(name)}`);
            if (!response.ok) {
                if (response.status === 404) {
                    if(lookupErrorMessage) lookupErrorMessage.textContent = `Không tìm thấy thông tin cho "${name}". Vui lòng thử lại tên khác.`;
                } else {
                    const errorData = await response.json().catch(() => ({ message: response.statusText }));
                    throw new Error(`Lỗi ${response.status}: ${errorData.message || 'Không thể tải dữ liệu'}`);
                }
                if(lookupForm) lookupForm.querySelector('button[type="submit"]').disabled = false;
                if(lookupForm) lookupForm.querySelector('button[type="submit"]').innerHTML = '<i class="fas fa-paper-plane"></i> Xem Ngay!';
                return;
            }
            customerDataGlobal = await response.json();
            
            populateWrappedData(customerDataGlobal);
            currentSlideIndex = 0;
            showSlide(currentSlideIndex);
            
            if(lookupFormContainer) lookupFormContainer.style.display = 'none'; // Ẩn form đăng nhập
            if(wrappedContainer) wrappedContainer.classList.add('active');
            document.body.classList.add('wrapped-active');

        } catch (error) {
            console.error("Lỗi khi bắt đầu Wrapped Experience:", error);
            if(lookupErrorMessage) lookupErrorMessage.textContent = `Lỗi: ${error.message}. Vui lòng thử lại.`;
            if(lookupForm) lookupForm.querySelector('button[type="submit"]').disabled = false;
            if(lookupForm) lookupForm.querySelector('button[type="submit"]').innerHTML = '<i class="fas fa-paper-plane"></i> Xem Ngay!';
        }
    }

    if (lookupForm) {
        lookupForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const customerName = customerNameInput.value.trim();
            if (!customerName) {
                if(lookupErrorMessage) lookupErrorMessage.textContent = "Vui lòng nhập tên của bạn.";
                return;
            }
            startWrappedExperience(customerName);
        });
    }

    if (nextSlideBtn) {
        nextSlideBtn.addEventListener('click', () => {
            if (currentSlideIndex < slides.length - 1) {
                currentSlideIndex++;
                showSlide(currentSlideIndex);
                if (currentSlideIndex === slides.length - 1) { // Slide cảm ơn cuối cùng
                    launchFireworks();
                }
            }
        });
    }

    if (prevSlideBtn) {
        prevSlideBtn.addEventListener('click', () => {
            if (currentSlideIndex > 0) {
                currentSlideIndex--;
                showSlide(currentSlideIndex);
            }
        });
    }

    if (closeWrappedBtn) {
        closeWrappedBtn.addEventListener('click', () => {
            if(wrappedContainer) wrappedContainer.classList.remove('active');
            document.body.classList.remove('wrapped-active');
            if(lookupFormContainer) lookupFormContainer.style.display = 'block'; // Hiện lại form đăng nhập
            if(lookupForm) lookupForm.reset(); // Reset form
            if(lookupForm) lookupForm.querySelector('button[type="submit"]').disabled = false;
            if(lookupForm) lookupForm.querySelector('button[type="submit"]').innerHTML = '<i class="fas fa-paper-plane"></i> Xem Ngay!';
            if(customerNameInput) customerNameInput.value = '';
            if(lookupErrorMessage) lookupErrorMessage.textContent = '';

            // Dọn dẹp pháo hoa nếu có
            document.querySelectorAll('.firework').forEach(fw => fw.remove());
        });
    }
});
