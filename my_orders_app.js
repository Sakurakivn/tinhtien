document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements (Không thay đổi)
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
    let customerDataGlobal = null;

    // --- Mảng chứa các câu nói ngẫu nhiên (Không thay đổi) ---
    const greetings = [
        "Chào mừng [TEN_KHACH_HANG]! Hãy cùng khám phá hành trình photo đáng nhớ của bạn nhé!",
        "Một năm nhìn lại, một chặng đường đầy ắp kỷ niệm! Chào mừng [TEN_KHACH_HANG] đến với tổng kết photo của riêng bạn!",
        "Sẵn sàng cho chuyến du hành ngược thời gian qua những bản in tuyệt vời chứ, [TEN_KHACH_HANG]?",
    ];
    const habitRemarks = {
        printType: [
            "Có vẻ như [CACH_IN_UU_THICH] là \"chân ái\" của bạn rồi!",
            "Phong cách in [CACH_IN_UU_THICH] rất hợp với bạn đó!",
        ],
        totalPages: [
            "Với [TONG_SO_TRANG] trang giấy, bạn đã tạo nên cả một thư viện ký ức!",
            "[TONG_SO_TRANG] trang! Một con số ấn tượng cho những tài liệu quan trọng."
        ]
    };
    const generalRemarks = {
        low: "Mỗi khởi đầu đều đáng quý. Hy vọng bạn sẽ có thêm nhiều dự án tuyệt vời trong tương lai!",
        medium: "Bạn đã cho thấy sự chăm chỉ và hiệu quả đáng nể. Hãy tiếp tục phát huy nhé, [TEN_KHACH_HANG]!",
        high: "Bạn thực sự là một nguồn cảm hứng với năng suất làm việc và học tập của mình, [TEN_KHACH_HANG]. Thật ấn tượng!"
    };
    const authorThankYouMessages = [
        { message: "Cảm ơn bạn, [TEN_KHACH_HANG], đã đồng hành cùng mình trên một chặng đường có thể không quá dài, nhưng chứa đầy những cảm xúc và kỷ niệm...", wish: "Chúc bạn sẽ luôn vững bước, chinh phục được nguyện vọng 1 và đỗ vào trường đại học mà bạn hằng mơ ước..." },
        { message: "Gửi [TEN_KHACH_HANG], mỗi một đơn hàng của bạn không chỉ là những trang giấy, mà còn là niềm vui và sự khích lệ cho mình...", wish: "Mong rằng mọi dự định của bạn trong tương lai đều thành công rực rỡ, đặc biệt là cánh cửa đại học rộng mở chào đón bạn. Cố lên nhé!" }
    ];

    function getRandomElement(arr) {
        if (!arr || arr.length === 0) return "";
        return arr[Math.floor(Math.random() * arr.length)];
    }

    // --- CÁC HÀM HỖ TRỢ HIỆU ỨNG MỚI ---
    function wrapLetters(selector) {
        document.querySelectorAll(selector).forEach(el => {
            el.innerHTML = el.textContent.replace(/\S/g, "<span class='letter'>$&</span>");
        });
    }

    function launchFireworksAnime() {
        // ... (hàm pháo hoa bằng anime.js đã cung cấp ở câu trả lời trước) ...
    }
    
    // --- CÁC HÀM CHÍNH ĐƯỢC NÂNG CẤP ---

    // NÂNG CẤP: Thay thế hàm showSlide cũ bằng phiên bản có hiệu ứng anime.js
    function showSlide(index) {
        slides.forEach((slide, i) => {
            if (i === index) {
                slide.style.display = 'flex';
                wrapLetters(`#${slide.id} h2`);
                
                const tl = anime.timeline({ easing: 'easeOutExpo', duration: 800 });
                tl.add({ targets: slide, opacity: [0, 1] })
                  .add({ targets: `#${slide.id} h2 .letter`, translateY: [-40, 0], opacity: [0, 1], delay: anime.stagger(35) }, '-=700')
                  .add({ targets: `#${slide.id} .icon-large`, scale: [0.3, 1], opacity: [0, 1] }, '-=800')
                  .add({ targets: `#${slide.id} p, #${slide.id} .stat-card`, translateY: [30, 0], opacity: [0, 1], delay: anime.stagger(120) }, '-=600');

                if (index === slides.length - 1) launchFireworksAnime();
            } else {
                slide.style.display = 'none';
            }
        });
        prevSlideBtn.style.display = index === 0 ? 'none' : 'inline-block';
        nextSlideBtn.style.display = index === slides.length - 1 ? 'none' : 'inline-block';
        closeWrappedBtn.style.display = index === slides.length - 1 ? 'inline-block' : 'none';
    }

    // NÂNG CẤP: Hàm populateWrappedData tích hợp hiệu ứng đếm số bạn đã có
    function populateWrappedData(customer) {
        if (!customer) return;
        const customerName = customer.name || "Bạn";

        // Slide Welcome (Không đổi)
        document.getElementById('welcomeName').textContent = getRandomElement(greetings).replace(/\[TEN_KHACH_HANG\]/g, customerName);

        // Hiệu ứng đếm số (Giữ nguyên và tích hợp logic của bạn)
        const totalOrders = customer.orders ? customer.orders.length : 0;
        const totalSpent = customer.orders ? customer.orders.reduce((sum, order) => sum + (order.finalTotalPrice || 0), 0) : 0;
        const totalOrdersEl = document.getElementById('totalOrders');
        const totalSpentEl = document.getElementById('totalSpent');

        if (totalOrdersEl) {
            let orderCounter = { value: 0 };
            anime({ targets: orderCounter, value: totalOrders, round: 1, duration: 1500, easing: 'easeInOutCubic', update: () => { totalOrdersEl.innerHTML = orderCounter.value; } });
        }
        if (totalSpentEl) {
            let spentCounter = { value: 0 };
            anime({ targets: spentCounter, value: totalSpent, round: 1, duration: 2000, easing: 'easeInOutCubic', update: () => { totalSpentEl.innerHTML = `${Math.round(spentCounter.value).toLocaleString('vi-VN')} VND`; } });
        }
        
        // Logic còn lại (Không đổi)
        let favPrintType = "Không xác định";
        let totalPagesPrinted = customer.orders ? customer.orders.reduce((sum, order) => sum + (order.pages || 0), 0) : 0;
        if (customer.orders && totalOrders > 0) {
            const typeCounts = customer.orders.map(o => o.printType).filter(Boolean).reduce((acc, type) => { acc[type] = (acc[type] || 0) + 1; return acc; }, {});
            if (Object.keys(typeCounts).length > 0) {
                let maxType = Object.keys(typeCounts).reduce((a, b) => typeCounts[a] > typeCounts[b] ? a : b);
                favPrintType = maxType === 'portrait' ? 'In Dọc' : 'In Ngang';
            }
        }
        document.getElementById('favPrintTypeStat').textContent = favPrintType;
        document.getElementById('totalPagesPrintedStat').textContent = totalPagesPrinted.toLocaleString('vi-VN');
        let remarkCategory = totalOrders <= 3 ? 'low' : (totalOrders <= 10 ? 'medium' : 'high');
        document.getElementById('remarkText').textContent = generalRemarks[remarkCategory].replace(/\[TEN_KHACH_HANG\]/g, customerName);
        const finalThankYou = getRandomElement(authorThankYouMessages);
        document.getElementById('thankYouName').innerHTML = finalThankYou.message.replace(/\[TEN_KHACH_HANG\]/g, `<strong>${customerName}</strong>`) + `<p class="author-wish" style="margin-top:15px; font-size: 1.2em;">${finalThankYou.wish}</p>`;
    }
    
    // NÂNG CẤP: Hàm startWrappedExperience có hiệu ứng chuyển cảnh
    async function startWrappedExperience(name) {
        lookupErrorMessage.textContent = '';
        const submitButton = lookupForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tải...';

        try {
            const response = await fetch(`/api/customers?name=${encodeURIComponent(name)}`);
            if (!response.ok) throw new Error(response.status === 404 ? `Rất tiếc, không tìm thấy thông tin cho "${name}".` : `Lỗi ${response.status}.`);
            customerDataGlobal = await response.json();
            
            anime({
                targets: lookupFormContainer,
                opacity: 0,
                duration: 500,
                easing: 'easeOutExpo',
                complete: () => {
                    lookupFormContainer.style.display = 'none';
                    wrappedContainer.classList.add('active');
                    document.body.classList.add('wrapped-active');
                    populateWrappedData(customerDataGlobal);
                    currentSlideIndex = 0;
                    showSlide(currentSlideIndex);
                }
            });
        } catch (error) {
            lookupErrorMessage.textContent = error.message;
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-paper-plane"></i> Xem Ngay!';
        }
    }

    // Các Event Listeners (Không thay đổi)
    lookupForm.addEventListener('submit', (event) => {
        event.preventDefault();
        startWrappedExperience(customerNameInput.value.trim());
    });
    nextSlideBtn.addEventListener('click', () => {
        if (currentSlideIndex < slides.length - 1) showSlide(++currentSlideIndex);
    });
    prevSlideBtn.addEventListener('click', () => {
        if (currentSlideIndex > 0) showSlide(--currentSlideIndex);
    });
    closeWrappedBtn.addEventListener('click', () => {
        wrappedContainer.classList.remove('active');
        document.body.classList.remove('wrapped-active');
        lookupFormContainer.style.display = 'block';
        anime({ targets: lookupFormContainer, opacity: [0, 1] });
        lookupForm.reset();
        lookupErrorMessage.textContent = '';
    });
});
