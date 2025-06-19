// File: my_orders_app.js - Phiên bản "3D LUNG LINH" cuối cùng
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
    let isAnimating = false; // Biến cờ để chống spam click

    // Mảng câu thoại (Không thay đổi)
    const greetings = ["Chào mừng [TEN_KHACH_HANG]! Hãy cùng khám phá hành trình photo đáng nhớ của bạn nhé!", "Một năm nhìn lại, một chặng đường đầy ắp kỷ niệm! Chào mừng [TEN_KHACH_HANG]!", "Sẵn sàng cho chuyến du hành ngược thời gian qua những bản in tuyệt vời chứ, [TEN_KHACH_HANG]?"];
    const habitRemarks = { printType: ["Có vẻ như [CACH_IN_UU_THICH] là \"chân ái\" của bạn rồi!", "Phong cách in [CACH_IN_UU_THICH] rất hợp với bạn đó!"], totalPages: ["Với [TONG_SO_TRANG] trang giấy, bạn đã tạo nên cả một thư viện ký ức!", "[TONG_SO_TRANG] trang! Một con số ấn tượng."] };
    const generalRemarks = { low: "Mỗi khởi đầu đều đáng quý. Hy vọng bạn sẽ có thêm nhiều dự án tuyệt vời trong tương lai!", medium: "Bạn đã cho thấy sự chăm chỉ và hiệu quả đáng nể. Hãy tiếp tục phát huy nhé, [TEN_KHACH_HANG]!", high: "Bạn thực sự là một nguồn cảm hứng với năng suất làm việc của mình, [TEN_KHACH_HANG]. Thật ấn tượng!" };
    const authorThankYouMessages = [{ message: "Cảm ơn bạn, [TEN_KHACH_HANG], đã đồng hành cùng mình trên một chặng đường chứa đầy những kỷ niệm. Sự tin tưởng của bạn là động lực rất lớn cho mình.", wish: "Chúc bạn sẽ luôn vững bước, chinh phục được nguyện vọng 1 và đỗ vào trường đại học mà bạn hằng mơ ước. Hãy luôn giữ lửa đam mê nhé!" }, { message: "Gửi [TEN_KHACH_HANG], mỗi một đơn hàng của bạn không chỉ là những trang giấy, mà còn là niềm vui. Cảm ơn bạn đã là một phần của hành trình này.", wish: "Mong rằng mọi dự định của bạn trong tương lai đều thành công rực rỡ, đặc biệt là cánh cửa đại học rộng mở chào đón bạn. Cố lên nhé!" }];

    function getRandomElement(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    
    // --- CÁC HÀM HỖ TRỢ HIỆU ỨNG (Không thay đổi) ---
    function wrapLetters(selector) { /* ... (giữ nguyên hàm wrapLetters) ... */ }
    function launchFireworksAnime() { /* ... (giữ nguyên hàm pháo hoa anime.js) ... */ }
    
    // --- CÁC HÀM CHÍNH ĐƯỢC NÂNG CẤP LÊN 3D ---

    function populateWrappedData(customer) { /* ... (giữ nguyên hàm populateWrappedData với hiệu ứng đếm số) ... */ }
    
    // NÂNG CẤP LỚN NHẤT: Hàm showSlide với hiệu ứng lật 3D
    function showSlide(newIndex, direction = 'next') {
        if (isAnimating || newIndex === currentSlideIndex) return;
        isAnimating = true;

        const oldSlide = slides[currentSlideIndex];
        const newSlide = slides[newIndex];
        
        // Bọc chữ cái cho slide mới
        wrapLetters(`#${newSlide.id} h2`);
        
        // Đặt slide mới vào vị trí ban đầu để chuẩn bị animation
        newSlide.style.display = 'flex';
        newSlide.style.opacity = 0; // Bắt đầu với trạng thái trong suốt

        const rotationValue = 90;
        const outDirection = (direction === 'next') ? -rotationValue : rotationValue;
        const inDirection = (direction === 'next') ? rotationValue : -rotationValue;
        
        const timeline = anime.timeline({
            duration: 800,
            easing: 'easeInOutQuint',
            complete: () => {
                isAnimating = false;
                oldSlide.style.display = 'none'; // Ẩn slide cũ đi sau khi animation xong
                currentSlideIndex = newIndex;
                updateNavButtons();
            }
        });

        // Animation cho slide cũ lật ra ngoài
        timeline.add({
            targets: oldSlide,
            rotateY: outDirection,
            scale: 0.8,
            opacity: 0,
        }, 0);

        // Animation cho slide mới lật vào
        timeline.add({
            targets: newSlide,
            rotateY: [inDirection, 0],
            scale: [0.8, 1],
            opacity: 1,
        }, 100); // Bắt đầu sau 100ms

        // Animation cho nội dung bên trong slide mới xuất hiện
        timeline.add({
            targets: `#${newSlide.id} .icon-large, #${newSlide.id} h2 .letter, #${newSlide.id} p, #${newSlide.id} .stat-card`,
            translateY: [20, 0],
            opacity: [0, 1],
            delay: anime.stagger(50),
        }, '-=300'); // Bắt đầu trước khi slide lật xong 300ms

        if (newIndex === slides.length - 1) {
            launchFireworksAnime();
        }
    }

    function updateNavButtons() {
        prevSlideBtn.style.display = currentSlideIndex === 0 ? 'none' : 'inline-block';
        nextSlideBtn.style.display = currentSlideIndex === slides.length - 1 ? 'none' : 'inline-block';
        closeWrappedBtn.style.display = currentSlideIndex === slides.length - 1 ? 'inline-block' : 'none';
    }

    async function startWrappedExperience(name) {
        // ... (giữ nguyên hàm startWrappedExperience đã nâng cấp trước đó) ...
        // Đảm bảo lần đầu gọi showSlide phải set currentSlideIndex đúng
        // ...
        populateWrappedData(customerDataGlobal);
        currentSlideIndex = 0;
        // Hiển thị slide đầu tiên mà không có hiệu ứng lật
        const firstSlide = slides[0];
        firstSlide.style.display = 'flex';
        updateNavButtons();
        // Chạy animation cho nội dung của slide đầu tiên
        wrapLetters(`#${firstSlide.id} h2`);
        anime({
            targets: `#${firstSlide.id} .icon-large, #${firstSlide.id} h2 .letter, #${firstSlide.id} p`,
            translateY: [20, 0],
            opacity: [0, 1],
            delay: anime.stagger(100),
            duration: 800,
            easing: 'easeOutExpo'
        });
    }

    // Các Event Listeners (cập nhật để truyền hướng)
    nextSlideBtn.addEventListener('click', () => {
        if (currentSlideIndex < slides.length - 1) {
            showSlide(currentSlideIndex + 1, 'next');
        }
    });

    prevSlideBtn.addEventListener('click', () => {
        if (currentSlideIndex > 0) {
            showSlide(currentSlideIndex - 1, 'prev');
        }
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
