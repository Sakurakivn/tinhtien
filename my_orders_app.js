document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const lookupFormContainer = document.getElementById('lookupFormContainer');
    const lookupForm = document.getElementById('customerLookupFormWrapped');
    const customerNameInput = document.getElementById('customerNameToLookupWrapped');
    const lookupErrorMessage = document.getElementById('lookupErrorMessageWrapped');
    
    const wrappedContainer = document.getElementById('wrappedContainer');
    const slides = document.querySelectorAll('.wrapped-slide'); // Lấy tất cả các slide
    const prevSlideBtn = document.getElementById('prevSlideBtn');
    const nextSlideBtn = document.getElementById('nextSlideBtn');
    const closeWrappedBtn = document.getElementById('closeWrappedBtn');

    let currentSlideIndex = 0;
    let customerDataGlobal = null; // Lưu trữ dữ liệu khách hàng sau khi fetch

    // --- Mảng chứa các câu nói ngẫu nhiên ---
    const greetings = [
        "Chào mừng [TEN_KHACH_HANG]! Hãy cùng khám phá hành trình photo đáng nhớ của bạn nhé!",
        "Một năm nhìn lại, một chặng đường đầy ắp kỷ niệm! Chào mừng [TEN_KHACH_HANG] đến với tổng kết photo của riêng bạn!",
        "Sẵn sàng cho chuyến du hành ngược thời gian qua những bản in tuyệt vời chứ, [TEN_KHACH_HANG]?",
        "Hello [TEN_KHACH_HANG]! Cùng xem lại những dấu ấn bạn đã tạo nên nào!",
        "[TEN_KHACH_HANG] ơi, tổng kết photo của bạn đã sẵn sàng rồi đây!"
    ];

    // overviewRemarks không được sử dụng trực tiếp trong populateWrappedData hiện tại, 
    // nhưng bạn có thể dùng nó nếu muốn thêm nhận xét vào slide tổng quan
    const overviewRemarks = { 
        low: [
            "Mỗi đơn hàng đều là một khởi đầu tuyệt vời. Cảm ơn bạn đã tin tưởng!",
            "Hành trình vạn dặm bắt đầu từ một bản in. Cảm ơn bạn đã chọn chúng tôi!",
        ],
        medium: [
            "Bạn là một khách hàng thân thiết và đáng quý! Cảm ơn sự gắn bó của bạn.",
            "Số lượng đơn hàng của bạn cho thấy một năm làm việc và học tập thật hiệu quả!",
        ],
        high: [
            "Wow, [TEN_KHACH_HANG]! Bạn đích thị là một \"cao thủ\" in ấn!",
            "Năng suất của bạn thật đáng ngưỡng mộ! Cảm ơn vì đã luôn chọn chúng tôi.",
        ]
    };

    const habitRemarks = {
        printType: [
            "Có vẻ như [CACH_IN_UU_THICH] là \"chân ái\" của bạn rồi!",
            "Phong cách in [CACH_IN_UU_THICH] rất hợp với bạn đó!",
            "Lựa chọn [CACH_IN_UU_THICH] cho thấy bạn là người rất thực tế và hiệu quả."
        ],
        totalPages: [
            "Với [TONG_SO_TRANG] trang giấy, bạn đã tạo nên cả một thư viện ký ức!",
            "Mỗi trang giấy là một câu chuyện. Bạn đã viết nên [TONG_SO_TRANG] trang đầy màu sắc!",
            "[TONG_SO_TRANG] trang! Một con số ấn tượng cho những tài liệu quan trọng."
        ]
    };

    const generalRemarks = { // Dùng cho slide "Remark"
        low: "Mỗi khởi đầu đều đáng quý. Hy vọng bạn sẽ có thêm nhiều dự án tuyệt vời trong tương lai!",
        medium: "Bạn đã cho thấy sự chăm chỉ và hiệu quả đáng nể. Hãy tiếp tục phát huy nhé, [TEN_KHACH_HANG]!",
        high: "Bạn thực sự là một nguồn cảm hứng với năng suất làm việc và học tập của mình, [TEN_KHACH_HANG]. Thật ấn tượng!"
    };

    const authorThankYouMessages = [
        {
            message: "Cảm ơn bạn, [TEN_KHACH_HANG], đã đồng hành cùng mình trên một chặng đường có thể không quá dài, nhưng chứa đầy những cảm xúc và kỷ niệm. Con số không nói lên tất cả, nhưng sự tin tưởng của bạn là động lực rất lớn cho mình.",
            wish: "Chúc bạn sẽ luôn vững bước, chinh phục được nguyện vọng 1 và đỗ vào trường đại học mà bạn hằng mơ ước. Hãy luôn giữ lửa đam mê và không ngừng cố gắng nhé!"
        },
        {
            message: "Gửi [TEN_KHACH_HANG], mỗi một đơn hàng của bạn không chỉ là những trang giấy, mà còn là niềm vui và sự khích lệ cho mình. Cảm ơn bạn đã là một phần của hành trình này.",
            wish: "Mong rằng mọi dự định của bạn trong tương lai đều thành công rực rỡ, đặc biệt là cánh cửa đại học rộng mở chào đón bạn. Cố lên nhé!"
        },
        {
            message: "Thật tuyệt vời khi được phục vụ bạn, [TEN_KHACH_HANG]! Cảm ơn bạn đã lựa chọn và tin tưởng. Mỗi lần chuẩn bị tài liệu cho bạn là một lần mình cảm thấy công việc này thêm ý nghĩa.",
            wish: "Chúc [TEN_KHACH_HANG] đạt được mọi mục tiêu đã đặt ra, đặc biệt là thành công trên con đường học vấn và đạt được nguyện vọng 1. Tương lai tươi sáng đang chờ bạn!"
        }
    ];

    function getRandomElement(arr) {
        if (!arr || arr.length === 0) return "";
        return arr[Math.floor(Math.random() * arr.length)];
    }

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

    function showSlide(index) {
        if (!slides || slides.length === 0) return;

        slides.forEach((slide, i) => {
            slide.classList.remove('active-slide');
            // Reset trạng thái cho slide "habits" khi chuyển đi hoặc khi bắt đầu
            if (slide.id === 'slide-habits') {
                const habitStatsInitialDiv = slide.querySelector('.habit-stats-initial');
                const habitRemarksFinalDiv = slide.querySelector('.habit-remarks-final');
                if (habitStatsInitialDiv) {
                    habitStatsInitialDiv.style.opacity = '1'; // Đảm bảo hiện lại khi quay lại slide
                    habitStatsInitialDiv.classList.remove('fade-out');
                }
                if (habitRemarksFinalDiv) {
                    habitRemarksFinalDiv.style.display = 'none'; // Ẩn đi
                    habitRemarksFinalDiv.classList.remove('fade-in');
                }
            }

            if (i === index) {
                slide.classList.add('active-slide');
                // Nếu là slide "Thói quen" (slide-habits), kích hoạt hiệu ứng
                if (slide.id === 'slide-habits') {
                    const habitStatsInitialDiv = slide.querySelector('.habit-stats-initial');
                    const habitRemarksFinalDiv = slide.querySelector('.habit-remarks-final');
                    const favPrintTypeRemarkEl = document.getElementById('favPrintTypeRemark');
                    const totalPagesPrintedRemarkEl = document.getElementById('totalPagesPrintedRemark');

                    if (habitStatsInitialDiv && habitRemarksFinalDiv && favPrintTypeRemarkEl && totalPagesPrintedRemarkEl) {
                        // 1. Đảm bảo số liệu ban đầu được hiển thị
                        habitStatsInitialDiv.style.opacity = '1';
                        habitStatsInitialDiv.classList.remove('fade-out');
                        habitRemarksFinalDiv.style.display = 'none';
                        habitRemarksFinalDiv.classList.remove('fade-in');
                        
                        // 2. Sau 3 giây, làm mờ số liệu và hiện lời nhận xét
                        setTimeout(() => {
                            // Chỉ thực hiện nếu slide này vẫn đang active
                            if (slide.classList.contains('active-slide')) { 
                                habitStatsInitialDiv.classList.add('fade-out');
                                
                                // Điền nội dung nhận xét đã lưu trong dataset
                                favPrintTypeRemarkEl.textContent = habitRemarksFinalDiv.dataset.favPrintTypeRemark || '';
                                totalPagesPrintedRemarkEl.textContent = habitRemarksFinalDiv.dataset.totalPagesPrintedRemark || '';
                                
                                setTimeout(() => {
                                    if (slide.classList.contains('active-slide')) {
                                         habitRemarksFinalDiv.classList.add('fade-in');
                                    }
                                }, 500); // Thời gian này nên bằng hoặc lớn hơn duration của fade-out
                            }
                        }, 3000); // 3 giây
                    }
                }
            }
        });
        if(prevSlideBtn) prevSlideBtn.style.display = index === 0 ? 'none' : 'inline-block';
        if(nextSlideBtn) nextSlideBtn.style.display = index === slides.length - 1 ? 'none' : 'inline-block';
        if(closeWrappedBtn) closeWrappedBtn.style.display = index === slides.length - 1 ? 'inline-block' : 'none';
    }

    function populateWrappedData(customer) {
        if (!customer) return;
        const customerName = customer.name || "Bạn";

        const welcomeNameEl = document.getElementById('welcomeName');
        if (welcomeNameEl) {
            let welcomeMsg = getRandomElement(greetings);
            welcomeNameEl.textContent = welcomeMsg.replace(/\[TEN_KHACH_HANG\]/g, customerName);
        }

        const totalOrders = customer.orders ? customer.orders.length : 0;
        const totalSpent = customer.orders ? customer.orders.reduce((sum, order) => sum + (order.finalTotalPrice || 0), 0) : 0;
        const totalOrdersEl = document.getElementById('totalOrders');
        const totalSpentEl = document.getElementById('totalSpent');
        if (totalOrdersEl) totalOrdersEl.textContent = totalOrders;
        if (totalSpentEl) totalSpentEl.textContent = `${totalSpent.toLocaleString('vi-VN')} VND`;
        
        // --- Xử lý cho Slide "Thói quen" / "Phong Cách" ---
        const favPrintTypeStatEl = document.getElementById('favPrintTypeStat');
        const totalPagesPrintedStatEl = document.getElementById('totalPagesPrintedStat');
        const habitRemarksFinalDiv = document.querySelector('#slide-habits .habit-remarks-final');

        let favPrintType = "Không xác định";
        let totalPagesPrinted = 0;
        if (totalOrders > 0 && customer.orders) {
            const printTypes = customer.orders.map(o => o.printType).filter(Boolean);
            if (printTypes.length > 0) {
                const typeCounts = printTypes.reduce((acc, type) => { acc[type] = (acc[type] || 0) + 1; return acc; }, {});
                if (Object.keys(typeCounts).length > 0) {
                    let maxType = Object.keys(typeCounts).reduce((a, b) => typeCounts[a] > typeCounts[b] ? a : b);
                    favPrintType = maxType === 'portrait' ? 'In Dọc' : (maxType === 'landscape' ? 'In Ngang' : maxType);
                }
            }
            totalPagesPrinted = customer.orders.reduce((sum, order) => sum + (order.pages || 0), 0);
        }
        if (favPrintTypeStatEl) favPrintTypeStatEl.textContent = favPrintType;
        if (totalPagesPrintedStatEl) totalPagesPrintedStatEl.textContent = totalPagesPrinted.toLocaleString('vi-VN');

        if (habitRemarksFinalDiv) {
            let habitPrintTypeRemark = getRandomElement(habitRemarks.printType);
            let habitTotalPagesRemark = getRandomElement(habitRemarks.totalPages);
            habitRemarksFinalDiv.dataset.favPrintTypeRemark = habitPrintTypeRemark.replace(/\[CACH_IN_UU_THICH\]/g, favPrintType);
            habitRemarksFinalDiv.dataset.totalPagesPrintedRemark = habitTotalPagesRemark.replace(/\[TONG_SO_TRANG\]/g, totalPagesPrinted.toLocaleString('vi-VN'));
        }
        
        const remarkTitleEl = document.getElementById('remarkTitle');
        const remarkTextEl = document.getElementById('remarkText');
        let generalRemarkCategory;
        if (totalOrders <= 3) generalRemarkCategory = 'low';
        else if (totalOrders <= 10) generalRemarkCategory = 'medium';
        else generalRemarkCategory = 'high';
        
        if(remarkTitleEl) remarkTitleEl.textContent = "Đôi Lời Nhắn Gửi Đặc Biệt...";
        if(remarkTextEl && generalRemarks[generalRemarkCategory]) {
            remarkTextEl.textContent = generalRemarks[generalRemarkCategory].replace(/\[TEN_KHACH_HANG\]/g, customerName);
             if (totalSpent > 200000 && totalOrders > 5) { // Ví dụ mốc VIP
                remarkTextEl.textContent += " Bạn quả là một khách hàng VIP của chúng tôi!";
            }
        }
        
        const finalThankYou = getRandomElement(authorThankYouMessages);
        const thankYouMessageElement = document.getElementById('thankYouName');
        const existingWish = thankYouMessageElement ? thankYouMessageElement.parentNode.querySelector('.author-wish') : null;
        if (existingWish) existingWish.remove();

        if (thankYouMessageElement && finalThankYou) {
            thankYouMessageElement.innerHTML = finalThankYou.message.replace(/\[TEN_KHACH_HANG\]/g, `<strong>${customerName}</strong>`);
            const thankYouWishElement = document.createElement('p');
            thankYouWishElement.classList.add('author-wish');
            thankYouWishElement.style.marginTop = "15px";
            thankYouWishElement.style.fontSize = "1.2em"; // Điều chỉnh kích thước nếu cần
            thankYouWishElement.innerHTML = finalThankYou.wish.replace(/\[TEN_KHACH_HANG\]/g, `<strong>${customerName}</strong>`);
            thankYouMessageElement.parentNode.insertBefore(thankYouWishElement, thankYouMessageElement.nextSibling);
        } else if (thankYouMessageElement) {
            thankYouMessageElement.textContent = `Cảm ơn bạn, ${customerName}, đã luôn tin tưởng và ủng hộ! Chúc bạn mọi điều tốt đẹp và đạt được những thành tựu rực rỡ trong tương lai!`;
        }
    }
    
    function launchFireworks() {
        const numFireworks = 20; 
        const containerForFireworks = wrappedContainer || document.body;
        for (let i = 0; i < numFireworks; i++) {
            const firework = document.createElement('div');
            firework.classList.add('firework');
            firework.style.left = Math.random() * 100 + 'vw';
            firework.style.animationDelay = Math.random() * 1.5 + 's';
            const r = Math.floor(Math.random() * 156) + 100; // Màu sáng hơn, tránh màu quá tối
            const g = Math.floor(Math.random() * 156) + 100;
            const b = Math.floor(Math.random() * 156) + 100;
            firework.style.setProperty('--explode-color-1', `rgba(${r},${g},${b},0.9)`);
            firework.style.setProperty('--explode-color-2', `rgba(${Math.min(r+50,255)},${Math.min(g+50,255)},${Math.min(b+50,255)},0.7)`);
            containerForFireworks.appendChild(firework);
            firework.addEventListener('animationend', (e) => {
                // Chỉ remove sau khi animation 'shatter' (nổ) hoàn tất
                if (e.animationName === 'shatter') { 
                    firework.remove();
                }
            });
        }
    }

    async function startWrappedExperience(name) {
        if(lookupErrorMessage) lookupErrorMessage.textContent = '';
        const submitButton = lookupForm ? lookupForm.querySelector('button[type="submit"]') : null;
        if(submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu...';
        }

        try {
            const response = await fetch(`/api/customers?name=${encodeURIComponent(name)}`);
            if (!response.ok) {
                if (response.status === 404) {
                    if(lookupErrorMessage) lookupErrorMessage.textContent = `Rất tiếc, không tìm thấy thông tin tổng kết cho "${name}". Bạn vui lòng kiểm tra lại tên hoặc đảm bảo đã có đơn hàng với chúng tôi nhé.`;
                } else {
                    const errorData = await response.json().catch(() => ({ message: response.statusText }));
                    throw new Error(`Lỗi ${response.status}: ${errorData.message || 'Không thể tải dữ liệu'}`);
                }
                if(submitButton) {
                    submitButton.disabled = false;
                    submitButton.innerHTML = '<i class="fas fa-paper-plane"></i> Xem Ngay!';
                }
                return;
            }
            customerDataGlobal = await response.json();
            
            if (!customerDataGlobal || !customerDataGlobal.name) { // Kiểm tra thêm nếu API trả về 200 nhưng data rỗng
                 if(lookupErrorMessage) lookupErrorMessage.textContent = `Không tìm thấy dữ liệu hợp lệ cho "${name}".`;
                 if(submitButton) {
                    submitButton.disabled = false;
                    submitButton.innerHTML = '<i class="fas fa-paper-plane"></i> Xem Ngay!';
                }
                return;
            }

            populateWrappedData(customerDataGlobal);
            currentSlideIndex = 0;
            showSlide(currentSlideIndex); // Hiển thị slide đầu tiên
            
            if(lookupFormContainer) lookupFormContainer.style.display = 'none';
            if(wrappedContainer) wrappedContainer.classList.add('active');
            document.body.classList.add('wrapped-active');

        } catch (error) {
            console.error("Lỗi khi bắt đầu Wrapped Experience:", error);
            if(lookupErrorMessage) lookupErrorMessage.textContent = `Lỗi: ${error.message}. Vui lòng thử lại sau.`;
            if(submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = '<i class="fas fa-paper-plane"></i> Xem Ngay!';
            }
        }
    }

    if (lookupForm) {
        lookupForm.addEventListener('submit', function(event) {
            event.preventDefault();
            if (!customerNameInput) return;
            const customerName = customerNameInput.value.trim();
            if (!customerName) {
                if(lookupErrorMessage) lookupErrorMessage.textContent = "Vui lòng nhập tên của bạn để xem tổng kết.";
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
                if (currentSlideIndex === slides.length - 1) { // Nếu là slide cảm ơn cuối cùng
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
            if(lookupFormContainer) lookupFormContainer.style.display = 'block';
            const submitButton = lookupForm ? lookupForm.querySelector('button[type="submit"]') : null;
            if(lookupForm) lookupForm.reset(); 
            if(submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = '<i class="fas fa-paper-plane"></i> Xem Ngay!';
            }
            if(customerNameInput) customerNameInput.value = '';
            if(lookupErrorMessage) lookupErrorMessage.textContent = '';
            document.querySelectorAll('.firework').forEach(fw => fw.remove());
        });
    }
});
