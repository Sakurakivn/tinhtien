// File: my_orders_app.js - PHIÊN BẢN "LUNG LINH" 2D HOÀN CHỈNH
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const lookupFormContainer = document.getElementById('lookupFormContainer');
    const lookupForm = document.getElementById('customerLookupFormWrapped');
    const customerNameInput = document.getElementById('customerNameToLookupWrapped');
    const lookupErrorMessage = document.getElementById('lookupErrorMessageWrapped');
    const wrappedContainer = document.getElementById('wrappedContainer');
    const slides = document.querySelectorAll('.wrapped-slide:not(.not-found-slide)');
    
    const prevSlideBtn = document.getElementById('prevSlideBtn');
    const nextSlideBtn = document.getElementById('nextSlideBtn');
    const closeWrappedBtn = document.getElementById('closeWrappedBtn');
    const backgroundMusic = document.getElementById('background-music');
    const musicToggleBtn = document.getElementById('music-toggle-btn');
    const musicIcon = musicToggleBtn ? musicToggleBtn.querySelector('i') : null;
    const enterFullscreenBtn = document.getElementById('enter-fullscreen-btn');
    const fullscreenEntryScreen = document.getElementById('fullscreen-entry-screen');
    const mainContentWrapper = document.getElementById('main-content-wrapper');
    const irisWipe = document.getElementById('iris-wipe-effect');
    
    let currentSlideIndex = 0;
    let customerDataGlobal = null;

    // --- Mảng chứa các câu nói ngẫu nhiên ---
    const greetings = ["Chào mừng [TEN_KHACH_HANG]! Hãy cùng khám phá hành trình photo đáng nhớ của bạn nhé!", "Một năm nhìn lại, một chặng đường đầy ắp kỷ niệm! Chào mừng [TEN_KHACH_HANG]!", "Sẵn sàng cho chuyến du hành ngược thời gian qua những bản in tuyệt vời chứ, [TEN_KHACH_HANG]?"];
    const habitRemarks = { printType: ["Có vẻ như [CACH_IN_UU_THICH] là \"chân ái\" của bạn rồi!", "Phong cách in [CACH_IN_UU_THICH] rất hợp với bạn đó!"], totalPages: ["Với [TONG_SO_TRANG] trang giấy, bạn đã tạo nên cả một thư viện ký ức!", "[TONG_SO_TRANG] trang! Một con số ấn tượng."] };
    const generalRemarks = { low: "Mỗi khởi đầu đều đáng quý. Hy vọng bạn sẽ có thêm nhiều dự án tuyệt vời trong tương lai!", medium: "Bạn đã cho thấy sự chăm chỉ và hiệu quả đáng nể. Hãy tiếp tục phát huy nhé, [TEN_KHACH_HANG]!", high: "Bạn thực sự là một nguồn cảm hứng với năng suất làm việc của mình, [TEN_KHACH_HANG]. Thật ấn tượng!" };
    const authorThankYouMessages = [{ message: "Cảm ơn bạn, [TEN_KHACH_HANG], đã đồng hành cùng mình trên một chặng đường có thể không quá dài, nhưng chứa đầy những cảm xúc và kỷ niệm. Sự tin tưởng của bạn là động lực rất lớn cho mình.", wish: "Chúc bạn sẽ luôn vững bước, chinh phục được nguyện vọng 1 và đỗ vào trường đại học mà bạn hằng mơ ước. Hãy luôn giữ lửa đam mê nhé!" }, { message: "Gửi [TEN_KHACH_HANG], mỗi một đơn hàng của bạn không chỉ là những trang giấy, mà còn là niềm vui và sự khích lệ cho mình. Cảm ơn bạn đã là một phần của hành trình này.", wish: "Mong rằng mọi dự định của bạn trong tương lai đều thành công rực rỡ, đặc biệt là cánh cửa đại học rộng mở chào đón bạn. Cố lên nhé!" }];

    function getRandomElement(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

    // --- CÁC HÀM HỖ TRỢ HIỆU ỨNG ---
    function wrapLetters(selector) {
        document.querySelectorAll(selector).forEach(el => {
            if(el) el.innerHTML = el.textContent.replace(/\S/g, "<span class='letter'>$&</span>");
        });
    }

    function launchFireworksAnime() {
        const container = document.getElementById('wrappedContainer');
        if (!container) return;
        function createParticle(x, y) {
            const particle = document.createElement('div');
            particle.style.position = 'absolute';
            particle.style.left = x + 'px';
            particle.style.top = y + 'px';
            particle.style.width = anime.random(3, 7) + 'px';
            particle.style.height = particle.style.width;
            particle.style.borderRadius = '50%';
            particle.style.backgroundColor = `hsl(${anime.random(0, 360)}, 100%, 70%)`;
            particle.style.zIndex = '9999';
            container.appendChild(particle);
            return particle;
        }
        function launch(x) {
            const particle = createParticle(x, window.innerHeight);
            anime({
                targets: particle, top: anime.random(window.innerHeight * 0.1, window.innerHeight * 0.4), left: x + anime.random(-100, 100),
                easing: 'easeOutQuad', duration: anime.random(1000, 1800),
                complete: (anim) => {
                    const p = anim.animatables[0].target;
                    const pX = parseFloat(p.style.left);
                    const pY = parseFloat(p.style.top);
                    p.remove();
                    for (let i = 0; i < 60; i++) {
                        const explosion = createParticle(pX, pY);
                        anime({
                            targets: explosion, left: pX + anime.random(-200, 200), top: pY + anime.random(-200, 200),
                            opacity: [1, 0], duration: anime.random(1200, 2000), easing: 'easeOutExpo',
                            complete: (a) => a.animatables[0].target.remove()
                        });
                    }
                }
            });
        }
        anime({ targets: {}, duration: 1, delay: anime.stagger(150), loop: 8, update: () => launch(anime.random(window.innerWidth * 0.1, window.innerWidth * 0.9)) });
    }

    // --- CÁC HÀM CHÍNH ---
    function openFullscreen() {
        const elem = document.documentElement; // Lấy toàn bộ trang (<html>)
        if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(err => {
                console.warn(`Lỗi khi yêu cầu fullscreen: ${err.message} (${err.name})`);
            });
        } else if (elem.mozRequestFullScreen) { /* Firefox */
            elem.mozRequestFullScreen();
        } else if (elem.webkitRequestFullscreen) { /* Chrome, Safari & Opera */
            elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) { /* IE/Edge */
            elem.msRequestFullscreen();
        }
    }
    function populateWrappedData(customer) {
        if (!customer) return;
        const customerName = customer.name || "Bạn";
        document.getElementById('welcomeName').textContent = getRandomElement(greetings).replace(/\[TEN_KHACH_HANG\]/g, customerName);
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
        
        const totalOrders = customer.orders ? customer.orders.length : 0;
        const totalSpent = customer.orders ? customer.orders.reduce((sum, order) => sum + (order.finalTotalPrice || 0), 0) : 0;
        let favPrintType = "Không rõ";
        const totalPagesPrinted = customer.orders ? customer.orders.reduce((sum, order) => sum + (order.pages || 0), 0) : 0;
        if (totalOrders > 0) {
            const printTypes = customer.orders.map(o => o.printType).filter(Boolean);
            if(printTypes.length > 0) {
                 const typeCounts = printTypes.reduce((acc, type) => { acc[type] = (acc[type] || 0) + 1; return acc; }, {});
                 let maxType = Object.keys(typeCounts).reduce((a, b) => typeCounts[a] > typeCounts[b] ? a : b);
                 favPrintType = maxType === 'portrait' ? 'In Dọc' : 'In Ngang';
            }
        }

        document.getElementById('summary-name').textContent = customerName;
        document.getElementById('summary-total-orders').textContent = totalOrders.toLocaleString('vi-VN');
        document.getElementById('summary-total-spent').textContent = totalSpent.toLocaleString('vi-VN') + 'đ';
        document.getElementById('summary-total-pages').textContent = totalPagesPrinted.toLocaleString('vi-VN');
        document.getElementById('summary-fav-print-type').textContent = favPrintType;
    }
    

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

                if (index === slides.length - 1) {
                    launchFireworksAnime();
                }
            } else {
                slide.style.display = 'none';
            }
        });
        prevSlideBtn.style.display = index === 0 ? 'none' : 'inline-block';
        nextSlideBtn.style.display = index === slides.length - 1 ? 'none' : 'inline-block';
        closeWrappedBtn.style.display = index === slides.length - 1 ? 'inline-block' : 'none';
    }

    /* Sự kiện khi nhấn nút "Bắt đầu" */
    if (enterFullscreenBtn) {
        enterFullscreenBtn.addEventListener('click', () => {
            // 1. Yêu cầu bật fullscreen trước
            openFullscreen(); 
            
            // Lấy vị trí của nút bấm để vòng tròn bắt đầu từ đó
            const rect = enterFullscreenBtn.getBoundingClientRect();
            const posX = rect.left + (rect.width / 2);
            const posY = rect.top + (rect.height / 2);

            // Bắt đầu chuỗi hiệu ứng bằng anime.js timeline
            const timeline = anime.timeline({
                easing: 'easeInOutExpo'
            });

            timeline
                // BƯỚC A: Vòng tròn đen MỞ RỘNG ra từ nút bấm để che màn hình
                .add({
                    targets: irisWipe,
                    begin: () => {
                        // Hiện lớp hiệu ứng và đặt tâm vòng tròn vào nút bấm
                        irisWipe.style.visibility = 'visible';
                        irisWipe.style.clipPath = `circle(0% at ${posX}px ${posY}px)`;
                    },
                    clipPath: 'circle(150% at center)', // Mở rộng ra hơn 100% để chắc chắn che hết
                    duration: 800,
                    // BƯỚC B: KHI VÒNG TRÒN CHE HẾT, đổi nội dung trang
                    complete: () => {
                        if (fullscreenEntryScreen) fullscreenEntryScreen.style.display = 'none';
                        if (mainContentWrapper) mainContentWrapper.style.display = 'block';
                    }
                })
                // BƯỚC C: Vòng tròn đen THU LẠI để hiện ra nội dung mới
                .add({
                    targets: irisWipe,
                    clipPath: 'circle(0% at center)',
                    duration: 800,
                    delay: 200, // Nghỉ 200ms trước khi mở ra
                    complete: () => {
                        // Ẩn lớp hiệu ứng đi sau khi hoàn tất
                        irisWipe.style.visibility = 'hidden';
                    }
                });
        });
    }
    function startNotFoundExperience(name) {
        const notFoundSlides = {
            confirm: document.getElementById('slide-notfound-confirm'),
            searching: document.getElementById('slide-notfound-searching'),
            result: document.getElementById('slide-notfound-result'),
            back: document.getElementById('slide-notfound-back')
        };
        
        // Điền tên người dùng vào slide đầu tiên
        document.getElementById('notFoundNameConfirm').textContent = `'${name}'`;

        // Ẩn form tra cứu và hiện container wrapped
        lookupFormContainer.style.display = 'none';
        wrappedContainer.classList.add('active');
        document.body.classList.add('wrapped-active');
        
        // Chỉ hiện nút Đóng và Về trước (nếu cần), ẩn nút Tiếp theo
        prevSlideBtn.style.display = 'none';
        nextSlideBtn.style.display = 'none';
        closeWrappedBtn.style.display = 'inline-block';

        let currentNotFoundSlide = 0;
        const slideSequence = ['confirm', 'searching', 'result', 'back'];

        function showSpecificNotFoundSlide(slideKey) {
            // Ẩn tất cả các slide (cả chuẩn và not-found)
            document.querySelectorAll('.wrapped-slide').forEach(s => s.classList.remove('active-slide'));
            // Hiện slide not-found cụ thể
            if (notFoundSlides[slideKey]) {
                notFoundSlides[slideKey].classList.add('active-slide');
            }
        }
        
        // Dùng setTimeout để tạo chuỗi trình chiếu
        showSpecificNotFoundSlide('confirm'); // Hiện slide 1
        setTimeout(() => {
            showSpecificNotFoundSlide('searching'); // Hiện slide 2
            setTimeout(() => {
                showSpecificNotFoundSlide('result'); // Hiện slide 3
                setTimeout(() => {
                    showSpecificNotFoundSlide('back'); // Hiện slide 4
                }, 5000); // Thời gian hiển thị slide 3
            }, 2500); // Thời gian hiển thị slide 2
        }, 3000); // Thời gian hiển thị slide 1
    }
    
    async function startWrappedExperience(name) {
        lookupErrorMessage.textContent = '';
        const submitButton = lookupForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tải...';
        try {
            const response = await fetch(`/api/customers?name=${encodeURIComponent(name)}`);
            if (!response.ok) {
                if (response.status === 404) {
                    startNotFoundExperience(name);
            
            anime({
                targets: lookupFormContainer, opacity: 0, duration: 500, easing: 'easeOutExpo',
                complete: () => {
                    lookupFormContainer.style.display = 'none';
                    wrappedContainer.classList.add('active');
                    document.body.classList.add('wrapped-active');
                    populateWrappedData(customerDataGlobal);
                    currentSlideIndex = 0;
                    showSlide(currentSlideIndex);
                    if (backgroundMusic) {
                        backgroundMusic.play().catch(e => console.log("Trình duyệt chặn tự động phát nhạc."));
                    }
                }
            });
        } catch (error) {
            lookupErrorMessage.textContent = error.message;
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-paper-plane"></i> Xem Ngay!';
        }
    }

    // --- Event Listeners ---
    lookupForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const customerName = customerNameInput.value.trim();
        if (customerName) startWrappedExperience(customerName);
        else lookupErrorMessage.textContent = "Vui lòng nhập tên của bạn.";
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
        if (backgroundMusic) {
            backgroundMusic.pause();
            backgroundMusic.currentTime = 0;
        }
    });

    if (musicToggleBtn && backgroundMusic && musicIcon) {
        musicToggleBtn.addEventListener('click', () => {
            backgroundMusic.muted = !backgroundMusic.muted;
            if (backgroundMusic.muted) {
                musicIcon.classList.remove('fa-volume-up');
                musicIcon.classList.add('fa-volume-mute');
            } else {
                musicIcon.classList.remove('fa-volume-mute');
                musicIcon.classList.add('fa-volume-up');
                if (backgroundMusic.paused) backgroundMusic.play();
            }
        });
    }
});
